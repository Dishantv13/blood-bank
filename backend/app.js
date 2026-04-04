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

const shouldCompress = (req, res) => {
  if (req.path.startsWith("/api/auth") || req.path.startsWith("/api/admin-auth") || req.path.startsWith("/api/upload")) {
    return false;
  }

  return compression.filter(req, res);
};

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

// ==================== HTTPS ENFORCEMENT ====================
// Enforce HTTPS in production environment
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request is over HTTPS
    const isHttps = req.secure || 
                    req.headers['x-forwarded-proto'] === 'https' ||
                    req.headers['x-forwarded-ssl'] === 'on';
    
    if (!isHttps) {
      // Redirect to HTTPS
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ==================== SECURITY MIDDLEWARE ====================
// Disable X-Powered-By header to prevent information disclosure
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameGuard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Add Expect-CT for certificate transparency
  expectCt: {
    maxAge: 86400, // 24 hours
    enforce: true,
  },
  // Add Permissions-Policy to restrict browser features
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
  },
}));
app.use(mongoSanitize());
app.use(compression({ filter: shouldCompress }));
app.use(requestLogger(1000));
app.use(cookieParser());

// ==================== RATE LIMITING ====================
app.use("/api/", globalApiLimiter);

// ==================== BODY PARSER ====================
// Reduced from 10mb to 1mb to prevent DoS attacks via large payloads
app.use(json({ limit: "1mb" }));
app.use(urlencoded({ extended: true, limit: "1mb" }));

// ==================== REQUEST TIMEOUT PROTECTION ====================
// Prevent hanging connections before route handling starts.
app.use((req, res, next) => {
  res.setTimeout(20000, () => {
    if (res.headersSent) {
      return;
    }

    res.status(408).json({
      success: false,
      message: 'Request timeout - server did not receive a complete request in time'
    });
  });
  next();
});

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
