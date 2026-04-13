import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as donationService from '../services/donationService.js';
import * as certificateService from '../services/certificateService.js';
import Donation from '../models/Donation.model.js';
import { ApiError } from '../utils/apiError.js';

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

// Download donation certificate
export const downloadCertificate = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const userId = req.user.userId || req.user._id || req.user.id;

  const donation = await Donation.findById(donationId)
    .populate('donor', 'name')
    .populate('bloodBank', 'name address')
    .populate('camp', 'name address');

  if (!donation) {
    throw new ApiError(404, 'Donation record not found');
  }

  // Security check: Only the donor or an admin can download the certificate
  if (donation.donor._id.toString() !== userId.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, 'Unauthorized to download this certificate');
  }

  if (donation.status !== 'completed') {
    throw new ApiError(400, 'Donation is not completed yet. Certificate not available.');
  }

  const pdfBuffer = await certificateService.generateDonationCertificate(donation);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=Donation_Certificate_${donation.certificateCode}.pdf`,
    'Content-Length': pdfBuffer.length,
  });

  res.send(pdfBuffer);
});

// Public verify certificate
export const verifyCertificateHandler = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const result = await certificateService.verifyCertificate(code);
  successResponse(res, result, 200, 'Certificate verification successful');
});
