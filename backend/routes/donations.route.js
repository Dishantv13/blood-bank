import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { bloodBankAuth } from "../middleware/auth.js";
import { donationCreationLimiter } from '../middleware/rateLimiter.js';
import {
  createDonationRequest,
  getMyDonations,
  getBloodBankDonations,
  recordDonation,
  updateDonationStatus,
  createDonationByBank,
} from "../controller/donation.controller.js";

const router = Router();

// ========================
// Donor Routes
// ========================

// @route   POST /api/donations/request
// @desc    Submit a request to donate blood at a specific bank
// @access  Private (Donor)
router.route("/request").post(auth, donationCreationLimiter, createDonationRequest);

// @route   GET /api/donations/my
// @desc    Get logged in user's donations
// @access  Private
router.route("/my").get(auth, getMyDonations);

// ========================
// Blood Bank Routes
// ========================

// @route   GET /api/donations/bank
// @desc    Get all donation requests for the logged-in Blood Bank
// @access  Private (Blood Bank)
router.route("/bank").get(bloodBankAuth, getBloodBankDonations);

// @route   PUT /api/donations/bank/:donationId/record
// @desc    Record a completed donation (add volume & update date)
// @access  Private (Blood Bank)
router.route("/bank/:donationId/record").put(bloodBankAuth, recordDonation);

// @route   PUT /api/donations/bank/:donationId/status
// @desc    Update status (e.g., 'rejected', 'approved')
// @access  Private (Blood Bank)
router.route("/bank/:donationId/status").put(bloodBankAuth, updateDonationStatus);

// @route   POST /api/donations/bank/create
// @desc    Blood bank manually creates a donation record
// @access  Private (Blood Bank)
router.route("/bank/create").post(bloodBankAuth, createDonationByBank);

export default router;
