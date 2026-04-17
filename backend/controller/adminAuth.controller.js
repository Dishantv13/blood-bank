import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as adminAuthService from '../services/adminAuthService.js';
import { ensureValid } from '../middleware/validateRequest.js';

export const loginAdmin = asyncHandler(async (req, res) => {
  if (!ensureValid(req, res)) return;
  const result = await adminAuthService.loginAdminWithSession(req, res);
  successResponse(res, result, 200, 'Admin login successful');
});

export const refreshAdminSession = asyncHandler(async (req, res) => {
  const result = await adminAuthService.refreshAdminSession(req, res);
  successResponse(res, result, 200, 'Admin session refreshed');
});

export const logoutAdmin = asyncHandler(async (req, res) => {
  const result = await adminAuthService.logoutAdminSession(req, res);
  successResponse(res, result, 200, 'Admin logout successful');
});

export const getAdminSession = asyncHandler(async (_req, res) => {
  const result = await adminAuthService.getSessionAdminWithExpiry(_req);
  successResponse(res, result, 200, 'Admin session fetched successfully');
});

export const getAdminCsrfToken = asyncHandler(async (req, res) => {
  const result = await adminAuthService.issueAdminCsrfToken(req, res);
  successResponse(res, result, 200, 'Admin CSRF token generated');
});
