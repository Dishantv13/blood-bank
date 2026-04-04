import mongoose from 'mongoose';
import { ApiError } from './apiError.js';

export const ensureValidObjectId = (value, fieldName = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
};

export const toObjectId = (value, fieldName = 'id') => {
  ensureValidObjectId(value, fieldName);
  return new mongoose.Types.ObjectId(value);
};
