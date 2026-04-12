import { Router } from 'express';
import { body } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controller/auth.controller.js';

const router = Router();

router.route('/csrf-token').get(authController.getCsrfToken);

router.route('/register').post([
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group')
], authLimiter, authController.register);

router.route('/verify-otp').post([
  body('verificationId').notEmpty().withMessage('Verification ID is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], authLimiter, authController.verifyOtp);

router.route('/resend-otp').post([
  body('verificationId').notEmpty().withMessage('Verification ID is required')
], authLimiter, authController.resendOtp);

router.route('/login').post([
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], authLimiter, authController.login);

router.route('/google/start').get(authLimiter, authController.googleOAuthStart);
router.route('/google/callback').get(authLimiter, authController.googleOAuthCallback);

router.route('/refresh').post(authController.refreshSession);
router.route('/logout').post(authController.logout);
router.route('/session').get(auth, authController.getSession);

router.route('/forgot-password').post([
  body('email').isEmail().withMessage('Please enter a valid email')
], passwordResetLimiter, authController.forgotPassword);

router.route('/reset-password').post([
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character (@$!%*?&)')
], passwordResetLimiter, authController.resetPassword);

router.route('/verify-reset-token').post([
  body('token').notEmpty().withMessage('Reset token is required')
], authController.verifyResetToken);

router.route('/change-password').post(auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character (@$!%*?&)')
], authController.changePassword);

export default router;
