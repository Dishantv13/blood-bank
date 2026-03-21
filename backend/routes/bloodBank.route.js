import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { protectBloodBank } from '../middleware/auth.js';
import {
  generateToken,
  register,
  login,
  getProfile,
  updateProfile,
  getInventory,
  updateInventory,
  getAllBloodBanks,
  getBloodBankById,
  createBloodBank,
  updateBloodBankInventory,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  changePassword

} from '../controller/bloodBank.controller.js';

const router = Router();

// @route   POST /api/blood-banks/register
// @desc    Register a new blood bank
// @access  Public
router.route('/register').post(register);

// @route   POST /api/blood-banks/login
// @desc    Authenticate blood bank & get token
// @access  Public
router.route('/login').post(login);

// @route   GET /api/blood-banks/profile
// @desc    Get blood bank profile
// @access  Private (Blood Bank)
router.route('/profile').get(protectBloodBank, getProfile);

// @route   PUT /api/blood-banks/profile
// @desc    Update blood bank profile
// @access  Private (Blood Bank)
router.route('/profile').put(protectBloodBank, updateProfile);

// @route   GET /api/blood-banks/inventory
// @desc    Get blood bank inventory
// @access  Private (Blood Bank)
router.route('/inventory').get(protectBloodBank, getInventory);

// @route   PUT /api/blood-banks/inventory
// @desc    Update blood bank inventory
// @access  Private (Blood Bank)
router.route('/inventory').put(protectBloodBank, updateInventory);

// @route   GET /api/blood-banks
// @desc    Get all blood banks or nearby ones
// @access  Public
router.route('/').get(getAllBloodBanks);

// @route   GET /api/bloodbanks/:id
// @desc    Get blood bank by ID
// @access  Public
router.route('/:id').get(getBloodBankById);

// @route   POST /api/bloodbanks
// @desc    Create a new blood bank (Admin only)
// @access  Private
router.route('/').post(auth, createBloodBank);

// @route   PUT /api/bloodbanks/:id/inventory
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

// @route   POST /api/blood-banks/change-password
// @desc    Change password for authenticated blood bank
// @access  Private
router.route('/change-password').post(protectBloodBank, changePassword);

export default router;
