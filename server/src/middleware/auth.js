import jwt from "jsonwebtoken";
import { isTokenRevoked } from "../services/tokenStore.js";

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }
  if (isTokenRevoked(token)) {
    return res.status(401).json({ error: "Token revoked" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
