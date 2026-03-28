import { Router } from 'express';
import { body } from 'express-validator';
import { authLimiter } from '../middleware/rateLimiter.js';
import { adminAuth } from '../middleware/auth.js';
import {
  loginAdmin,
  refreshAdminSession,
  logoutAdmin,
  getAdminSession,
  getAdminCsrfToken,
} from '../controller/adminAuth.controller.js';

const router = Router();

router.route('/csrf-token').get(getAdminCsrfToken);

router.route('/login').post(
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authLimiter,
  loginAdmin
);

router.route('/refresh').post(refreshAdminSession);
router.route('/logout').post(logoutAdmin);
router.route('/session').get(adminAuth, getAdminSession);

export default router;
