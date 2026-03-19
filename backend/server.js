import "./config/env.js";
import app from "./app.js";
import mongoose from "mongoose";

// ==================== DATABASE CONNECTION ====================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Atlas connected successfully");
    console.log("📊 Database: rtbms");
    console.log("🏥 RaktSarthi Backend is ready!");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
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
app.listen(PORT, () => {
  console.log(`🏥 RaktSarthi Server is running on port ${PORT}`);
});