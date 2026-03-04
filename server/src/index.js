import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import iconRoutes from "./routes/icons.js";
import metaRoutes from "./routes/meta.js";
import { ensureAdminUser } from "./services/admin.js";

dotenv.config();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const mongoUri =
  process.env.MONGODB_URI_ONLINE ||
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/icon_library";
const jwtSecret = process.env.JWT_SECRET || "dev_secret_change_me";
const tokenExpiresIn = process.env.TOKEN_EXPIRES_IN || "10d";
if (!process.env.MONGODB_URI_ONLINE && !process.env.MONGODB_URI) {
  process.stderr.write("MONGODB_URI missing, using default local database\n");
}
if (!process.env.JWT_SECRET) {
  process.stderr.write("JWT_SECRET missing, using development default\n");
}
process.env.MONGODB_URI_ONLINE = mongoUri;
process.env.JWT_SECRET = jwtSecret;
process.env.TOKEN_EXPIRES_IN = tokenExpiresIn;

const rawOrigins = process.env.CLIENT_ORIGIN || "";
const allowedOrigins = rawOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length
      ? { origin: allowedOrigins, methods: ["GET", "POST", "PUT", "PATCH", "DELETE"] }
      : { origin: true }
  )
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
const sanitizeObject = (value) => {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => sanitizeObject(item));
    return;
  }
  Object.keys(value).forEach((key) => {
    if (key.includes("$") || key.includes(".")) {
      delete value[key];
      return;
    }
    sanitizeObject(value[key]);
  });
};

app.use((req, _res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", metaRoutes);
app.use("/api/icons", iconRoutes);

app.use((err, _req, res, _next) => {
  if (err?.name === "ZodError") {
    return res.status(400).json({ error: "Validation error", details: err.issues });
  }
  if (err?.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File size exceeds limit" });
    }
    return res.status(400).json({ error: err.message || "File upload error" });
  }
  const status = err.status || 500;
  const message = err.message || "Unexpected error";
  return res.status(status).json({ error: message });
});

const start = async () => {
  mongoose.connection.on("error", (error) => {
    process.stderr.write(`MongoDB connection error: ${error.message}\n`);
  });
  await mongoose.connect(mongoUri);
  await ensureAdminUser();
  app.listen(port, () => {
    process.stdout.write(`Server running on port ${port}\n`);
  });
};

start().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
