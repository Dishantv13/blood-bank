import { Router } from 'express';
import { body } from 'express-validator';
import { auth } from '../middleware/auth.js';
import {
    register,
    login,
    googleLogin,
    forgotPassword,
    resetPassword,
    verifyResetToken,
    changePassword
}from '../controller/auth.controller.js';

const router = Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.route('/register').post([
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group')
], register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.route('/login').post([
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], login);

// @route   POST /api/auth/google
// @desc    Google OAuth login
// @access  Public
router.route('/google').post(googleLogin);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email to user
// @access  Public
router.route('/forgot-password').post([
  body('email').isEmail().withMessage('Please enter a valid email')
], forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset user password with token
// @access  Public
router.route('/reset-password').post([
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], resetPassword);

// @route   POST /api/auth/verify-reset-token
// @desc    Verify if reset token is valid
// @access  Public
router.route('/verify-reset-token').post([
  body('token').notEmpty().withMessage('Reset token is required')
], verifyResetToken);

// @route   POST /api/auth/change-password
// @desc    Change password for authenticated user
// @access  Private
router.route('/change-password').post(auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], changePassword);

export default router;
