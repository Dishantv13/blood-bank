import { ensureValid } from '../middleware/validateRequest.js';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import { clearCacheByPrefix } from '../middleware/cache.js';
import * as userService from '../services/userService.js';
import { ApiError } from '../utils/apiError.js';

// Get user profile
export const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.getUserProfile(userId);
  successResponse(res, result, 200, 'User profile fetched successfully');
});

// Update user profile photo
export const updateProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please select a photo to upload');
  }
  
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.updateProfilePhoto(userId, req.file.path);
  successResponse(res, result, 200, 'Profile photo updated successfully');
});

// Update user profile
export const updateProfile = asyncHandler(async (req, res) => {
  ensureValid(req);
  
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.updateUserProfile(userId, req.body);
  successResponse(res, result, 200, 'Profile updated successfully');
});

// Update donor information
export const updateDonorInfo = asyncHandler(async (req, res) => {
  ensureValid(req);
  
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.updateDonorInfo(userId, req.body);
  clearCacheByPrefix('/api/v1/users/donors');
  successResponse(res, result, 200, 'Donor information saved successfully');
});

// Get available donors by blood group
export const getDonors = asyncHandler(async (req, res) => {
  const result = await userService.getAvailableDonors(req.query);
  successResponse(res, result, 200, 'Donors fetched successfully');
});

// Toggle between donor and patient mode
export const toggleMode = asyncHandler(async (req, res) => {
  ensureValid(req);
  
  const userId = req.user.userId || req.user._id || req.user.id;
  const { mode } = req.body;
  const result = await userService.toggleMode(userId, mode);
  clearCacheByPrefix('/api/v1/users/donors');
  successResponse(res, result, 200, `Switched to ${mode} mode successfully`);
});

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.getDashboardStats(userId);
  successResponse(res, result, 200, 'Dashboard statistics fetched successfully');
});

// Verify Aadhaar identity
export const verifyAadhaar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Please upload an Aadhaar document to verify');
  }

  const result = await userService.verifyAadhaarDocument(req.file.path);
  successResponse(res, result, 200, 'Identity verified successfully');
});
