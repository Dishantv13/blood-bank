import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiError.js';

export const ensureValid = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ApiError(400, 'Validation failed', errors.array());
  }
  return true;
};
