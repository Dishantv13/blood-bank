import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as userService from '../services/userService.js';
import { ApiError } from '../utils/apiError.js';

/**
 * ============================================
 * CLEAN CONTROLLERS - Only handling req/res
 * All business logic moved to services
 * ============================================
 */

// Get user profile
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.getUserProfile(userId);
  successResponse(res, result, 200, 'User profile fetched successfully');
});

// Update user profile photo
const updateProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please select a photo to upload');
  }
  
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.updateProfilePhoto(userId, req.file.path);
  successResponse(res, result, 200, 'Profile photo updated successfully');
});

// Update user profile
const updateProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.updateUserProfile(userId, req.body);
  successResponse(res, result, 200, 'Profile updated successfully');
});

// Update donor information
const updateDonorInfo = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.updateDonorInfo(userId, req.body);
  successResponse(res, result, 200, 'Donor information saved successfully');
});

// Get available donors by blood group
const getDonors = asyncHandler(async (req, res) => {
  const result = await userService.getAvailableDonors(req.query);
  successResponse(res, result, 200, 'Donors fetched successfully');
});

// Toggle between donor and patient mode
const toggleMode = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const userId = req.user.userId || req.user._id || req.user.id;
  const { mode } = req.body;
  const result = await userService.toggleMode(userId, mode);
  successResponse(res, result, 200, `Switched to ${mode} mode successfully`);
});

// Get dashboard statistics
const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.getDashboardStats(userId);
  successResponse(res, result, 200, 'Dashboard statistics fetched successfully');
});

export {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  updateDonorInfo,
  getDonors,
  toggleMode,
  getDashboardStats
}