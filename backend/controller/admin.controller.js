import * as adminService from "../services/adminService.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse } from "../utils/response.js";
import { ensureValid } from "../middleware/validateRequest.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";

// Returns a safe filename for Content-Disposition, preventing header injection.
const safeFilename = (name) =>
  String(name || "export").replace(/[^a-zA-Z0-9._-]/g, "_");

// Parses and clamps a pagination parameter.
const parsePage = (raw) => Math.max(1, parseInt(raw) || 1);
const parseLimit = (raw, max = 100) =>
  Math.min(max, Math.max(1, parseInt(raw) || 10));

// Export Handlers

// Export all users to Excel
export const exportUsers = asyncHandler(async (req, res) => {
  const result = await adminService.exportUsers();
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(result.filename)}"`,
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  if (result.rowsLimited) res.setHeader("X-Export-Row-Limit", "true");
  res.send(result.buffer);
});

// Export all blood requests to Excel
export const exportRequests = asyncHandler(async (req, res) => {
  const result = await adminService.exportRequests();
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(result.filename)}"`,
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  if (result.rowsLimited) res.setHeader("X-Export-Row-Limit", "true");
  res.send(result.buffer);
});

// Export all blood banks to Excel
export const exportBloodBanks = asyncHandler(async (req, res) => {
  const result = await adminService.exportBloodBanks();
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(result.filename)}"`,
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  if (result.rowsLimited) res.setHeader("X-Export-Row-Limit", "true");
  res.send(result.buffer);
});

// Export all blood camps to Excel
export const exportCamps = asyncHandler(async (req, res) => {
  const result = await adminService.exportCamps();
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(result.filename)}"`,
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  if (result.rowsLimited) res.setHeader("X-Export-Row-Limit", "true");
  res.send(result.buffer);
});

// Export all events to Excel
export const exportEvents = asyncHandler(async (req, res) => {
  const result = await adminService.exportEvents();
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(result.filename)}"`,
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  if (result.rowsLimited) res.setHeader("X-Export-Row-Limit", "true");
  res.send(result.buffer);
});

// NEW: Export handlers for CSV and all-in-one
export const exportAllData = asyncHandler(async (req, res) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  const timestamp = new Date().toISOString().split("T")[0];
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(`all_data_${timestamp}.xlsx`)}"`,
  );

  await adminService.exportAllData(res);
});

// Users Management

export const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, status, bloodType, search } = req.query;
  const filters = { status, bloodType, search };
  const result = await adminService.getAllUsers(
    parsePage(page),
    parseLimit(limit),
    filters,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Users retrieved successfully");
});

export const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await adminService.getUserById(userId);
  successResponse(res, user, HTTPS_CODE.OK_SUCCESS, "User retrieved successfully");
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { userId } = req.params;
  const { status } = req.body;
  const user = await adminService.updateUserStatus(userId, status);
  successResponse(res, user, HTTPS_CODE.OK_SUCCESS, "User status updated successfully");
});

// Blood Banks Management

export const getAllBloodBanks = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const filters = { status, search };
  const result = await adminService.getAllBloodBanks(
    parsePage(page),
    parseLimit(limit),
    filters,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood banks retrieved successfully");
});

export const getBloodBankById = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const bank = await adminService.getBloodBankById(bankId);
  successResponse(res, bank, HTTPS_CODE.OK_SUCCESS, "Blood bank retrieved successfully");
});

export const updateBloodBankStatus = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { bankId } = req.params;
  const { status, rejectionReason } = req.body;
  const bank = await adminService.updateBloodBankStatus(bankId, status, {
    rejectionReason,
    reviewedBy: req.admin?.adminEmail || "admin",
    adminEmail: req.admin?.adminEmail,
    adminName: "Super Admin",
  });
  successResponse(res, bank, HTTPS_CODE.OK_SUCCESS, "Blood bank status updated successfully");
});

// Camps Management

export const getAllCamps = asyncHandler(async (req, res) => {
  const { page, limit, status, search, bloodBankId } = req.query;
  const filters = { status, search, bloodBankId };
  const result = await adminService.getAllCamps(
    parsePage(page),
    parseLimit(limit),
    filters,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood camps retrieved successfully");
});

export const getCampsByBloodBank = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const { page, limit, status, search } = req.query;
  const filters = { status, search };
  const result = await adminService.getCampsByBloodBank(
    bankId,
    parsePage(page),
    parseLimit(limit),
    filters,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood bank camps retrieved successfully");
});

