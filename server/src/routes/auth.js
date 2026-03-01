import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getAdminUser } from "../services/admin.js";
import { requireAuth } from "../middleware/auth.js";
import { revokeToken } from "../services/tokenStore.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const admin = await getAdminUser();
    if (!admin || admin.username !== username) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const expiresIn = process.env.TOKEN_EXPIRES_IN || "1d";
    const token = jwt.sign(
      { sub: admin._id.toString(), username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn }
    );
    return res.json({ token, expiresIn });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", requireAuth, (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token && req.admin?.exp) {
    revokeToken(token, req.admin.exp * 1000);
  }
  res.json({ message: "Logged out" });
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const admin = await getAdminUser();
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }
    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }
    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();
    return res.json({ message: "Password updated" });
  } catch (error) {
    return next(error);
  }
});

export default router;
