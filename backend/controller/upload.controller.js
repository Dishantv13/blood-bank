import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import * as fileUploadService from "../services/fileUploadService.js";
import { ApiError } from "../utils/apiError.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import { cleanupTempFile, validateFileContent } from "../middleware/multer.js";

export const uploadFile = asyncHandler(async (req, res) => {
  const localFilePath = req.file?.path;

  if (!localFilePath) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Please select a file to upload");
  }

  try {
    const validation = await validateFileContent(req.file);
    if (!validation.valid) {
      throw new ApiError(HTTPS_CODE.BAD_REQUEST, `File validation failed: ${validation.error}`);
    }

    const result = await fileUploadService.handleSingleUpload(localFilePath);
    successResponse(res, result, HTTPS_CODE.CREATED, "File uploaded successfully");
  } finally {
    await cleanupTempFile(localFilePath);
  }
});

export const uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Please select files to upload");
  }

  try {
    for (const file of req.files) {
      const validation = await validateFileContent(file);
      if (!validation.valid) {
        throw new ApiError(
          HTTPS_CODE.BAD_REQUEST,
          `File validation failed for ${file.originalname}: ${validation.error}`,
        );
      }
    }

    const result = await fileUploadService.handleMultipleUploads(req.files);
    successResponse(
      res,
      result,
      HTTPS_CODE.CREATED,
      `${result.count} files uploaded successfully`,
    );
  } finally {
    await Promise.all(req.files.map((file) => cleanupTempFile(file.path)));
  }
});
