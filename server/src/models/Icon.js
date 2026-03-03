import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    filename: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    path: { type: String },
    url: { type: String, required: true },
    publicId: { type: String },
    format: { type: String },
    bytes: { type: Number },
    width: { type: Number },
    height: { type: Number },
    resourceType: { type: String },
    storage: { type: String, default: "cloudinary" }
  },
  { _id: false }
);

const iconSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mainCategory: { type: String, required: true, trim: true },
    subCategory: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    file: { type: fileSchema, required: true }
  },
  { timestamps: true }
);

iconSchema.index({ name: "text", mainCategory: "text", subCategory: "text", tags: "text" });

export default mongoose.model("Icon", iconSchema);
