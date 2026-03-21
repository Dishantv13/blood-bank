import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as donationService from '../services/donationService.js';

/**
 * ============================================
 * CLEAN CONTROLLERS - Only handling req/res
 * All business logic moved to services
 * ============================================
 */

// Create donation request
export const createDonationRequest = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const donorId = req.user.userId || req.user._id || req.user.id;
  const result = await donationService.createDonationRequest(donorId, req.body.bloodBankId, req.body);
  successResponse(res, result, 201, 'Donation request submitted successfully');
});

// Get user's own donation history
export const getMyDonations = asyncHandler(async (req, res) => {
  const donorId = req.user.userId || req.user._id || req.user.id;
  const result = await donationService.getUserDonations(donorId, req.query);
  successResponse(res, result, 200, 'Donationhistory retrieved successfully');
});

// Get blood bank's donations
export const getBloodBankDonations = asyncHandler(async (req, res) => {
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  const result = await donationService.getBloodBankDonations(bloodBankId, req.query);
  successResponse(res, result, 200, 'Blood bank donations retrieved successfully');
});

// Record a donation
export const recordDonation = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  const { donationId } = req.params;
  const result = await donationService.recordDonation(donationId, bloodBankId, req.body.volumeDonated);
  successResponse(res, result, 200, 'Donation recorded successfully');
});

// Update donation status
export const updateDonationStatus = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  const { donationId } = req.params;
  const result = await donationService.updateDonationStatus(donationId, bloodBankId, req.body.status);
  successResponse(res, result, 200, 'Donation status updated successfully');
});

// Create donation by blood bank
export const createDonationByBank = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  const result = await donationService.createDonationRequest(req.body.donorId, bloodBankId, {
    campId: req.body.campId,
    bloodGroup: req.body.bloodGroup
  });
  successResponse(res, result, 201, 'Donation record created successfully');
});
