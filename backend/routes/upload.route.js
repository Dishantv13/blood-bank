import { Router } from "express";
import {
  uploadFile,
  uploadMultipleFiles,
} from "../controller/upload.controller.js";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/multer.js";

const router = Router();

router.route("/single").post(auth, upload.single("file"), uploadFile);

router
  .route("/multiple")
  .post(auth, upload.array("files", 10), uploadMultipleFiles);

export default router;
