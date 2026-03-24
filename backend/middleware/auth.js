import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asynchandler.js";
import BloodBank from "../models/BloodBank.model.js";

// General user authentication middleware
const auth = asyncHandler((req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No authentication token, access denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token is not valid" });
  }
});

// Fixed super-admin authentication middleware
const adminAuth = asyncHandler((req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No authentication token, access denied" });
  }

  const adminSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (!adminSecret) {
    return res.status(500).json({ success: false, message: "Admin auth is not configured" });
  }

  try {
    const decoded = jwt.verify(token, adminSecret);

    if (decoded.type !== "admin" || decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized as admin" });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token is not valid" });
  }
});

// Middleware for blood bank authentication (lightweight — no DB lookup)
const bloodBankAuth = asyncHandler((req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No authentication token, access denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "bloodbank") {
      return res.status(403).json({ success: false, message: "Not authorized as blood bank" });
    }

    req.bloodBank = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token is not valid" });
  }
});

// Middleware to protect blood bank routes (with DB lookup for full bank data)
const protectBloodBank = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "bloodbank") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized as blood bank" });
    }

    req.bloodBank = await BloodBank.findById(decoded.bloodBankId).select("-password").lean();

    if (!req.bloodBank) {
      return res.status(404).json({ success: false, message: "Blood bank not found" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
});

export { auth, adminAuth, bloodBankAuth, protectBloodBank };
