import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { z } from "zod";
import Icon from "../models/Icon.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const allowedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/gif",
  "image/webp"
]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    return cb(null, true);
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

const buildFileUrl = (req, filename) => {
  const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/uploads/${filename}`;
};

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
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Icon file is required" });
    }
    const payload = {
      name: req.body.name,
      mainCategory: req.body.mainCategory,
      subCategory: req.body.subCategory,
      tags: normalizeTags(req.body.tags)
    };
    const data = createSchema.parse(payload);
    const icon = await Icon.create({
      ...data,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: buildFileUrl(req, req.file.filename)
      }
    });
    return res.status(201).json(icon);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", requireAuth, upload.single("file"), async (req, res, next) => {
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
      const oldPath = icon.file?.path;
      if (oldPath) {
        await fs.unlink(oldPath).catch(() => null);
      }
      icon.file = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: buildFileUrl(req, req.file.filename)
      };
    }

    if (updates.name) icon.name = updates.name;
    if (updates.mainCategory) icon.mainCategory = updates.mainCategory;
    if (updates.subCategory) icon.subCategory = updates.subCategory;
    if (updates.tags) icon.tags = updates.tags;

    await icon.save();
    return res.json(icon);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const icon = await Icon.findById(req.params.id);
    if (!icon) return res.status(404).json({ error: "Icon not found" });
    const filePath = icon.file?.path;
    await icon.deleteOne();
    if (filePath) {
      await fs.unlink(filePath).catch(() => null);
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
    return res.sendFile(icon.file.path);
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
      const html = `<img src="${icon.file.url}" alt="${icon.name}" width="32" height="32">`;
      return res.json({ snippet: html });
    }
    return res.download(icon.file.path, icon.file.originalName);
  } catch (error) {
    return next(error);
  }
});

export default router;
