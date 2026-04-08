import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as authService from '../services/authService.js';
import { ensureValid } from '../middleware/validateRequest.js';

export const register = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const result = await authService.registerAndCreateSession(req, res);
  successResponse(res, result, 201, 'User registered successfully');
});

export const login = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const result = await authService.loginAndCreateSession(req, res);
  successResponse(res, result, 200, 'Login successful');
});

export const googleLogin = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const result = await authService.googleLoginAndCreateSession(req, res);
  successResponse(res, result, 200, 'Google login successful');
});

export const refreshSession = asyncHandler(async (req, res) => {
  const result = await authService.refreshUserSession(req, res);
  successResponse(res, result, 200, 'Session refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  const result = await authService.logoutUserSession(req, res);
  successResponse(res, result, 200, 'Logged out successfully');
});

export const getSession = asyncHandler(async (req, res) => {
  const result = await authService.getUserSessionWithExpiry(req, req.user.userId || req.user.id);
  successResponse(res, result, 200, 'Session fetched successfully');
});

export const getCsrfToken = asyncHandler(async (_req, res) => {
  const result = authService.issueUserCsrfToken(res);
  successResponse(res, result, 200, 'CSRF token generated');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const { email } = req.body;
  await authService.requestPasswordReset(email);
  successResponse(
    res,
    { success: true },
    200,
    'If an account exists with this email, you will receive a password reset link shortly'
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  successResponse(res, { success: true }, 200, 'Password reset successful. You can now login with your new password');
});

export const verifyResetToken = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const { token } = req.body;
  const result = await authService.verifyResetToken(token);
  successResponse(res, result, 200, 'Token is valid');
});

export const changePassword = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId || req.user.id;
  await authService.changePassword(userId, currentPassword, newPassword);
  successResponse(res, { success: true }, 200, 'Password changed successfully');
});


