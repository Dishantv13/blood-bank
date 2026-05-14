import mongoose from "mongoose";
import { ApiError } from "./apiError.js";

export const ensureValidObjectId = (value, fieldName = "id") => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `Invalid ${fieldName}`);
  }
};

export const toObjectId = (value, fieldName = "id") => {
  ensureValidObjectId(value, fieldName);
  return new mongoose.Types.ObjectId(value);
};
export const escapeRegex = (raw, maxLen = 100) =>
  String(raw || "")
    .substring(0, maxLen)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const buildSafeSearchFilter = (rawSearch, fields) => {
  if (!rawSearch || typeof rawSearch !== "string" || !rawSearch.trim())
    return null;
  const escaped = escapeRegex(rawSearch);
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    })),
  };
};
