import express from "express";
import multer from "multer";
import { z } from "zod";
import { Readable } from "stream";
import { v2 as cloudinary } from "cloudinary";
import Icon from "../models/Icon.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const MAX_FILE_BYTES = 50 * 1024 * 1024;

const logEvent = (event, meta = {}) => {
  const payload = { event, ...meta, timestamp: new Date().toISOString() };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
};

const logError = (event, error, meta = {}) => {
  const payload = {
    event,
    message: error?.message || String(error),
    stack: error?.stack,
    ...meta,
    timestamp: new Date().toISOString()
  };
  process.stderr.write(`${JSON.stringify(payload)}\n`);
};

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
};

cloudinary.config(cloudinaryConfig);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      return cb(null, true);
    }
    const error = new Error("Unsupported file type");
    error.status = 415;
    return cb(error);
  }
});

const createSchema = z.object({
  name: z.string().min(1),
  mainCategory: z.string().min(1),
  subCategory: z.string().min(1),
  tags: z.array(z.string()).optional()
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  mainCategory: z.string().min(1).optional(),
  subCategory: z.string().min(1).optional(),
  tags: z.array(z.string()).optional()
});

const cloudinaryResponseSchema = z.object({
  secure_url: z.string().optional(),
  url: z.string().optional(),
  public_id: z.string(),
  bytes: z.number().optional(),
  format: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  resource_type: z.string().optional()
});

const normalizeTags = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validateMemoryFile = (file) => {
  if (!file) {
    const error = new Error("Icon file is required");
    error.status = 400;
    throw error;
  }
  if (!file.buffer || file.buffer.length === 0) {
    const error = new Error("Uploaded file is empty");
    error.status = 400;
    throw error;
  }
  if (file.size > MAX_FILE_BYTES) {
    const error = new Error("File size exceeds limit");
    error.status = 413;
    throw error;
  }
  return file;
};

const clearMemoryFile = (file) => {
  if (file?.buffer) {
    file.buffer = Buffer.alloc(0);
  }
};

const validateCloudinaryUpload = (result) => {
  const parsed = cloudinaryResponseSchema.parse(result);
  const url = parsed.secure_url || parsed.url;
  if (!url) {
    const error = new Error("Cloudinary upload did not return a URL");
    error.status = 502;
    throw error;
  }
  return { ...parsed, url };
};

const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "icon-library", resource_type: "auto" },
      (error, result) => {
        if (error) {
          logError("upload_stream_error", error, {
            filename: file.originalname,
            size: file.size,
            mimeType: file.mimetype
          });
          return reject(error);
        }
        logEvent("upload_stream_success", {
          publicId: result?.public_id,
          bytes: result?.bytes,
          resourceType: result?.resource_type
        });
        return resolve(result);
      }
    );
    logEvent("upload_stream_start", {
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype
    });
    Readable.from(file.buffer).pipe(stream);
  });

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Number.parseInt(req.query.limit, 10) || 20);
    const search = req.query.search ? String(req.query.search).trim() : "";
    const mainCategory = req.query.mainCategory ? String(req.query.mainCategory).trim() : "";
    const subCategory = req.query.subCategory ? String(req.query.subCategory).trim() : "";
    const category = req.query.category ? String(req.query.category).trim() : "";
    const tagsQuery = req.query.tags ? String(req.query.tags).trim() : "";

    const filter = {};
    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { name: new RegExp(safeSearch, "i") },
        { mainCategory: new RegExp(safeSearch, "i") },
        { subCategory: new RegExp(safeSearch, "i") },
        { tags: new RegExp(safeSearch, "i") }
      ];
    }

    if (category) {
      const parts = category.split("-");
      if (parts.length === 2) {
        filter.mainCategory = new RegExp(`^${escapeRegex(parts[0])}$`, "i");
        filter.subCategory = new RegExp(`^${escapeRegex(parts[1])}$`, "i");
      } else {
        filter.mainCategory = new RegExp(`^${escapeRegex(category)}$`, "i");
      }
    }

    if (mainCategory) {
      filter.mainCategory = new RegExp(`^${escapeRegex(mainCategory)}$`, "i");
    }

    if (subCategory) {
      filter.subCategory = new RegExp(`^${escapeRegex(subCategory)}$`, "i");
    }

    if (tagsQuery) {
      const tags = normalizeTags(tagsQuery);
      if (tags.length) {
        filter.tags = { $in: tags };
      }
    }

    const total = await Icon.countDocuments(filter);
    const icons = await Icon.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      data: icons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const icon = await Icon.findById(req.params.id);
    if (!icon) return res.status(404).json({ error: "Icon not found" });
    return res.json(icon);
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireAuth, upload.single("file"), async (req, res, next) => {
  let uploadedFile;
  try {
    uploadedFile = validateMemoryFile(req.file);
    logEvent("upload_request_received", {
      filename: uploadedFile.originalname,
      size: uploadedFile.size,
      mimeType: uploadedFile.mimetype
    });
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
      return res.status(500).json({ error: "Cloudinary is not configured" });
    }
    const payload = {
      name: req.body.name,
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      tags: normalizeTags(req.body.tags)
    };
    const data = createSchema.parse(payload);
    const uploadResult = await uploadToCloudinary(uploadedFile);
    const cloudinaryData = validateCloudinaryUpload(uploadResult);
    logEvent("upload_cloudinary_verified", {
      publicId: cloudinaryData.public_id,
      url: cloudinaryData.url
    });
    const icon = await Icon.create({
      ...data,
      file: {
        filename: uploadedFile.originalname,
        originalName: uploadedFile.originalname,
        mimeType: uploadedFile.mimetype,
        size: cloudinaryData.bytes ?? uploadedFile.size,
        url: cloudinaryData.url,
        publicId: cloudinaryData.public_id,
        format: cloudinaryData.format,
        bytes: cloudinaryData.bytes,
        width: cloudinaryData.width,
        height: cloudinaryData.height,
        resourceType: cloudinaryData.resource_type,
        storage: "cloudinary"
      }
    });
    logEvent("icon_created", { id: icon._id?.toString(), publicId: cloudinaryData.public_id });
    return res.status(201).json(icon);
  } catch (error) {
    logError("icon_create_error", error);
    return next(error);
  } finally {
    clearMemoryFile(uploadedFile);
  }
});

