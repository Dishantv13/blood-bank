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
import redisClient from "./utils/redisClient.js";

// ==================== ROUTE IMPORTS ====================
// IMPORT ROUTES FILE

import v1Router from "./routes/index.js";

const app = express();
app.set("trust proxy", 1);

const shouldCompress = (req, res) => {
  if (req.path.startsWith("/api/auth") || req.path.startsWith("/api/admin-auth") || req.path.startsWith("/api/upload")) {
    return false;
  }

  return compression.filter(req, res);
};

const sanitizeRequestPayload = (req, _res, next) => {
  const sanitizeOptions = {};

  if (req.body) {
    mongoSanitize.sanitize(req.body, sanitizeOptions);
  }

  if (req.params) {
    mongoSanitize.sanitize(req.params, sanitizeOptions);
  }

  if (req.headers) {
    mongoSanitize.sanitize(req.headers, sanitizeOptions);
  }

  if (req.query) {
    mongoSanitize.sanitize(req.query, sanitizeOptions);
  }

  next();
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
      return callback(null, true);
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
app.options("/{*any}", cors(corsOptions));

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
app.use(compression({ filter: shouldCompress }));
app.use(requestLogger(1000));
app.use(cookieParser());

// ==================== RATE LIMITING ====================
app.use("/api/", globalApiLimiter);

// ==================== BODY PARSER ===================
app.use(json({ limit: "1mb" }));
app.use(urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeRequestPayload);

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
// ==================== SYSTEM ROUTES ====================
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "RaktSarthi API is running",
    version: "v1.0.0",
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (unversioned for infrastructure monitoring)
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redisClient.isReady ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redisClient.isReady ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// ==================== VERSIONED API ROUTES ====================
app.use("/api/v1", v1Router);

// Legacy /api redirect to /api/v1
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/v1") || req.path === "/health") return next();

  const cleanPath = req.path.startsWith("/") ? req.path : `/${req.path}`;
  const queryPart = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const nextPath = `/api/v1${cleanPath}${queryPart}`;
  
  res.redirect(307, nextPath);
});

// ==================== ERROR HANDLING MIDDLEWARE (must be AFTER routes) ====================
app.use(globalErrorHandler);

export default app;
