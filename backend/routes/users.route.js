import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  updateDonorInfo,
  getDonors,
  toggleMode,
  getDashboardStats,
} from "../controller/users.controller.js";

const router = Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.route("/profile").get(auth, getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.route("/profile").put(auth, updateProfile);

// @route   PUT /api/users/donor-info
// @desc    Update donor health information
// @access  Private
router.route("/donor-info").put(auth, updateDonorInfo);

// @route   GET /api/users/donors
// @desc    Get available donors by blood group
// @access  Private
router.route("/donors").get(auth, getDonors);

// @route   PUT /api/users/toggle-mode
// @desc    Toggle between donor and patient mode
// @access  Private
router.route("/toggle-mode").put(auth, toggleMode);

// @route   GET /api/users/dashboard/stats
// @desc    Get dashboard statistics for charts
// @access  Private
router.route("/dashboard/stats").get(auth, getDashboardStats);

export default router;
