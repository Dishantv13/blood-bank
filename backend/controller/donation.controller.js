import { validationResult } from "express-validator";
import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import * as donationService from "../services/donationService.js";
import * as certificateService from "../services/certificateService.js";

// Create donation request
export const createDonationRequest = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTPS_CODE.BAD_REQUEST).json({ errors: errors.array() });
  }

  const donorId = req.user.userId || req.user._id || req.user.id;
  const result = await donationService.createDonationRequest(
    donorId,
    req.body.bloodBankId,
    req.body,
  );
  successResponse(res, result, HTTPS_CODE.CREATED, "Donation request submitted successfully");
});

// Get user's own donation history
export const getMyDonations = asyncHandler(async (req, res) => {
  const donorId = req.user.userId || req.user._id || req.user.id;
  const result = await donationService.getUserDonations(donorId, req.query);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Donation history retrieved successfully");
});

// Get blood bank's donations
export const getBloodBankDonations = asyncHandler(async (req, res) => {
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank.id;
  const result = await donationService.getBloodBankDonations(
    bloodBankId,
    req.query,
  );
  successResponse(
    res,
    result,
    HTTPS_CODE.OK_SUCCESS,
    "Blood bank donations retrieved successfully",
  );
});

// Record a donation
export const recordDonation = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTPS_CODE.BAD_REQUEST).json({ errors: errors.array() });
  }

  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank.id;
  const { donationId } = req.params;
  const result = await donationService.recordDonation(
    donationId,
    bloodBankId,
    req.body.volumeDonated,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Donation recorded successfully");
});

// Update donation status
export const updateDonationStatus = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTPS_CODE.BAD_REQUEST).json({ errors: errors.array() });
  }

  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank.id;
  const { donationId } = req.params;
  const result = await donationService.updateDonationStatus(
    donationId,
    bloodBankId,
    req.body.status,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Donation status updated successfully");
});

// Create donation by blood bank
export const createDonationByBank = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(HTTPS_CODE.BAD_REQUEST).json({ errors: errors.array() });
  }

  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank.id;
  const result = await donationService.createDonationRequest(
    req.body.donorId,
    bloodBankId,
    {
      campId: req.body.campId,
      bloodGroup: req.body.bloodGroup,
    },
  );
  successResponse(res, result, HTTPS_CODE.CREATED, "Donation record created successfully");
});

// Download donation certificate
export const downloadCertificate = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const result = await donationService.getDonationCertificate(
    donationId,
    req.user,
  );

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=Donation_Certificate_${result.certificateCode}.pdf`,
    "Content-Length": result.pdfBuffer.length,
  });

  res.send(result.pdfBuffer);
});

// Public verify certificate
export const verifyCertificateHandler = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const result = await certificateService.verifyCertificate(code);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Certificate verification successful");
});
