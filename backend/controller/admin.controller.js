import * as adminService from '../services/adminService.js';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';

/**
 * Returns a safe filename for Content-Disposition headers.
 * Strips any characters that are not alphanumeric, underscore, hyphen, or dot
 * to prevent header injection while preserving readability.
 */
const safeFilename = (name) => String(name || 'export').replace(/[^a-zA-Z0-9._-]/g, '_');

/**
 * Parses and clamps a pagination parameter.
 */
const parsePage = (raw) => Math.max(1, parseInt(raw) || 1);
const parseLimit = (raw, max = 100) => Math.min(max, Math.max(1, parseInt(raw) || 10));

// ===================== EXPORT HANDLERS =====================

// Export all users to Excel
export const exportUsers = asyncHandler(async (req, res) => {
  const result = await adminService.exportUsers();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
}); 

// Export all blood requests to Excel
export const exportRequests = asyncHandler(async (req, res) => {
  const result = await adminService.exportRequests();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

// Export all blood banks to Excel
export const exportBloodBanks = asyncHandler(async (req, res) => {
  const result = await adminService.exportBloodBanks();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

// Export all blood camps to Excel
export const exportCamps = asyncHandler(async (req, res) => {
  const result = await adminService.exportCamps();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

// Export all events to Excel
export const exportEvents = asyncHandler(async (req, res) => {
  const result = await adminService.exportEvents();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

// NEW: Export handlers for CSV and all-in-one
export const exportUsersCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportUsersCsv();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'text/csv');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

export const exportRequestsCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportRequestsCsv();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'text/csv');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

export const exportBloodBanksCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportBloodBanksCsv();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'text/csv');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

export const exportCampsCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportCampsCsv();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'text/csv');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

export const exportEventsCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportEventsCsv();
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', 'text/csv');
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

export const exportAllData = asyncHandler(async (req, res) => {
  const { format = 'xlsx' } = req.query; // 'xlsx' or 'csv'
  const result = await adminService.exportAllData(format);
  
  const contentType = format === 'csv' 
    ? 'text/csv' 
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(result.filename)}"`);
  res.setHeader('Content-Type', contentType);
  if (result.rowsLimited) res.setHeader('X-Export-Row-Limit', 'true');
  res.send(result.buffer);
});

// ===================== USERS MANAGEMENT =====================

export const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, status, bloodType, search } = req.query;
  const filters = { status, bloodType, search };
  const result = await adminService.getAllUsers(parsePage(page), parseLimit(limit), filters);
  successResponse(res, result, 200, 'Users retrieved successfully');
});

export const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await adminService.getUserById(userId);
  successResponse(res, user, 200, 'User retrieved successfully');
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const user = await adminService.updateUserStatus(userId, status);
  successResponse(res, user, 200, 'User status updated successfully');
});

// ===================== BLOOD BANKS MANAGEMENT =====================

export const getAllBloodBanks = asyncHandler(async (req, res) => {
  const { page, limit, status, search } = req.query;
  const filters = { status, search };
  const result = await adminService.getAllBloodBanks(parsePage(page), parseLimit(limit), filters);
  successResponse(res, result, 200, 'Blood banks retrieved successfully');
});

export const getBloodBankById = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const bank = await adminService.getBloodBankById(bankId);
  successResponse(res, bank, 200, 'Blood bank retrieved successfully');
});

export const updateBloodBankStatus = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const { status, rejectionReason } = req.body;
  const bank = await adminService.updateBloodBankStatus(bankId, status, {
    rejectionReason,
    reviewedBy: req.admin?.adminEmail || 'admin',
    adminEmail: req.admin?.adminEmail,
    adminName: 'Super Admin',
  });
  successResponse(res, bank, 200, 'Blood bank status updated successfully');
});

// ===================== CAMPS MANAGEMENT =====================

export const getAllCamps = asyncHandler(async (req, res) => {
  const { page, limit, status, search, bloodBankId } = req.query;
  const filters = { status, search, bloodBankId };
  const result = await adminService.getAllCamps(parsePage(page), parseLimit(limit), filters);
  successResponse(res, result, 200, 'Blood camps retrieved successfully');
});

