import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";

const ADMIN_USERNAME = "admin";

export const ensureAdminUser = async () => {
  const existing = await Admin.findOne({ username: ADMIN_USERNAME });
  if (existing) {
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || "admin123";
    const passwordMatches = await bcrypt.compare(initialPassword, existing.passwordHash);
    if (!passwordMatches) {
      existing.passwordHash = await bcrypt.hash(initialPassword, 12);
    }
    if (!existing.role || !existing.permissions?.length) {
      existing.role = existing.role || "admin";
      existing.permissions =
        existing.permissions?.length ? existing.permissions : ["icons:manage", "auth:manage"];
    }
    await existing.save();
    return;
  }
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(initialPassword, 12);
  await Admin.create({
    username: ADMIN_USERNAME,
    passwordHash,
    role: "admin",
    permissions: ["icons:manage", "auth:manage"]
  });
};

export const getAdminUser = async () => {
  return Admin.findOne({ username: ADMIN_USERNAME });
};
