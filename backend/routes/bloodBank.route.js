import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { cacheResponse } from '../middleware/cache.js';
import {
  register,
  login,
  getAllBloodBanks,
  getBloodBankById,
  createBloodBank,
  updateBloodBankInventory,
  forgotPassword,
  resetPassword,
  verifyResetToken
} from '../controller/bloodBank.controller.js';

const router = Router();

// ==================== BLOOD BANK REGISTRATION & AUTHENTICATION ====================

// @route   POST /api/blood-banks/register
// @desc    Register a new blood bank
// @access  Public
router.route('/register').post(register);

// @route   POST /api/blood-banks/login
// @desc    Authenticate blood bank & get token
// @access  Public
router.route('/login').post(login);

// ==================== PUBLIC BLOOD BANK INFORMATION ====================

// @route   GET /api/blood-banks
// @desc    Get all blood banks or nearby ones
// @access  Public
router.route('/').get(cacheResponse(120), getAllBloodBanks);

// @route   GET /api/blood-banks/:id
// @desc    Get blood bank by ID
// @access  Public
router.route('/:id').get(cacheResponse(120), getBloodBankById);

// @route   POST /api/blood-banks
// @desc    Create a new blood bank (Admin only)
// @access  Private
router.route('/').post(auth, createBloodBank);

// @route   PUT /api/blood-banks/:id/inventory
// @desc    Update blood bank inventory
// @access  Private
router.route('/:id/inventory').put(auth, updateBloodBankInventory);

// ==================== PASSWORD RESET FOR BLOOD BANKS ====================

// @route   POST /api/blood-banks/forgot-password
// @desc    Send password reset email to blood bank
// @access  Public
router.route('/forgot-password').post(forgotPassword);

// @route   POST /api/blood-banks/reset-password
// @desc    Reset blood bank password with token
// @access  Public
router.route('/reset-password').post(resetPassword);

// @route   POST /api/blood-banks/verify-reset-token
// @desc    Verify if reset token is valid for blood bank
// @access  Public
router.route('/verify-reset-token').post(verifyResetToken);

export default router;
