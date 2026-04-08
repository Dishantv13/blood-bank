import { Router } from 'express';
import { body } from 'express-validator';
import { authLimiter } from '../middleware/rateLimiter.js';
import { adminAuth } from '../middleware/auth.js';
import * as adminAuthController from '../controller/adminAuth.controller.js';

const router = Router();

router.route('/csrf-token').get(adminAuthController.getAdminCsrfToken);

router.route('/login').post(
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authLimiter,
  adminAuthController.loginAdmin
);

router.route('/refresh').post(adminAuthController.refreshAdminSession);
router.route('/logout').post(adminAuthController.logoutAdmin);
router.route('/session').get(adminAuth, adminAuthController.getAdminSession);

export default router;
