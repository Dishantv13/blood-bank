import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { cacheResponse } from "../middleware/cache.js";
import * as userControllers from "../controller/users.controller.js";
import { upload } from '../middleware/multer.js';

const router = Router();

router.route("/profile").get(auth, userControllers.getProfile);

router.route("/profile").put(auth, userControllers.updateProfile);

router.route("/profile/photo").post(auth, upload.single('photo'), userControllers.updateProfilePhoto);

router.route("/donor-info").put(auth, userControllers.updateDonorInfo);
router.route("/verify-aadhaar").post(auth, upload.single('document'), userControllers.verifyAadhaar);

router.route("/donors").get(auth, cacheResponse(120), userControllers.getDonors);

router.route("/toggle-mode").put(auth, userControllers.toggleMode);

router.route("/dashboard/stats").get(auth, userControllers.getDashboardStats);

export default router;