export const getCampsByBloodBank = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const { page, limit, status, search } = req.query;
  const filters = { status, search };
  const result = await adminService.getCampsByBloodBank(bankId, parsePage(page), parseLimit(limit), filters);
  successResponse(res, result, 200, 'Blood bank camps retrieved successfully');
});

export const getCampById = asyncHandler(async (req, res) => {
  const { campId } = req.params;
  const camp = await adminService.getCampById(campId);
  successResponse(res, camp, 200, 'Blood camp retrieved successfully');
});

export const updateCampStatus = asyncHandler(async (req, res) => {
  const { campId } = req.params;
  const { status } = req.body;
  const camp = await adminService.updateCampStatus(campId, status);
  successResponse(res, camp, 200, 'Blood camp status updated successfully');
});

// ===================== EVENTS MANAGEMENT =====================

export const getAllEvents = asyncHandler(async (req, res) => {
  const { page, limit, status, search, bloodBankId } = req.query;
  const filters = { status, search, bloodBankId };
  const result = await adminService.getAllEvents(parsePage(page), parseLimit(limit), filters);
  successResponse(res, result, 200, 'Events retrieved successfully');
});

export const getEventsByBloodBank = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const { page, limit, status, search } = req.query;
  const filters = { status, search };
  const result = await adminService.getEventsByBloodBank(bankId, parsePage(page), parseLimit(limit), filters);
  successResponse(res, result, 200, 'Blood bank events retrieved successfully');
});

export const getEventById = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await adminService.getEventById(eventId);
  successResponse(res, event, 200, 'Event retrieved successfully');
});

export const updateEventStatus = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { status } = req.body;
  const event = await adminService.updateEventStatus(eventId, status);
  successResponse(res, event, 200, 'Event status updated successfully');
});

// ===================== REQUESTS MANAGEMENT =====================

export const getAllRequests = asyncHandler(async (req, res) => {
  const { page, limit, status, bloodType, urgency, search, userId } = req.query;
  const filters = { status, bloodType, urgency, search, userId };
  const result = await adminService.getAllRequests(parsePage(page), parseLimit(limit), filters);
  successResponse(res, result, 200, 'Blood requests retrieved successfully');
});

export const getRequestById = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const request = await adminService.getRequestById(requestId);
  successResponse(res, request, 200, 'Blood request retrieved successfully');
});

export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  const request = await adminService.updateRequestStatus(requestId, status);
  successResponse(res, request, 200, 'Blood request status updated successfully');
});

// ===================== DONATIONS MANAGEMENT =====================

export const getAllDonations = asyncHandler(async (req, res) => {
  const { page, limit, status, bloodType, search, userId } = req.query;
  const filters = { status, bloodType, search, userId };
  const result = await adminService.getAllDonations(parsePage(page), parseLimit(limit), filters);
  successResponse(res, result, 200, 'Donations retrieved successfully');
});

export const getDonationById = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const donation = await adminService.getDonationById(donationId);
  successResponse(res, donation, 200, 'Donation retrieved successfully');
});

export const updateDonationStatus = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const { status } = req.body;
  const donation = await adminService.updateDonationStatus(donationId, status);
  successResponse(res, donation, 200, 'Donation status updated successfully');
});

// ===================== INVENTORY MANAGEMENT =====================

export const getInventoryOverview = asyncHandler(async (req, res) => {
  const { page, limit, bloodType, search } = req.query;
  const filters = { bloodType, search };
  const result = await adminService.getInventoryOverview(parsePage(page), parseLimit(limit), filters);
  successResponse(res, result, 200, 'Inventory retrieved successfully');
});

export const getInventoryById = asyncHandler(async (req, res) => {
  const { inventoryId } = req.params;
  const result = await adminService.getInventoryById(inventoryId);
  successResponse(res, result, 200, 'Inventory details retrieved successfully');
});

// ===================== DASHBOARD STATS =====================

export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  successResponse(res, stats, 200, 'Dashboard statistics retrieved successfully');
});

