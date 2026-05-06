import { body } from "express-validator";
import { BLOOD_GROUPS } from "./validation.constants.js";

export const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)",
    ),
  body("phone").trim().notEmpty().withMessage("Phone number is required"),
  body("bloodGroup").isIn(BLOOD_GROUPS).withMessage("Invalid blood group"),
];

export const verifyOtpValidation = [
  body("verificationId").notEmpty().withMessage("Verification ID is required"),
  body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
];

export const resendOtpValidation = [
  body("verificationId").notEmpty().withMessage("Verification ID is required"),
];

export const loginValidation = [
  body("email").isEmail().withMessage("Please enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Please enter a valid email"),
];

export const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)",
    ),
];

export const verifyResetTokenValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
];

export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)",
    ),
];
