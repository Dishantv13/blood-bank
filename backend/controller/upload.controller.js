import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import * as fileUploadService from '../services/fileUploadService.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Handle Single File Upload
 * WF: Multer (Local) -> Service (Cloudinary) -> Cleanup (Service-linked)
 */
export const uploadFile = asyncHandler(async (req, res) => {
  const localFilePath = req.file?.path;

  if (!localFilePath) {
    throw new ApiError(400, 'Please select a file to upload');
  }

  const result = await fileUploadService.handleSingleUpload(localFilePath);
  
  successResponse(res, result, 201, 'File uploaded successfully');
});

/**
 * Handle Multiple Files Upload
 */
export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'Please select files to upload');
  }

  const result = await fileUploadService.handleMultipleUploads(req.files);

  successResponse(res, result, 201, `${result.count} files uploaded successfully`);
});
