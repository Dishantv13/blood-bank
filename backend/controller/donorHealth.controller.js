import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import * as donorHealthService from "../services/donorHealthService.js";

// Submit a donor health form
export const submitHealthForm = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await donorHealthService.submitHealthForm(userId, req.body);
  successResponse(res, result, HTTPS_CODE.CREATED, "Health form submitted successfully");
});

// Get donor's health forms
export const getMyForms = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await donorHealthService.getMyForms(userId);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Forms fetched successfully");
});

// Get donor's latest health form
export const getLatestForm = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await donorHealthService.getLatestForm(userId);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Latest form fetched successfully");
});

// Check donor eligibility
export const checkEligibility = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await donorHealthService.checkEligibility(userId);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Eligibility checked successfully");
});

// Get all health forms (for blood bank review)
export const getAllForms = asyncHandler(async (req, res) => {
  const result = await donorHealthService.getAllForms(req.query);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "All forms fetched successfully");
});

// Get health form by ID
export const getFormById = asyncHandler(async (req, res) => {
  const result = await donorHealthService.getFormById(req.params.id);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Form fetched successfully");
});

// Review a health form
export const reviewForm = asyncHandler(async (req, res) => {
  const result = await donorHealthService.reviewForm(
    req.params.id,
    req.bloodBank.bloodBankId || req.bloodBank.id,
    req.body,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Health form reviewed successfully");
});

// Update a health form (by donor)
export const updateForm = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await donorHealthService.updateForm(
    req.params.id,
    userId,
    req.body,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Health form updated successfully");
});
