import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    url: { type: String, required: true }
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
