import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import * as bloodBankPortalService from "../services/bloodBankPortalService.js";
import * as bloodBankExportService from "../services/bloodBankExportService.js";
import { ApiError } from "../utils/apiError.js";
import { clearCacheByPrefix } from "../middleware/cache.js";
import { ensureValid } from "../middleware/validateRequest.js";
import { cleanupTempFile, validateFileContent } from "../middleware/multer.js";

const getBloodBankId = (req) => req.bloodBank.bloodBankId || req.bloodBank.id;

export const getAllRequests = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getAllRequests(
    getBloodBankId(req),
    req.query,
  );
  successResponse(res, result, 200, "Requests fetched successfully");
});

export const getApprovedRequests = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getApprovedRequests(
    getBloodBankId(req),
    req.query,
  );
  successResponse(res, result, 200, "Approved requests fetched successfully");
});

export const getRequestDetails = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getRequestDetails(
    req.params.id,
    getBloodBankId(req),
  );
  successResponse(res, result, 200, "Request details fetched successfully");
});

export const createBankToBankRequest = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankPortalService.createBankToBankRequest(
    getBloodBankId(req),
    req.body,
  );
  successResponse(
    res,
    result,
    201,
    "Blood request sent to the selected blood bank",
  );
});

export const approveRequest = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankPortalService.approveRequest(
    req.params.id,
    getBloodBankId(req),
    req.body.responseNote,
  );
  successResponse(res, result, 200, "Blood request approved successfully");
});

export const rejectRequest = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankPortalService.rejectRequest(
    req.params.id,
    getBloodBankId(req),
    req.body.responseNote,
  );
  successResponse(res, result, 200, "Blood request rejected");
});

export const getRequestStats = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getRequestStats(
    getBloodBankId(req),
  );
  successResponse(res, result, 200, "Request stats fetched successfully");
});

export const getAllEvents = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getAllEvents(
    getBloodBankId(req),
    req.query,
  );
  successResponse(res, result, 200, "Events fetched successfully");
});

export const createEvent = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankPortalService.createEvent(
    getBloodBankId(req),
    req.body,
  );
  await clearCacheByPrefix("/api/v1/events");
  successResponse(
    res,
    result,
    201,
    "Event created successfully and is now visible to users",
  );
});

export const updateEvent = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankPortalService.updateEvent(
    req.params.id,
    getBloodBankId(req),
    req.body,
  );
  await clearCacheByPrefix("/api/v1/events");
  successResponse(res, result, 200, "Event updated successfully");
});

export const deleteEvent = asyncHandler(async (req, res) => {
  await bloodBankPortalService.deleteEvent(req.params.id, getBloodBankId(req));
  await clearCacheByPrefix("/api/v1/events");
  successResponse(res, null, 200, "Event deleted successfully");
});

export const getEventRegistrations = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getEventRegistrations(
    req.params.id,
    getBloodBankId(req),
    req.query,
  );
  successResponse(res, result, 200, "Event registrations fetched successfully");
});


export const getAllCamps = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getAllCamps(
    getBloodBankId(req),
    req.query,
  );
  successResponse(res, result, 200, "Camps fetched successfully");
});

export const getCampRegistrations = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getCampRegistrations(
    req.params.id,
    getBloodBankId(req),
  );
  successResponse(res, result, 200, "Camp registrations fetched successfully");
});

export const removeDonorRegistration = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.removeDonorRegistration(
    req.params.id,
    getBloodBankId(req),
    req.params.donorId,
  );
  await clearCacheByPrefix("/api/v1/blood-camps");
  successResponse(res, result, 200, "Donor registration removed successfully");
});


export const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Please select a photo to upload");
  }

  const validation = await validateFileContent(req.file);
  if (
    !validation.valid ||
    !String(validation.detectedType || "").startsWith("image/")
  ) {
    await cleanupTempFile(req.file.path);
    throw new ApiError(
      400,
      validation.error || "Uploaded file must be a valid image",
    );
  }
  const result = await bloodBankPortalService.uploadPhoto(
    getBloodBankId(req),
    req.file.path,
  );
  successResponse(res, result, 200, "Photo uploaded successfully");
});

export const getDashboard = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getDashboard(getBloodBankId(req));
  successResponse(res, result, 200, "Dashboard data fetched successfully");
});

export const getProfile = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getProfile(getBloodBankId(req));
  successResponse(res, result, 200, "Profile fetched successfully");
});

export const updateProfile = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankPortalService.updateProfile(
    getBloodBankId(req),
    req.body,
  );

  // Invalidate profile and public search cache
  await clearCacheByPrefix("/api/v1/bloodbank/profile");
  await clearCacheByPrefix("/api/v1/blood-banks");

  successResponse(res, result, 200, "Profile updated successfully");
});

export const changePassword = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankPortalService.changePassword(
    getBloodBankId(req),
    req.body.currentPassword,
    req.body.newPassword,
  );
  successResponse(res, result, 200, "Password changed successfully");
});

export const getInventory = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getInventory(getBloodBankId(req));
  successResponse(res, result, 200, "Inventory fetched successfully");
});

export const updateInventory = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankPortalService.updateInventory(
    getBloodBankId(req),
    req.body.inventory,
  );

  // Invalidate inventory and public search cache
  await clearCacheByPrefix("/api/v1/bloodbank/inventory");
  await clearCacheByPrefix("/api/v1/blood-banks");

  successResponse(res, result, 200, "Inventory updated successfully");
});

export const updateBloodGroupUnits = asyncHandler(async (req, res) => {
  ensureValid(req);
  const result = await bloodBankPortalService.updateBloodGroupUnits(
    getBloodBankId(req),
    req.params.bloodGroup,
    req.body.units,
  );

  // Invalidate inventory and public search cache
  await clearCacheByPrefix("/api/v1/bloodbank/inventory");
  await clearCacheByPrefix("/api/v1/blood-banks");

  successResponse(
    res,
    result,
    200,
    `${req.params.bloodGroup} inventory updated`,
  );
});

export const exportInventoryData = asyncHandler(async (req, res) => {
  const result = await bloodBankExportService.exportInventoryData(getBloodBankId(req));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.send(Buffer.from(result.buffer));
});

export const exportCampReports = asyncHandler(async (req, res) => {
  const result = await bloodBankExportService.exportCampReports(getBloodBankId(req));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.send(Buffer.from(result.buffer));
});

export const exportAllData = asyncHandler(async (req, res) => {
  const result = await bloodBankExportService.exportAllData(getBloodBankId(req));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.send(Buffer.from(result.buffer));
});

