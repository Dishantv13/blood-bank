import * as adminService from '../services/adminService.js';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

// ===================== EXPORT HANDLERS =====================

// Export all users to Excel
const exportUsers = asyncHandler(async (req, res) => {
  const result = await adminService.exportUsers();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
});

// Export all blood requests to Excel
const exportRequests = asyncHandler(async (req, res) => {
  const result = await adminService.exportRequests();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
});

// Export all blood banks to Excel
const exportBloodBanks = asyncHandler(async (req, res) => {
  const result = await adminService.exportBloodBanks();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
});

// Export all blood camps to Excel
const exportCamps = asyncHandler(async (req, res) => {
  const result = await adminService.exportCamps();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
});

// Export all events to Excel
const exportEvents = asyncHandler(async (req, res) => {
  const result = await adminService.exportEvents();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(result.buffer);
});

// NEW: Export handlers for CSV and all-in-one
const exportUsersCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportUsersCsv();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(result.buffer);
});

const exportRequestsCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportRequestsCsv();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(result.buffer);
});

const exportBloodBanksCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportBloodBanksCsv();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(result.buffer);
});

const exportCampsCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportCampsCsv();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(result.buffer);
});

const exportEventsCsv = asyncHandler(async (req, res) => {
  const result = await adminService.exportEventsCsv();
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', 'text/csv');
  res.send(result.buffer);
});

const exportAllData = asyncHandler(async (req, res) => {
  const { format = 'xlsx' } = req.query; // 'xlsx' or 'csv'
  const result = await adminService.exportAllData(format);
  
  const contentType = format === 'csv' 
    ? 'text/csv' 
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  
  res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
  res.setHeader('Content-Type', contentType);
  res.send(result.buffer);
});

// ===================== USERS MANAGEMENT =====================

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, bloodType, search } = req.query;
  const filters = { status, bloodType, search };
  const result = await adminService.getAllUsers(parseInt(page), parseInt(limit), filters);
  successResponse(res, result, 200, 'Users retrieved successfully');
});

const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await adminService.getUserById(userId);
  successResponse(res, user, 200, 'User retrieved successfully');
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const user = await adminService.updateUserStatus(userId, status);
  successResponse(res, user, 200, 'User status updated successfully');
});

// ===================== BLOOD BANKS MANAGEMENT =====================

const getAllBloodBanks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const filters = { status, search };
  const result = await adminService.getAllBloodBanks(parseInt(page), parseInt(limit), filters);
  successResponse(res, result, 200, 'Blood banks retrieved successfully');
});

const getBloodBankById = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const bank = await adminService.getBloodBankById(bankId);
  successResponse(res, bank, 200, 'Blood bank retrieved successfully');
});

const updateBloodBankStatus = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const { status, rejectionReason } = req.body;
  const bank = await adminService.updateBloodBankStatus(bankId, status, {
    rejectionReason,
    reviewedBy: req.admin?.email || req.admin?.name || 'admin',
    adminEmail: req.admin?.email,
    adminName: req.admin?.name,
  });
  successResponse(res, bank, 200, 'Blood bank status updated successfully');
});

// ===================== CAMPS MANAGEMENT =====================

const getAllCamps = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, bloodBankId } = req.query;
  const filters = { status, search, bloodBankId };
  const result = await adminService.getAllCamps(parseInt(page), parseInt(limit), filters);
  successResponse(res, result, 200, 'Blood camps retrieved successfully');
});

const getCampsByBloodBank = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const { page = 1, limit = 10, status, search } = req.query;
  const filters = { status, search };
  const result = await adminService.getCampsByBloodBank(bankId, parseInt(page), parseInt(limit), filters);
  successResponse(res, result, 200, 'Blood bank camps retrieved successfully');
});

const getCampById = asyncHandler(async (req, res) => {
  const { campId } = req.params;
  const camp = await adminService.getCampById(campId);
  successResponse(res, camp, 200, 'Blood camp retrieved successfully');
});

