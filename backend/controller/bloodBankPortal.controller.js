import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as bloodBankPortalService from '../services/bloodBankPortalService.js';

const getBloodBankId = (req) => req.bloodBank.bloodBankId || req.bloodBank._id;

const getAllRequests = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getAllRequests(getBloodBankId(req), req.query);
  successResponse(res, result, 200, 'Requests fetched successfully');
});

const getApprovedRequests = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getApprovedRequests(getBloodBankId(req), req.query);
  successResponse(res, result, 200, 'Approved requests fetched successfully');
});

const getRequestDetails = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getRequestDetails(req.params.id);
  successResponse(res, result, 200, 'Request details fetched successfully');
});

const createBankToBankRequest = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.createBankToBankRequest(getBloodBankId(req), req.body);
  successResponse(res, result, 201, 'Blood request sent to the selected blood bank');
});

const approveRequest = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.approveRequest(req.params.id, getBloodBankId(req), req.body.responseNote);
  successResponse(res, result, 200, 'Blood request approved successfully');
});

const rejectRequest = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.rejectRequest(req.params.id, getBloodBankId(req), req.body.responseNote);
  successResponse(res, result, 200, 'Blood request rejected');
});

const getRequestStats = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getRequestStats(getBloodBankId(req));
  successResponse(res, result, 200, 'Request stats fetched successfully');
});

const getAllEvents = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getAllEvents(getBloodBankId(req));
  successResponse(res, result, 200, 'Events fetched successfully');
});

const createEvent = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.createEvent(getBloodBankId(req), req.body);
  successResponse(res, result, 201, 'Event created successfully and is now visible to users');
});

const updateEvent = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.updateEvent(req.params.id, getBloodBankId(req), req.body);
  successResponse(res, result, 200, 'Event updated successfully');
});

const deleteEvent = asyncHandler(async (req, res) => {
  await bloodBankPortalService.deleteEvent(req.params.id, getBloodBankId(req));
  successResponse(res, null, 200, 'Event deleted successfully');
});

const getEventRegistrations = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getEventRegistrations(req.params.id, getBloodBankId(req), req.query);
  successResponse(res, result, 200, 'Event registrations fetched successfully');
});

const exportEventRegistrations = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.exportEventRegistrations(req.params.id, getBloodBankId(req));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
  res.send(Buffer.from(result.buffer));
});

const getAllCamps = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getAllCamps(getBloodBankId(req));
  successResponse(res, result, 200, 'Camps fetched successfully');
});

const getCampRegistrations = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getCampRegistrations(req.params.id, getBloodBankId(req));
  successResponse(res, result, 200, 'Camp registrations fetched successfully');
});

const removeDonorRegistration = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.removeDonorRegistration(req.params.id, getBloodBankId(req), req.params.donorId);
  successResponse(res, result, 200, 'Donor registration removed successfully');
});

const exportCampRegistrations = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.exportCampRegistrations(req.params.id, getBloodBankId(req));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`);
  res.send(Buffer.from(result.buffer));
});

const uploadPhoto = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.uploadPhoto(getBloodBankId(req), req.body.photo);
  successResponse(res, result, 200, 'Photo uploaded successfully');
});

const getDashboard = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getDashboard(getBloodBankId(req));
  successResponse(res, result, 200, 'Dashboard data fetched successfully');
});

const getProfile = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getProfile(getBloodBankId(req));
  successResponse(res, result, 200, 'Profile fetched successfully');
});

const updateProfile = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.updateProfile(getBloodBankId(req), req.body);
  successResponse(res, result, 200, 'Profile updated successfully');
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.changePassword(
    getBloodBankId(req),
    req.body.currentPassword,
    req.body.newPassword
  );
  successResponse(res, result, 200, 'Password changed successfully');
});

const getInventory = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.getInventory(getBloodBankId(req));
  successResponse(res, result, 200, 'Inventory fetched successfully');
});

const updateInventory = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.updateInventory(getBloodBankId(req), req.body.inventory);
  successResponse(res, result, 200, 'Inventory updated successfully');
});

const updateBloodGroupUnits = asyncHandler(async (req, res) => {
  const result = await bloodBankPortalService.updateBloodGroupUnits(
    getBloodBankId(req),
    req.params.bloodGroup,
    req.body.units
  );
  successResponse(res, result, 200, `${req.params.bloodGroup} inventory updated`);
});

export {
  getAllRequests,
  getApprovedRequests,
  getRequestDetails,
  createBankToBankRequest,
  approveRequest,
  rejectRequest,
  getRequestStats,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,
  exportEventRegistrations,
  getAllCamps,
  getCampRegistrations,
  removeDonorRegistration,
  exportCampRegistrations,
  uploadPhoto,
  getDashboard,
  getProfile,
  updateProfile,
  changePassword,
  getInventory,
  updateInventory,
  updateBloodGroupUnits
};