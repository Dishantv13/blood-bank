import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  updateDonorInfo,
  getDonors,
  toggleMode,
  getDashboardStats,
} from "../controller/users.controller.js";
import { upload } from '../middleware/multer.js';

const router = Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.route("/profile").get(auth, getProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.route("/profile").put(auth, updateProfile);

// @route   POST /api/users/profile/photo
// @desc    Update user profile photo
// @access  Private
router.route("/profile/photo").post(auth, upload.single('photo'), updateProfilePhoto);

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
