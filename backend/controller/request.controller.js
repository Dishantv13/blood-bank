import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import { clearCacheByPrefix } from '../middleware/cache.js';
import * as requestService from '../services/requestService.js';
import * as broadcastService from '../services/broadcastService.js';

// Get all blood requests
export const getAllRequests = asyncHandler(async (req, res) => {
  const result = await requestService.getAllBloodRequests(req.query);
  successResponse(res, result, 200, 'All blood requests fetched successfully');
});

// Get user's blood requests
export const getMyRequests = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await requestService.getUserRequests(userId, req.query);
  successResponse(res, result, 200, 'My blood requests fetched successfully');
});

// Create a new blood request
export const createRequest = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await requestService.createBloodRequest(userId, req.body);
  clearCacheByPrefix('/api/v1/requests');
  successResponse(res, result, 201, 'Blood request created successfully');
});

// Update blood request status
export const updateRequest = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const userId = req.user.userId || req.user._id || req.user.id;
  const result = await requestService.updateBloodRequest(id, userId, req.body);
  clearCacheByPrefix('/api/v1/requests');
  successResponse(res, result, 200, 'Request updated successfully');
});

// Get request details
export const getRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await requestService.getRequestById(id);
  successResponse(res, result, 200, 'Blood request details fetched successfully');
});

// Update blood request status (for users to cancel OR blood banks to handle)
export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;
  
  const actor = req.bloodBank
    ? { type: 'bloodbank', id: req.bloodBank.bloodBankId || req.bloodBank._id || req.bloodBank.id }
    : { type: 'user', id: req.user.userId || req.user._id || req.user.id };
    
  const result = await requestService.updateRequestStatus(id, status, actor, note);
  clearCacheByPrefix('/api/v1/requests');
  successResponse(res, result, 200, `Request status updated to ${status}`);
});

// Fulfill a blood request
export const fulfillRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id || req.bloodBank.id;
    const result = await requestService.fulfillRequest(id, bloodBankId, req.body);
    successResponse(res, result, 200, 'Blood request fulfilled successfully');
});

// Get requests for blood bank
export const getBloodBankRequests = asyncHandler(async (req, res) => {
    if (!req.bloodBank) {
        return res.status(403).json({ success: false, message: 'Not authorized as a blood bank' });
    }
    const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id || req.bloodBank.id;
    const result = await requestService.getBloodBankRequests(bloodBankId, req.query);
    successResponse(res, result, 200, 'Requests fetched for blood bank successfully');
});

// Broadcast high urgency request to nearby donors
export const broadcastRequest = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { radius } = req.query;
    const result = await broadcastService.broadcastEmergencyRequest(id, radius);
    successResponse(res, result, 200, result.message);
});

