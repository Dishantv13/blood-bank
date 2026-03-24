import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as adminAuthService from '../services/adminAuthService.js';

export const loginAdmin = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const result = await adminAuthService.loginAdmin(email, password);
  successResponse(res, result, 200, 'Admin login successful');
});
