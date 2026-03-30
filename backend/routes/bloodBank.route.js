import { Router } from 'express';
import { auth, bloodBankAuth } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  register,
  login,
  refreshSession,
  logout,
  getSession,
  getCsrfToken,
  getAllBloodBanks,
  getBloodBankById,
  createBloodBank,
  updateBloodBankInventory,
  forgotPassword,
  resetPassword,
  verifyResetToken
} from '../controller/bloodBank.controller.js';
import { upload } from '../middleware/multer.js';

const router = Router();

router.route('/csrf-token').get(getCsrfToken);

router.route('/register').post(authLimiter, upload.single('logo'), register);
router.route('/login').post(authLimiter, login);
router.route('/refresh').post(refreshSession);
router.route('/logout').post(logout);
router.route('/session').get(bloodBankAuth, getSession);

router.route('/').get(cacheResponse(120), getAllBloodBanks);
router.route('/:id').get(cacheResponse(120), getBloodBankById);

router.route('/').post(auth, createBloodBank);
router.route('/:id/inventory').put(auth, updateBloodBankInventory);

router.route('/forgot-password').post(authLimiter, forgotPassword);
router.route('/reset-password').post(resetPassword);
router.route('/verify-reset-token').post(verifyResetToken);

export default router;
