import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { cacheResponse } from "../middleware/cache.js";
import * as userControllers from "../controller/users.controller.js";
import { upload } from "../middleware/multer.js";
import * as userValidation from "../validations/user.validation.js";

const router = Router();

router.route("/profile").get(auth, userControllers.getProfile);

router
  .route("/profile")
  .put(
    auth,
    userValidation.updateProfileValidation,
    userControllers.updateProfile,
  );

router
  .route("/profile/photo")
  .post(auth, upload.single("photo"), userControllers.updateProfilePhoto);

router
  .route("/donor-info")
  .put(
    auth,
    userValidation.updateDonorInfoValidation,
    userControllers.updateDonorInfo,
  );
router
  .route("/verify-aadhaar")
  .post(auth, upload.single("document"), userControllers.verifyAadhaar);
router
  .route("/verify-aadhaar/status")
  .get(auth, userControllers.getAadhaarVerificationStatus);

router
  .route("/donors")
  .get(auth, cacheResponse(120), userControllers.getDonors);

router
  .route("/toggle-mode")
  .put(auth, userValidation.toggleModeValidation, userControllers.toggleMode);

router.route("/dashboard/stats").get(auth, userControllers.getDashboardStats);

export default router;
