import { Router } from 'express';
import { bloodBankAuth } from '../middleware/auth.js';
import {
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
} from '../controller/bloodBankPortal.controller.js';

const router = Router();

// ==================== BLOOD REQUEST MANAGEMENT ====================

// @route   GET /api/bloodbank/requests
// @desc    Get all blood requests for blood bank (real-time, pending only)
// @access  Private (Blood Bank)
router.route('/requests').get(bloodBankAuth, getAllRequests);

// @route   POST /api/bloodbank/requests/inter-bank
// @desc    Create a bank-to-bank blood request
// @access  Private (Blood Bank)
router.route('/requests/inter-bank').post(bloodBankAuth, createBankToBankRequest);

// @route   GET /api/bloodbank/requests/approved
// @desc    Get approved blood requests by this blood bank
// @access  Private (Blood Bank)
router.route('/requests/approved').get(bloodBankAuth, getApprovedRequests);

// @route   GET /api/bloodbank/requests/stats/summary
// @desc    Get blood request statistics for dashboard
// @access  Private (Blood Bank)
router.route('/requests/stats/summary').get(bloodBankAuth, getRequestStats);

// @route   GET /api/bloodbank/requests/:id
// @desc    Get single blood request details
// @access  Private (Blood Bank)
router.route('/requests/:id').get(bloodBankAuth, getRequestDetails);

// @route   POST /api/bloodbank/requests/:id/approve
// @desc    Approve a blood request
// @access  Private (Blood Bank)
router.route('/requests/:id/approve').post(bloodBankAuth, approveRequest);

// @route   POST /api/bloodbank/requests/:id/reject
// @desc    Reject a blood request
// @access  Private (Blood Bank)
router.route('/requests/:id/reject').post(bloodBankAuth, rejectRequest);

// ==================== EVENT MANAGEMENT ====================

// @route   GET /api/bloodbank/events
// @desc    Get all events organized by this blood bank
// @access  Private (Blood Bank)
router.route('/events').get(bloodBankAuth, getAllEvents);

// @route   POST /api/bloodbank/events
// @desc    Create a new event (visible to donors and patients)
// @access  Private (Blood Bank)
router.route('/events').post(bloodBankAuth, createEvent);

// @route   PUT /api/bloodbank/events/:id
// @desc    Update an event
// @access  Private (Blood Bank)
router.route('/events/:id').put(bloodBankAuth, updateEvent);

// @route   DELETE /api/bloodbank/events/:id
// @desc    Delete/Cancel an event
// @access  Private (Blood Bank)
router.route('/events/:id').delete(bloodBankAuth, deleteEvent);

// @route   GET /api/bloodbank/events/:id/registrations
// @desc    Get all registrations for an event
// @access  Private (Blood Bank)
router.route('/events/:id/registrations').get(bloodBankAuth, getEventRegistrations);

// @route   GET /api/bloodbank/events/:id/export-registrations
// @desc    Export event registrations to Excel file
// @access  Private (Blood Bank)
router.route('/events/:id/export-registrations').get(bloodBankAuth, exportEventRegistrations);

// ==================== BLOOD CAMP MANAGEMENT ====================

// @route   GET /api/bloodbank/camps
// @desc    Get all blood camps for this blood bank
// @access  Private (Blood Bank)
router.route('/camps').get(bloodBankAuth, getAllCamps);

// @route   GET /api/bloodbank/camps/:id/registrations
// @desc    Get registrations for a specific blood camp
// @access  Private (Blood Bank)
router.route('/camps/:id/registrations').get(bloodBankAuth, getCampRegistrations);

// @route   DELETE /api/bloodbank/camps/:id/registrations/:donorId
// @desc    Remove a specific donor registration from a camp
// @access  Private (Blood Bank)
router.route('/camps/:id/registrations/:donorId').delete(bloodBankAuth, removeDonorRegistration);

// @route   GET /api/bloodbank/camps/:id/export-registrations
// @desc    Export camp registrations to Excel
// @access  Private (Blood Bank)
router.route('/camps/:id/export-registrations').get(bloodBankAuth, exportCampRegistrations);

// ==================== SETTINGS & PROFILE MANAGEMENT ====================

// @route   POST /api/bloodbank/settings/photo
// @desc    Upload blood bank photo
// @access  Private (Blood Bank)
router.route('/settings/photo').post(bloodBankAuth, uploadPhoto);

// @route   GET /api/bloodbank/settings/profile
// @desc    Get blood bank profile details
// @access  Private (Blood Bank)
router.route('/settings/profile').get(bloodBankAuth, getProfile);

// @route   PUT /api/bloodbank/settings/profile
// @desc    Update blood bank profile
// @access  Private (Blood Bank)
router.route('/settings/profile').put(bloodBankAuth, updateProfile);

// @route   PUT /api/bloodbank/settings/password
// @desc    Change blood bank password
// @access  Private (Blood Bank)
router.route('/settings/password').put(bloodBankAuth, changePassword);

// @route   GET /api/bloodbank/settings/inventory
// @desc    Get blood inventory
// @access  Private (Blood Bank)
router.route('/settings/inventory').get(bloodBankAuth, getInventory);

// @route   PUT /api/bloodbank/settings/inventory
// @desc    Update blood inventory
// @access  Private (Blood Bank)
router.route('/settings/inventory').put(bloodBankAuth, updateInventory);

// @route   PATCH /api/bloodbank/settings/inventory/:bloodGroup
// @desc    Update specific blood group units
// @access  Private (Blood Bank)
router.route('/settings/inventory/:bloodGroup').patch(bloodBankAuth, updateBloodGroupUnits);

// ==================== DASHBOARD & ANALYTICS ====================

// @route   GET /api/bloodbank/dashboard
// @desc    Get dashboard data for blood bank
// @access  Private (Blood Bank)
router.route('/dashboard').get(bloodBankAuth, getDashboard);

export default router;