router.put("/:id", requireAuth, upload.single("file"), async (req, res, next) => {
  let uploadedFile;
  try {
    const icon = await Icon.findById(req.params.id);
    if (!icon) return res.status(404).json({ error: "Icon not found" });

    const payload = {
      name: req.body.name,
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory
    };
    if (req.body.tags !== undefined) {
      payload.tags = normalizeTags(req.body.tags);
    }
    const updates = updateSchema.parse(payload);

    if (req.file) {
      uploadedFile = validateMemoryFile(req.file);
      logEvent("upload_request_received", {
        filename: uploadedFile.originalname,
        size: uploadedFile.size,
        mimeType: uploadedFile.mimetype,
        iconId: icon._id?.toString()
      });
      if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
        return res.status(500).json({ error: "Cloudinary is not configured" });
      }
      const uploadResult = await uploadToCloudinary(uploadedFile);
      const cloudinaryData = validateCloudinaryUpload(uploadResult);
      logEvent("upload_cloudinary_verified", {
        publicId: cloudinaryData.public_id,
        url: cloudinaryData.url,
        iconId: icon._id?.toString()
      });
      const previousPublicId = icon.file?.publicId;
      const previousResourceType = icon.file?.resourceType || "image";
      if (previousPublicId) {
        await cloudinary.uploader
          .destroy(previousPublicId, { resource_type: previousResourceType })
          .catch(() => null);
      }
      icon.file = {
        filename: uploadedFile.originalname,
        originalName: uploadedFile.originalname,
        mimeType: uploadedFile.mimetype,
        size: cloudinaryData.bytes ?? uploadedFile.size,
        url: cloudinaryData.url,
        publicId: cloudinaryData.public_id,
        format: cloudinaryData.format,
        bytes: cloudinaryData.bytes,
        width: cloudinaryData.width,
        height: cloudinaryData.height,
        resourceType: cloudinaryData.resource_type,
        storage: "cloudinary"
      };
    }

    if (updates.name) icon.name = updates.name;
    if (updates.mainCategory) icon.mainCategory = updates.mainCategory;
    if (updates.subCategory) icon.subCategory = updates.subCategory;
    if (updates.tags) icon.tags = updates.tags;

    await icon.save();
    if (uploadedFile) {
      logEvent("icon_updated", { id: icon._id?.toString(), publicId: icon.file?.publicId });
    }
    return res.json(icon);
  } catch (error) {
    logError("icon_update_error", error, { iconId: req.params.id });
    return next(error);
  } finally {
    clearMemoryFile(uploadedFile);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const icon = await Icon.findById(req.params.id);
    if (!icon) return res.status(404).json({ error: "Icon not found" });
    const publicId = icon.file?.publicId;
    const resourceType = icon.file?.resourceType || "image";
    await icon.deleteOne();
    if (
      publicId &&
      cloudinaryConfig.cloud_name &&
      cloudinaryConfig.api_key &&
      cloudinaryConfig.api_secret
    ) {
      await cloudinary.uploader
        .destroy(publicId, { resource_type: resourceType })
        .catch(() => null);
    }
    return res.json({ message: "Icon deleted" });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/preview", async (req, res, next) => {
  try {
    const icon = await Icon.findById(req.params.id);
    if (!icon) return res.status(404).json({ error: "Icon not found" });
    if (icon.file?.url) {
      return res.redirect(icon.file.url);
    }
    return res.status(404).json({ error: "Preview not available" });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/download", async (req, res, next) => {
  try {
    const icon = await Icon.findById(req.params.id);
    if (!icon) return res.status(404).json({ error: "Icon not found" });
    const type = req.query.type === "html" ? "html" : "file";
    if (type === "html") {
      const isVideo =
        icon.file?.resourceType === "video" ||
        icon.file?.mimeType?.startsWith("video/");
      const html = isVideo
        ? `<video src="${icon.file.url}" controls width="320"></video>`
        : `<img src="${icon.file.url}" alt="${icon.name}" width="32" height="32">`;
      return res.json({ snippet: html });
    }
    if (icon.file?.url) {
      return res.redirect(icon.file.url);
    }
    return res.status(404).json({ error: "Download not available" });
  } catch (error) {
    return next(error);
  }
});

export default router;
