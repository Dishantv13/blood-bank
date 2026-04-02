import express, { json, urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import compression from "compression";
import mongoose from "mongoose";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { globalApiLimiter } from "./middleware/rateLimiter.js";

// ==================== ROUTE IMPORTS ====================
// IMPORT ROUTES FILE

import authRoutes from "./routes/auth.route.js";
import adminAuthRoutes from "./routes/adminAuth.route.js";
import userRoutes from "./routes/users.route.js";
import bloodBankRoutes from "./routes/bloodBank.route.js";
import bloodBankPortalRoutes from "./routes/bloodBankPortal.route.js";
import bloodCampsRoutes from "./routes/bloodCamps.route.js";
import donorHealthRoutes from "./routes/donorHealth.route.js";
import requestsRoutes from "./routes/requests.route.js";
import eventsRoutes from "./routes/events.route.js";
import adminRoutes from "./routes/admin.route.js";
import donationsRoutes from "./routes/donations.route.js";
import uploadRoutes from "./routes/upload.route.js";

const app = express();
app.set("trust proxy", 1);

// ==================== CORS CONFIGURATION ====================
const envOrigins = String(process.env.FRONTEND_URLS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
].filter(Boolean).map((url) => url.replace(/\/$/, ""));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      if (process.env.ALLOW_NO_ORIGIN === "true") {
        return callback(null, true);
      }
      console.warn("CORS: Request blocked - missing Origin header");
      return callback(new Error("Origin header is required"));
    }

    const cleanOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.includes(cleanOrigin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token"
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet());
app.use(mongoSanitize());
app.use(compression());
app.use(requestLogger(1000));
app.use(cookieParser());

// ==================== RATE LIMITING ====================
app.use("/api/", globalApiLimiter);

// ==================== BODY PARSER ====================
app.use(json({ limit: "10mb" }));
app.use(urlencoded({ extended: true, limit: "10mb" }));

// ==================== HEALTH CHECK ====================
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "RaktSarthi API is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? "ok" : "degraded",
    timestamp: new Date().toISOString()
  });
});

// ==================== ROUTES ====================
app.use("/api/auth", authRoutes);
app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bloodbanks", bloodBankRoutes);
app.use("/api/blood-banks", bloodBankRoutes);
app.use("/api/bloodbank", bloodBankPortalRoutes);
app.use("/api/blood-camps", bloodCampsRoutes);
app.use("/api/donor-health", donorHealthRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/donations", donationsRoutes);
app.use("/api/upload", uploadRoutes);

// ==================== ERROR HANDLING MIDDLEWARE (must be AFTER routes) ====================
app.use(globalErrorHandler);

export default app;
