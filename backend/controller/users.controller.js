import { ensureValid } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import { clearCacheByPrefix } from "../middleware/cache.js";
import * as userService from "../services/userService.js";
import { ApiError } from "../utils/apiError.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import { cleanupTempFile, validateFileContent } from "../middleware/multer.js";

// Get user profile
export const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.getUserProfile(userId);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "User profile fetched successfully");
});

// Update user profile photo
export const updateProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Please select a photo to upload");
  }

  const validation = await validateFileContent(req.file);
  if (
    !validation.valid ||
    !String(validation.detectedType || "").startsWith("image/")
  ) {
    await cleanupTempFile(req.file.path);
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      validation.error || "Uploaded file must be a valid image",
    );
  }

  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.updateProfilePhoto(userId, req.file.path);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Profile photo updated successfully");
});

// Update user profile
export const updateProfile = asyncHandler(async (req, res) => {
  ensureValid(req);

  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.updateUserProfile(userId, req.body);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Profile updated successfully");
});

// Update donor information
export const updateDonorInfo = asyncHandler(async (req, res) => {
  ensureValid(req);

  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.updateDonorInfo(userId, req.body);
  await clearCacheByPrefix("/api/v1/users/donors");
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Donor information updated successfully");
});

// Get available donors by blood group
export const getDonors = asyncHandler(async (req, res) => {
  const result = await userService.getAvailableDonors(req);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Donors fetched successfully");
});

// Toggle between donor and patient mode
export const toggleMode = asyncHandler(async (req, res) => {
  ensureValid(req);

  const userId = req.user.userId || req.user._id || req.user.id;
  const { mode } = req.body;
  const result = await userService.toggleMode(userId, mode);
  await clearCacheByPrefix("/api/v1/users/donors");
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "User mode toggled successfully");
});

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.getDashboardStats(userId);
  successResponse(
    res,
    result,
    HTTPS_CODE.OK_SUCCESS,
    "Dashboard statistics fetched successfully",
  );
});

// Verify Aadhaar identity
export const verifyAadhaar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Please upload an Aadhaar document to verify");
  }

  const validation = await validateFileContent(req.file);
  if (!validation.valid) {
    await cleanupTempFile(req.file.path);
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, validation.error || "Uploaded document is invalid");
  }

  if (validation.detectedType !== "application/pdf") {
    await cleanupTempFile(req.file.path);
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Only PDF documents (e-Aadhaar) are supported for verification.");
  }

  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.initiateAadhaarVerification(
    userId,
    req.file.path,
    req,
  );
  successResponse(
    res,
    result,
    HTTPS_CODE.ACCEPTED,
    "Identity verification queued successfully",
  );
});

export const getAadhaarVerificationStatus = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await userService.getAadhaarVerificationStatus(userId);
  successResponse(
    res,
    result,
    HTTPS_CODE.OK_SUCCESS,
    "Identity verification status fetched successfully",
  );
});