const updateCampStatus = asyncHandler(async (req, res) => {
  const { campId } = req.params;
  const { status } = req.body;
  const camp = await adminService.updateCampStatus(campId, status);
  successResponse(res, camp, 200, 'Blood camp status updated successfully');
});

// ===================== EVENTS MANAGEMENT =====================

const getAllEvents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, bloodBankId } = req.query;
  const filters = { status, search, bloodBankId };
  const result = await adminService.getAllEvents(parseInt(page), parseInt(limit), filters);
  successResponse(res, result, 200, 'Events retrieved successfully');
});

const getEventsByBloodBank = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const { page = 1, limit = 10, status, search } = req.query;
  const filters = { status, search };
  const result = await adminService.getEventsByBloodBank(bankId, parseInt(page), parseInt(limit), filters);
  successResponse(res, result, 200, 'Blood bank events retrieved successfully');
});

const getEventById = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await adminService.getEventById(eventId);
  successResponse(res, event, 200, 'Event retrieved successfully');
});

const updateEventStatus = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { status } = req.body;
  const event = await adminService.updateEventStatus(eventId, status);
  successResponse(res, event, 200, 'Event status updated successfully');
});

// ===================== REQUESTS MANAGEMENT =====================

const getAllRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, bloodType, urgency, search, userId } = req.query;
  const filters = { status, bloodType, urgency, search, userId };
  const result = await adminService.getAllRequests(parseInt(page), parseInt(limit), filters);
  successResponse(res, result, 200, 'Blood requests retrieved successfully');
});

const getRequestById = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const request = await adminService.getRequestById(requestId);
  successResponse(res, request, 200, 'Blood request retrieved successfully');
});

const updateRequestStatus = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  const request = await adminService.updateRequestStatus(requestId, status);
  successResponse(res, request, 200, 'Blood request status updated successfully');
});

// ===================== DONATIONS MANAGEMENT =====================

const getAllDonations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, bloodType, search, userId } = req.query;
  const filters = { status, bloodType, search, userId };
  const result = await adminService.getAllDonations(parseInt(page), parseInt(limit), filters);
  successResponse(res, result, 200, 'Donations retrieved successfully');
});

const getDonationById = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const donation = await adminService.getDonationById(donationId);
  successResponse(res, donation, 200, 'Donation retrieved successfully');
});

const updateDonationStatus = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const { status } = req.body;
  const donation = await adminService.updateDonationStatus(donationId, status);
  successResponse(res, donation, 200, 'Donation status updated successfully');
});

// ===================== INVENTORY MANAGEMENT =====================

const getInventoryOverview = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, bloodType, search } = req.query;
  const filters = { bloodType, search };
  const result = await adminService.getInventoryOverview(parseInt(page), parseInt(limit), filters);
  successResponse(res, result, 200, 'Inventory retrieved successfully');
});

const getInventoryById = asyncHandler(async (req, res) => {
  const { inventoryId } = req.params;
  const result = await adminService.getInventoryById(inventoryId);
  successResponse(res, result, 200, 'Inventory details retrieved successfully');
});

// ===================== DASHBOARD STATS =====================

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  successResponse(res, stats, 200, 'Dashboard statistics retrieved successfully');
});

export { 
  isAdmin,
  exportUsers,
  exportRequests,
  exportBloodBanks,
  exportCamps,
  exportEvents,
  exportUsersCsv,
  exportRequestsCsv,
  exportBloodBanksCsv,
  exportCampsCsv,
  exportEventsCsv,
  exportAllData,
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllBloodBanks,
  getBloodBankById,
  updateBloodBankStatus,
  getAllCamps,
  getCampsByBloodBank,
  getCampById,
  updateCampStatus,
  getAllEvents,
  getEventsByBloodBank,
  getEventById,
  updateEventStatus,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  getAllDonations,
  getDonationById,
  updateDonationStatus,
  getInventoryOverview,
  getInventoryById,
  getDashboardStats,
};
