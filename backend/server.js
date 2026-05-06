import "./config/env.js";
import app from "./app.js";
import mongoose from "mongoose";
import { validateSecurityConfig } from "./config/security.js";
import { createServer } from "http";
import { initSocket } from "./utils/socket.js";
import { closeRedisClient, getRedisClient } from "./config/redis.js";

// DATABASE CONNECTION
try {
  validateSecurityConfig();
} catch (error) {
  console.error("❌ CRITICAL SECURITY CONFIG ERROR:", error.message);
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in environment variables!");
  process.exit(1);
}

console.log("🔌 Attempting to connect to infrastructure...");

// Initialize core services on startup
const initServices = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 50,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000,
    });
    console.log("✅ MongoDB Atlas: Connected successfully");
    console.log("📊 Database: rtbms");

    // 2. Connect to Redis
    await getRedisClient();

    if (process.env.SERVERLESS !== "true") {
      const httpServer = createServer(app);

      await initSocket(httpServer);

      // 4. Initialize Background Workers (BullMQ)
      if (process.env.DASHBOARD_MODE !== "true") {
        await import("./workers/certificateWorker.js");
        await import("./workers/aadhaarVerificationWorker.js");
        console.log("👷 Background Workers: Initialized");
      }

      const PORT = process.env.PORT || 5000;
      httpServer.listen(PORT, () => {
        console.log(`\n🚀 RaktSarthi Server Status:`);
        console.log(`📍 Port: ${PORT}`);
        console.log(`🏗️  Mode: ${process.env.NODE_ENV || "development"}`);
        console.log(`✨ System: Real-time Pub/Sub Scalability Enabled`);
        console.log(`✅ Build Success: Ready to accept requests\n`);
      });
    } else {
      console.log("🏥 RaktSarthi Backend is ready (Serverless Mode)!");
    }
  } catch (err) {
    console.error("❌ Infrastructure connection critical error:", err.message);
    process.exit(1);
  }
};

initServices();

// Handle MongoDB connection events
mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB runtime error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB status: Disconnected");
});

// GRACEFUL SHUTDOWN
const handleShutdown = async (signal) => {
  console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
  try {
    await mongoose.connection.close();
    console.log("📁 MongoDB connection closed.");

    await closeRedisClient();
    console.log("💾 Redis connection closed.");

    console.log("👋 App termination successful.");
    process.exit(0);
  } catch (error) {
    console.error("⚠️ Error during graceful shutdown:", error.message);
    process.exit(1);
  }
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// Export app for serverless runtimes
export default app;
