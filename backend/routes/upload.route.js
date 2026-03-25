import { Router } from 'express';
import { uploadFile, uploadMultipleFiles } from '../controller/upload.controller.js';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/multer.js';

const router = Router();

// Routes for single file upload
// Workflow: POST multipart/form-data with "file" field
router.route('/single').post(auth, upload.single('file'), uploadFile);

// Routes for multiple files upload
// Workflow: POST multipart/form-data with "files" field
router.route('/multiple').post(auth, upload.array('files', 10), uploadMultipleFiles);

export default router;
