import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import serverRoutes from "./routes/serverRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import dmRoutes from "./routes/dmRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import userRoutes from "./routes/userRoutes.js";

export function createApp() {
  const app = express();
  const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...env.clientUrls,
  ]);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "8mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, now: Date.now() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/friends", friendRoutes);
  app.use("/api/servers", serverRoutes);
  app.use("/api", messageRoutes);
  app.use("/api/dms", dmRoutes);
  app.use("/api/uploads", uploadRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
