
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    main: { type: String, required: true, trim: true },
    sub: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

categorySchema.index({ main: 1, sub: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);
