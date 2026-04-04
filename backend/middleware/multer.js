import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';

// Ensure the temporary directory exists
const tempDir = './public/temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Allowed MIME types based on actual file magic bytes
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save to local temp directory
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// File filter to validate MIME type (preliminary check)
const mimeTypeFilter = (req, file, cb) => {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type! Only images and PDFs are allowed.'), false);
  }
};

// Validate actual file content using magic bytes
const validateFileContent = async (file) => {
  try {
    const buffer = await fsp.readFile(file.path);
    const fileType = await fileTypeFromBuffer(buffer);

    if (!fileType) {
      return { valid: false, error: 'Unable to determine file type' };
    }

    if (!ALLOWED_MIMETYPES.includes(fileType.mime)) {
      return { valid: false, error: `File type mismatch. Detected: ${fileType.mime}` };
    }

    return { valid: true, detectedType: fileType.mime };
  } catch (error) {
    return { valid: false, error: 'File validation failed' };
  }
};

// File filter to allow only images and PDFs
const fileFilter = mimeTypeFilter;

export const cleanupTempFile = async (filePath) => {
  if (!filePath) return;

  try {
    await fsp.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Temp file cleanup failed:', error.message);
    }
  }
};

/**
 * Multiple files upload middleware
 * Handles up to 10 files at a time
 * Validates MIME type and actual file content (magic bytes)
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files per upload
  }
});

export { validateFileContent };
export default upload;
