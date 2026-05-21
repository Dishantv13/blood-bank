import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import { clearCacheByPrefix } from "../middleware/cache.js";
import * as bloodBankService from "../services/bloodBankService.js";
import { ensureValid } from "../middleware/validateRequest.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";

export const initiateRegistration = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result =
    await bloodBankService.initiateBloodBankRegistrationWithOtp(req);
  successResponse(
    res,
    result,
    HTTPS_CODE.OK_SUCCESS,
    "OTP sent to your email. Please verify to continue.",
  );
});

export const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { verificationId, otp } = req.body;
  const result = await bloodBankService.verifyBloodBankRegistrationOtp(
    verificationId,
    otp,
  );
  successResponse(
    res,
    result,
    HTTPS_CODE.CREATED,
    "Email verified and registration submitted for admin approval.",
  );
});

export const resendRegistrationOtp = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { verificationId } = req.body;
  const result =
    await bloodBankService.resendBloodBankRegistrationOtp(verificationId);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "A new OTP has been sent to your email.");
});

export const login = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankService.loginBloodBankWithSession(req, res);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Login successful");
});

export const refreshSession = asyncHandler(async (req, res) => {
  const result = await bloodBankService.refreshBloodBankSession(req, res);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Session refreshed");
});

export const logout = asyncHandler(async (req, res) => {
  const result = await bloodBankService.logoutBloodBankSession(req, res);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Logout successful");
});

export const getSession = asyncHandler(async (req, res) => {
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  const result = await bloodBankService.getSessionBloodBankWithExpiry(
    req,
    bloodBankId,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Session fetched successfully");
});

export const getCsrfToken = asyncHandler(async (req, res) => {
  const result = await bloodBankService.issueBloodBankCsrfToken(req, res);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "CSRF token generated");
});

export const getAllBloodBanks = asyncHandler(async (req, res) => {
  const result = await bloodBankService.getAllBloodBanks(req.query);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood banks fetched successfully");
});

export const getBloodBankById = asyncHandler(async (req, res) => {
  const result = await bloodBankService.getBloodBankById(req.params.id);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood bank details fetched successfully");
});

export const getBloodBankProfile = asyncHandler(async (req, res) => {
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  const result = await bloodBankService.getBloodBankProfile(bloodBankId);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood bank profile fetched successfully");
});

export const updateBloodBankProfile = asyncHandler(async (req, res) => {
  ensureValid(req);
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  const result = await bloodBankService.updateBloodBankProfile(
    bloodBankId,
    req.body,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood bank profile updated successfully");
});

export const updateBloodBankInventory = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { bloodGroup, units } = req.body;
  const result = await bloodBankService.updateBloodBankInventory(
    req.params.id,
    bloodGroup,
    units,
  );
  await clearCacheByPrefix("/api/v1/blood-banks");
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Inventory updated successfully");
});

export const forgotPassword = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { email } = req.body;
  await bloodBankService.requestPasswordReset(email);
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
  await bloodBankService.resetPassword(token, password);
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
  const result = await bloodBankService.verifyResetToken(token);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Token is valid");
});
