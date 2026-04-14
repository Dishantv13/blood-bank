import { Router } from "express";
import authRoutes from "./auth.route.js";
import adminAuthRoutes from "./adminAuth.route.js";
import userRoutes from "./users.route.js";
import bloodBankRoutes from "./bloodBank.route.js";
import bloodBankPortalRoutes from "./bloodBankPortal.route.js";
import bloodCampsRoutes from "./bloodCamps.route.js";
import donorHealthRoutes from "./donorHealth.route.js";
import requestsRoutes from "./requests.route.js";
import eventsRoutes from "./events.route.js";
import adminRoutes from "./admin.route.js";
import donationsRoutes from "./donations.route.js";
import uploadRoutes from "./upload.route.js";
import notificationRoutes from "./notification.route.js";
import searchRoutes from "./search.route.js";

const v1Router = Router();

v1Router.use("/auth", authRoutes);
v1Router.use("/admin-auth", adminAuthRoutes);
v1Router.use("/users", userRoutes);
v1Router.use("/bloodbanks", bloodBankRoutes);
v1Router.use("/blood-banks", bloodBankRoutes); 
v1Router.use("/bloodbank", bloodBankPortalRoutes);
v1Router.use("/blood-camps", bloodCampsRoutes);
v1Router.use("/donor-health", donorHealthRoutes);
v1Router.use("/requests", requestsRoutes);
v1Router.use("/events", eventsRoutes);
v1Router.use("/admin", adminRoutes);
v1Router.use("/donations", donationsRoutes);
v1Router.use("/upload", uploadRoutes);
v1Router.use("/notifications", notificationRoutes);
v1Router.use("/search", searchRoutes);

export default v1Router;
