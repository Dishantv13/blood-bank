import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import * as authService from "../services/authService.js";
import { ensureValid } from "../middleware/validateRequest.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";

export const register = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await authService.initiateUserRegistration(req, req.body);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "OTP sent to your email");
});

export const verifyOtp = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { verificationId, otp } = req.body;
  const result = await authService.verifyUserRegistrationOtp(
    req,
    res,
    verificationId,
    otp,
  );
  successResponse(res, result, HTTPS_CODE.CREATED, "Registration completed successfully");
});

export const resendOtp = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { verificationId } = req.body;
  const result = await authService.resendUserRegistrationOtp(
    req,
    verificationId,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "New OTP sent to your email");
});

export const login = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await authService.loginAndCreateSession(req, res);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Login successful");
});

export const googleOAuthStart = asyncHandler(async (req, res) => {
  const result = await authService.getGoogleOAuthStartUrl(req, res);
  res.redirect(HTTPS_CODE.FOUND, result.redirectUrl);
});

export const googleOAuthCallback = asyncHandler(async (req, res) => {
  const result = await authService.completeGoogleOAuthAndCreateSession(
    req,
    res,
  );
  res.redirect(HTTPS_CODE.FOUND, result.redirectUrl);
});

export const refreshSession = asyncHandler(async (req, res) => {
  const result = await authService.refreshUserSession(req, res);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Session refreshed");
});

export const logout = asyncHandler(async (req, res) => {
  const result = await authService.logoutUserSession(req, res);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Logged out successfully");
});

export const getSession = asyncHandler(async (req, res) => {
  const result = await authService.getUserSessionWithExpiry(
    req,
    req.user.userId || req.user.id,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Session fetched successfully");
});

export const getCsrfToken = asyncHandler(async (req, res) => {
  const result = await authService.issueUserCsrfToken(req, res);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "CSRF token generated");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { email } = req.body;
  await authService.requestPasswordReset(email);
  successResponse(
    res,
    { success: true },
    HTTPS_CODE.OK_SUCCESS,
    "Password reset link has been sent to your email",
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { token, password } = req.body || {};
  await authService.resetPassword(token, password);
  successResponse(
    res,
    { success: true },
    HTTPS_CODE.OK_SUCCESS,
    "Password reset successful. You can now login with your new password",
  );
});

export const verifyResetToken = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { token } = req.body || {};
  const result = await authService.verifyResetToken(token);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Token is valid");
});

export const changePassword = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId || req.user.id;
  await authService.changePassword(userId, currentPassword, newPassword);
  successResponse(res, { success: true }, HTTPS_CODE.OK_SUCCESS, "Password changed successfully");
});
