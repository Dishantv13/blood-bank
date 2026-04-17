import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as authService from '../services/authService.js';
import { ensureValid } from '../middleware/validateRequest.js';

export const register = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const result = await authService.initiateUserRegistration(req, req.body);
  successResponse(res, result, 200, 'OTP sent to your email');
});

export const verifyOtp = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const { verificationId, otp } = req.body;
  const result = await authService.verifyUserRegistrationOtp(req, res, verificationId, otp);
  successResponse(res, result, 201, 'Registration completed successfully');
});

export const resendOtp = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const { verificationId } = req.body;
  const result = await authService.resendUserRegistrationOtp(req, verificationId);
  successResponse(res, result, 200, 'New OTP sent to your email');
});

export const login = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const result = await authService.loginAndCreateSession(req, res);
  successResponse(res, result, 200, 'Login successful');
});

export const googleOAuthStart = asyncHandler(async (req, res) => {
  const result = await authService.getGoogleOAuthStartUrl(req, res);
  res.redirect(302, result.redirectUrl);
});

export const googleOAuthCallback = asyncHandler(async (req, res) => {
  const result = await authService.completeGoogleOAuthAndCreateSession(req, res);
  res.redirect(302, result.redirectUrl);
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

export const getCsrfToken = asyncHandler(async (req, res) => {
  const result = await authService.issueUserCsrfToken(req, res);
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


