import { Router } from 'express';
import { body } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  register,
  login,
  googleLogin,
  refreshSession,
  logout,
  getSession,
  getCsrfToken,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  changePassword
} from '../controller/auth.controller.js';

const router = Router();

router.route('/csrf-token').get(getCsrfToken);

router.route('/register').post([
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group')
], authLimiter, register);

router.route('/login').post([
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], authLimiter, login);

router.route('/google').post(authLimiter, googleLogin);

router.route('/refresh').post(refreshSession);
router.route('/logout').post(logout);
router.route('/session').get(auth, getSession);

router.route('/forgot-password').post([
  body('email').isEmail().withMessage('Please enter a valid email')
], authLimiter, forgotPassword);

router.route('/reset-password').post([
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], resetPassword);

router.route('/verify-reset-token').post([
  body('token').notEmpty().withMessage('Reset token is required')
], verifyResetToken);

router.route('/change-password').post(auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], changePassword);

export default router;
