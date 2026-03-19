import "./config/env.js";
import app from "./app.js";
import mongoose from "mongoose";

// ==================== DATABASE CONNECTION ====================
if (!process.env.MONGODB_URI) {
  console.error("⛔ CRITICAL ERROR: MONGODB_URI is not defined in environment variables!");
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
  console.log("MongoDB connection closed due to app termination");
  process.exit(0);
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
// Export for serverless
export default app;

app.listen(PORT, () => {
  console.log(`🏥 RaktSarthi Server Status:`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🏗️  Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Build Success: Ready to accept requests`);
});