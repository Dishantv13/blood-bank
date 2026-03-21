import { validationResult } from 'express-validator';
import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from '../utils/response.js';
import * as authService from '../services/authService.js';

/**
 * ============================================
 * CLEAN CONTROLLERS - Only handling req/res
 * All business logic moved to services
 * ============================================
 */

// Register a new user
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const result = await authService.registerUser(req.body);
  successResponse(res, result, 201, 'User registered successfully');
});

// Login user
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const result = await authService.loginUser(email, password);
  successResponse(res, result, 200, 'Login successful');
});

// Google OAuth login
const googleLogin = asyncHandler(async (req, res) => {
  const { email, name, googleId, photoURL } = req.body;
  const result = await authService.googleLogin(email, name, googleId, photoURL);
  successResponse(res, result, 200, 'Google login successful');
});

// Request password reset
const forgotPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;
  await authService.requestPasswordReset(email);
  successResponse(res, { success: true }, 200, 'If an account exists with this email, you will receive a password reset link shortly');
});

// Reset password with token
const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  successResponse(res, { success: true }, 200, 'Password reset successful. You can now login with your new password');
});

// Verify reset token
const verifyResetToken = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token } = req.body;
  const result = await authService.verifyResetToken(token);
  successResponse(res, result, 200, 'Token is valid');
});

// Change password for authenticated user
const changePassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId || req.user.id;
  
  await authService.changePassword(userId, currentPassword, newPassword);
  successResponse(res, { success: true }, 200, 'Password changed successfully');
});

export {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  changePassword
};