export const getCampById = asyncHandler(async (req, res) => {
  const { campId } = req.params;
  const camp = await adminService.getCampById(campId);
  successResponse(res, camp, HTTPS_CODE.OK_SUCCESS, "Blood camp retrieved successfully");
});

export const updateCampStatus = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { campId } = req.params;
  const { status } = req.body;
  const camp = await adminService.updateCampStatus(campId, status);
  successResponse(res, camp, HTTPS_CODE.OK_SUCCESS, "Blood camp status updated successfully");
});

// Events Management

export const getAllEvents = asyncHandler(async (req, res) => {
  const { page, limit, status, search, bloodBankId } = req.query;
  const filters = { status, search, bloodBankId };
  const result = await adminService.getAllEvents(
    parsePage(page),
    parseLimit(limit),
    filters,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Events retrieved successfully");
});

export const getEventsByBloodBank = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const { page, limit, status, search } = req.query;
  const filters = { status, search };
  const result = await adminService.getEventsByBloodBank(
    bankId,
    parsePage(page),
    parseLimit(limit),
    filters,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood bank events retrieved successfully");
});

export const getEventById = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await adminService.getEventById(eventId);
  successResponse(res, event, HTTPS_CODE.OK_SUCCESS, "Event retrieved successfully");
});

export const updateEventStatus = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { eventId } = req.params;
  const { status } = req.body;
  const event = await adminService.updateEventStatus(eventId, status);
  successResponse(res, event, HTTPS_CODE.OK_SUCCESS, "Event status updated successfully");
});

// Requests Management

export const getAllRequests = asyncHandler(async (req, res) => {
  const { page, limit, status, bloodType, urgency, search, userId, requestType } = req.query;
  const filters = { status, bloodType, urgency, search, userId, requestType };
  const result = await adminService.getAllRequests(
    parsePage(page),
    parseLimit(limit),
    filters,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Blood requests retrieved successfully");
});

export const getRequestById = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const request = await adminService.getRequestById(requestId);
  successResponse(res, request, HTTPS_CODE.OK_SUCCESS, "Blood request retrieved successfully");
});

export const updateRequestStatus = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { requestId } = req.params;
  const { status } = req.body;
  const request = await adminService.updateRequestStatus(requestId, status);
  successResponse(
    res,
    request,
    HTTPS_CODE.OK_SUCCESS,
    "Blood request status updated successfully",
  );
});

// Donations Management

export const getAllDonations = asyncHandler(async (req, res) => {
  const { page, limit, status, bloodType, search, userId } = req.query;
  const filters = { status, bloodType, search, userId };
  const result = await adminService.getAllDonations(
    parsePage(page),
    parseLimit(limit),
    filters,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Donations retrieved successfully");
});

export const getDonationById = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const donation = await adminService.getDonationById(donationId);
  successResponse(res, donation, HTTPS_CODE.OK_SUCCESS, "Donation retrieved successfully");
});

export const updateDonationStatus = asyncHandler(async (req, res) => {
  ensureValid(req);
  const { donationId } = req.params;
  const { status } = req.body;
  const donation = await adminService.updateDonationStatus(donationId, status);
  successResponse(res, donation, HTTPS_CODE.OK_SUCCESS, "Donation status updated successfully");
});

// Inventory Management

export const getInventoryOverview = asyncHandler(async (req, res) => {
  const { page, limit, bloodType, search } = req.query;
  const filters = { bloodType, search };
  const result = await adminService.getInventoryOverview(
    parsePage(page),
    parseLimit(limit),
    filters,
  );
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Inventory retrieved successfully");
});

export const getInventoryById = asyncHandler(async (req, res) => {
  const { inventoryId } = req.params;
  const result = await adminService.getInventoryById(inventoryId);
  successResponse(res, result, HTTPS_CODE.OK_SUCCESS, "Inventory details retrieved successfully");
});

// Dashboard Stats

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  successResponse(
    res,
    stats,
    HTTPS_CODE.OK_SUCCESS,
    "Dashboard statistics retrieved successfully",
  );
});
