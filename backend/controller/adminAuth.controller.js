import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as adminAuthService from '../services/adminAuthService.js';

const ensureValid = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
};

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
  const result = await adminAuthService.getSessionAdmin();
  successResponse(res, result, 200, 'Admin session fetched successfully');
});

export const getAdminCsrfToken = asyncHandler(async (_req, res) => {
  const result = adminAuthService.issueAdminCsrfToken(res);
  successResponse(res, result, 200, 'Admin CSRF token generated');
});

