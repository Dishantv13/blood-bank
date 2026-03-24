import { Router } from 'express';
import { body } from 'express-validator';
import { authLimiter } from '../middleware/rateLimiter.js';
import { loginAdmin } from '../controller/adminAuth.controller.js';

const router = Router();

// @route   POST /api/admin-auth/login
// @desc    Login fixed super-admin
// @access  Public
router.route('/login').post(
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authLimiter,
  loginAdmin
);

export default router;
