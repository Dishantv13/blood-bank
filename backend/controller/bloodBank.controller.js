import { validationResult } from 'express-validator';
import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from '../utils/response.js';
import * as bloodBankService from '../services/bloodBankService.js';
import * as fileUploadService from '../services/fileUploadService.js';

/**
 * ============================================
 * CLEAN CONTROLLERS - Only handling req/res
 * All business logic moved to services
 * ============================================
 */

// Register a new blood bank
export const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Parse stringified objects if we're receiving FormData
  ['address', 'operatingHours', 'location', 'services', 'contactPerson', 'inventory'].forEach(field => {
    if (typeof req.body[field] === 'string') {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
  });

  // Check for uploaded logo
  if (req.file) {
    const uploadResult = await fileUploadService.handleSingleUpload(req.file.path, 'blood-bank/profiles');
    req.body.logo = uploadResult.url;
    req.body.profileImagePublicId = uploadResult.publicId; 
  }

  const result = await bloodBankService.registerBloodBank(req.body);
  successResponse(res, result, 201, 'Blood bank registered successfully');
});

// Login blood bank
export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const result = await bloodBankService.loginBloodBank(email, password);
  successResponse(res, result, 200, 'Login successful');
});

// Get all blood banks or nearby ones
export const getAllBloodBanks = asyncHandler(async (req, res) => {
  const result = await bloodBankService.getAllBloodBanks(req.query);
  successResponse(res, result, 200, 'Blood banks fetched successfully');
});

// Get blood bank by ID
export const getBloodBankById = asyncHandler(async (req, res) => {
  const result = await bloodBankService.getBloodBankById(req.params.id);
  successResponse(res, result, 200, 'Blood bank details fetched successfully');
});

// Get blood bank profile (authenticated)
export const getBloodBankProfile = asyncHandler(async (req, res) => {
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  const result = await bloodBankService.getBloodBankProfile(bloodBankId);
  successResponse(res, result, 200, 'Blood bank profile fetched successfully');
});

// Update blood bank profile
export const updateBloodBankProfile = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  const result = await bloodBankService.updateBloodBankProfile(bloodBankId, req.body);
  successResponse(res, result, 200, 'Blood bank profile updated successfully');
});

// Create a new blood bank (Admin only)
export const createBloodBank = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const result = await bloodBankService.createBloodBank(req.body);
  successResponse(res, result, 201, 'Blood bank created successfully');
});

// Update blood bank inventory
export const updateBloodBankInventory = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { bloodGroup, units } = req.body;
  const result = await bloodBankService.updateBloodBankInventory(req.params.id, bloodGroup, units);
  successResponse(res, result, 200, 'Inventory updated successfully');
});

// Request password reset
export const forgotPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;
  await bloodBankService.requestPasswordReset(email);
  successResponse(res, { success: true }, 200, 'If an account exists with this email, you will receive a password reset link shortly');
});

// Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;
  await bloodBankService.resetPassword(token, password);
  successResponse(res, { success: true }, 200, 'Password reset successful. You can now login with your new password');
});

// Verify reset token
export const verifyResetToken = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token } = req.body;
  const result = await bloodBankService.verifyResetToken(token);
  successResponse(res, result, 200, 'Token is valid');
});
