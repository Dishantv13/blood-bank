import { Router } from "express";
import { auth, bloodBankAuth } from "../middleware/auth.js";
import { cacheResponse } from "../middleware/cache.js";
import {
  authLimiter,
  bloodBankOtpInitiateLimiter,
  bloodBankOtpVerifyLimiter,
  bloodBankOtpResendLimiter,
} from "../middleware/rateLimiter.js";
import * as bloodBankController from "../controller/bloodBank.controller.js";
import * as authValidation from "../validations/auth.validation.js";
import { upload } from "../middleware/multer.js";

const router = Router();

router.route("/csrf-token").get(bloodBankController.getCsrfToken);

router
  .route("/register/initiate")
  .post(
    authLimiter,
    bloodBankOtpInitiateLimiter,
    upload.single("logo"),
    bloodBankController.initiateRegistration,
  );
router
  .route("/register/verify-otp")
  .post(
    authLimiter,
    bloodBankOtpVerifyLimiter,
    bloodBankController.verifyRegistrationOtp,
  );
router
  .route("/register/resend-otp")
  .post(
    authLimiter,
    bloodBankOtpResendLimiter,
    bloodBankController.resendRegistrationOtp,
  );
router.route("/login").post(authLimiter, bloodBankController.login);
router.route("/refresh").post(bloodBankController.refreshSession);
router.route("/logout").post(bloodBankController.logout);
router.route("/session").get(bloodBankAuth, bloodBankController.getSession);

router.route("/").get(cacheResponse(120), bloodBankController.getAllBloodBanks);

router
  .route("/:id")
  .get(cacheResponse(120), bloodBankController.getBloodBankById);

router.route("/").post(auth, bloodBankController.createBloodBank);
router
  .route("/:id/inventory")
  .put(auth, bloodBankController.updateBloodBankInventory);

router
  .route("/forgot-password")
  .post(
    authValidation.forgotPasswordValidation,
    authLimiter,
    bloodBankController.forgotPassword,
  );
router
  .route("/reset-password")
  .post(
    authValidation.resetPasswordValidation,
    authLimiter,
    bloodBankController.resetPassword,
  );
router
  .route("/verify-reset-token")
  .post(
    authValidation.verifyResetTokenValidation,
    bloodBankController.verifyResetToken,
  );

export default router;
