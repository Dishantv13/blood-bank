import { ensureValid } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import { clearCacheByPrefix } from "../middleware/cache.js";
import * as bloodCampService from "../services/bloodCampService.js";

// Get all blood camps
export const getAllCamps = asyncHandler(async (req, res) => {
  const result = await bloodCampService.getAllCamps(req.query);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood camps fetched successfully");
});

// Get blood camp by ID
export const getCampById = asyncHandler(async (req, res) => {
  const result = await bloodCampService.getCampById(req.params.id);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood camp fetched successfully");
});

// Create a new blood camp
export const createCamp = asyncHandler(async (req, res) => {
  ensureValid(req);

  const result = await bloodCampService.createCamp(req.bloodBank, req.body);
  await clearCacheByPrefix("/api/v1/blood-camps");
  successResponse(res, result, HTTPS_CODE.CREATED, "Blood camp created successfully");
});

// Update a blood camp
export const updateCamp = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodCampService.updateCamp(
    req.params.id,
    req.bloodBank.bloodBankId || req.bloodBank.id,
    req.body,
  );
  await clearCacheByPrefix("/api/v1/blood-camps");
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood camp updated successfully");
});

// Delete a blood camp
export const deleteCamp = asyncHandler(async (req, res) => {
  await bloodCampService.deleteCamp(
    req.params.id,
    req.bloodBank.bloodBankId || req.bloodBank.id,
  );
  await clearCacheByPrefix("/api/v1/blood-camps");
  successResponse(res, null, HTTPS_CODE.OK_SUCCESS, "Blood camp deleted successfully");
});

// Register for a blood camp
export const registerCamp = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await bloodCampService.registerCamp(req.params.id, userId);
  await clearCacheByPrefix("/api/v1/blood-camps");
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Successfully registered for blood camp");
});

// Export registered users for a blood camp to Excel
export const exportRegistrations = asyncHandler(async (req, res) => {
  const result = await bloodCampService.exportRegistrations(
    req.params.id,
    req.bloodBank.bloodBankId || req.bloodBank.id,
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${result.filename}`,
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.send(result.buffer);
});

// Get camps organized by the logged in blood bank
export const getMyCamps = asyncHandler(async (req, res) => {
  const result = await bloodCampService.getMyCamps(
    req.bloodBank.bloodBankId || req.bloodBank.id,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "My camps fetched successfully");
});

// Update collected units for a camp
export const updateCollectedUnits = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodCampService.updateCollectedUnits(
    req.params.id,
    req.bloodBank.bloodBankId || req.bloodBank.id,
    req.body.collectedUnits,
  );
  await clearCacheByPrefix("/api/v1/blood-camps");
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Collected units updated");
});

