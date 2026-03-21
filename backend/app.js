import express, { json, urlencoded } from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import mongoose from "mongoose";
import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { globalApiLimiter } from "./middleware/rateLimiter.js";

// ==================== ROUTE IMPORTS ====================
// IMPORT ROUTES FILE

import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/users.route.js";
import bloodBankRoutes from "./routes/bloodBank.route.js";
import bloodBankPortalRoutes from "./routes/bloodBankPortal.route.js";
import bloodCampsRoutes from "./routes/bloodCamps.route.js";
import donorHealthRoutes from "./routes/donorHealth.route.js";
import requestsRoutes from "./routes/requests.route.js";
import eventsRoutes from "./routes/events.route.js";
import adminRoutes from "./routes/admin.route.js";
import donationsRoutes from "./routes/donations.route.js";

const app = express();
app.set("trust proxy", 1);

// ==================== CORS CONFIGURATION ====================
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
].filter(Boolean).map(url => url.replace(/\/$/, "")); // Remove trailing slashes

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Clean the incoming origin to match our list
    const cleanOrigin = origin.replace(/\/$/, "");

    if (allowedOrigins.includes(cleanOrigin) || process.env.NODE_ENV === 'development') {
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
    "Authorization"
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet()); // Set security headers
app.use(mongoSanitize()); // Prevent MongoDB injection
app.use(requestLogger(1000));

// ==================== RATE LIMITING ====================
app.use("/api/", globalApiLimiter);

// ==================== BODY PARSER ====================
app.use(json({ limit: "10mb" }));
app.use(urlencoded({ extended: true, limit: "10mb" }));

// ==================== HEALTH CHECK ====================
app.get("/", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "online",
    message: "RaktSarthi API is running successfully ✅",
    database: dbStatus,
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    uptime: process.uptime().toFixed(2) + " seconds",
    timestamp: new Date().toISOString()
  });
});

// ==================== ROUTES ====================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bloodbanks", bloodBankRoutes);
app.use("/api/blood-banks", bloodBankRoutes); // Alias for blood bank routes
app.use("/api/bloodbank", bloodBankPortalRoutes); // Blood Bank Portal Routes
app.use("/api/blood-camps", bloodCampsRoutes);
app.use("/api/donor-health", donorHealthRoutes);
app.use("/api/requests", requestsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/admin", adminRoutes); // Admin routes for Excel export
app.use("/api/donations", donationsRoutes);

// ==================== ERROR HANDLING MIDDLEWARE (must be AFTER routes) ====================
app.use(globalErrorHandler);

export default app;
