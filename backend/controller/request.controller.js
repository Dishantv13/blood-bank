import { validationResult } from 'express-validator';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import * as requestService from '../services/requestService.js';

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
  successResponse(res, result, 200, 'Request updated successfully');
});

// Update blood request status (for users to cancel OR blood banks to approve/decline)
export const updateRequestStatus = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;
  const actor = req.bloodBank
    ? { type: 'bloodbank', id: req.bloodBank.bloodBankId || req.bloodBank._id || req.bloodBank.id }
    : { type: 'user', id: req.user.userId || req.user._id || req.user.id };
  const result = await requestService.updateRequestStatus(id, status, actor);
  successResponse(res, result, 200, `Request ${status} successfully`);
});

