import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  authLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimiter.js";
import * as authController from "../controller/auth.controller.js";
import * as authValidation from "../validations/auth.validation.js";

const router = Router();

router.route("/csrf-token").get(authController.getCsrfToken);

router
  .route("/register")
  .post(
    authValidation.registerValidation,
    authLimiter,
    authController.register,
  );

router
  .route("/verify-otp")
  .post(
    authValidation.verifyOtpValidation,
    authLimiter,
    authController.verifyOtp,
  );

router
  .route("/resend-otp")
  .post(
    authValidation.resendOtpValidation,
    authLimiter,
    authController.resendOtp,
  );

router
  .route("/login")
  .post(authValidation.loginValidation, authLimiter, authController.login);

router.route("/google/start").get(authLimiter, authController.googleOAuthStart);
router
  .route("/google/callback")
  .get(authLimiter, authController.googleOAuthCallback);

router.route("/refresh").post(authController.refreshSession);

router.route("/logout").post(authController.logout);

router.route("/session").get(auth, authController.getSession);

router
  .route("/forgot-password")
  .post(
    authValidation.forgotPasswordValidation,
    passwordResetLimiter,
    authController.forgotPassword,
  );

router
  .route("/reset-password")
  .post(
    authValidation.resetPasswordValidation,
    passwordResetLimiter,
    authController.resetPassword,
  );

router
  .route("/verify-reset-token")
  .post(
    authValidation.verifyResetTokenValidation,
    authController.verifyResetToken,
  );

router
  .route("/change-password")
  .post(
    auth,
    authValidation.changePasswordValidation,
    authController.changePassword,
  );

export default router;
