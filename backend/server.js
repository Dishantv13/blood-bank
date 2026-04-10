import "./config/env.js";
import app from "./app.js";
import mongoose from "mongoose";
import { validateSecurityConfig } from "./config/security.js";
import { closeRedisClient } from "./config/redis.js";

// ==================== DATABASE CONNECTION ====================
try {
  validateSecurityConfig();
} catch (error) {
  console.error(` ⛔CRITICAL SECURITY CONFIG ERROR: ${error.message}`);
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error(" ⛔CRITICAL ERROR: MONGODB_URI is not defined in environment variables!");
  process.exit(1);
}

console.log("🔌 Attempting to connect to MongoDB...");
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000, // Timeout after 10s
  })
  .then(() => {
    console.log("✅ MongoDB Atlas connected successfully");
    console.log("📊 Database: rtbms");
    console.log("🏥 RaktSarthi Backend is ready!");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected");
});

// ==================== GRACEFUL SHUTDOWN ====================
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  await closeRedisClient();
  console.log("MongoDB connection closed due to app termination");
  process.exit(0);
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
// Export app for serverless runtimes (Vercel, AWS Lambda, etc.)
export default app;

// Only start the HTTP server when running as a standalone Node.js process.
// Set SERVERLESS=true in your serverless platform environment to skip this.
if (process.env.SERVERLESS !== 'true') {
  app.listen(PORT, () => {
    console.log(`🏥 RaktSarthi Server Status:`);
    console.log(`📍 Port: ${PORT}`);
    console.log(`🏗️  Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Build Success: Ready to accept requests`);
  });
}
