import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, default: "admin" },
    permissions: { type: [String], default: ["icons:manage", "auth:manage"] }
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);
