/**
 * Blood Request Service
 * All blood request management logic
 * Handles: create, update, list, filter requests
 */

import BloodRequest from '../models/BloodRequest.model.js';
import mongoose from 'mongoose';
import { validateBloodRequest, validateBloodGroup } from './validationService.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';

// Create blood request
export const createBloodRequest = async (userId, data) => {
  validateBloodRequest(data);

  const { patientName, bloodGroup, units, urgency, hospital, contactNumber, requiredBy, description } = data;

  // Set default requiredBy if not provided (7 days from now)
  const requestDate = requiredBy ? new Date(requiredBy) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const bloodRequest = new BloodRequest({
    requestType: 'user',
    requestedBy: userId,
    patientName,
    bloodGroup,
    units: parseInt(units),
    urgency: urgency || 'normal',
    hospital: hospital || { name: '', address: '' },
    contactNumber,
    requiredBy: requestDate,
    description: description || ''
  });

  await bloodRequest.save();

  // Populate requester info
  await bloodRequest.populate('requestedBy', 'name email phone');

  return bloodRequest;
};

// Get all blood requests (paginated, optimized)
export const getAllBloodRequests = async (query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  // Build filter
  let filter = { requestType: 'user' };
  
  if (query.status) filter.status = query.status;
  if (query.bloodGroup) filter.bloodGroup = query.bloodGroup;
  if (query.urgency) filter.urgency = query.urgency;

  // Optimized parallel queries
  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .select('_id patientName bloodGroup units urgency status createdAt requiredBy hospital')
      .populate('requestedBy', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BloodRequest.countDocuments(filter)
  ]);

  return buildPaginatedResponse(requests, total, page, limit);
};

// Get user's blood requests
export const getUserRequests = async (userId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  // Optimized parallel queries
  const [requests, total] = await Promise.all([
    BloodRequest.find({ requestedBy: userId, requestType: 'user' })
      .select('_id patientName bloodGroup units urgency status createdAt requiredBy hospital')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BloodRequest.countDocuments({ requestedBy: userId, requestType: 'user' })
  ]);

  return buildPaginatedResponse(requests, total, page, limit);
};

// Get request by ID
export const getRequestById = async (requestId) => {
  const request = await BloodRequest.findById(requestId)
    .select('_id patientName bloodGroup units urgency status createdAt requiredBy hospital description contactNumber bloodBankResponse')
    .populate('requestedBy', 'name email phone')
    .lean();
  
  if (!request) {
    throw new ApiError(404, 'Blood request not found');
  }

  return request;
};

// Update request (user can only update own request)
export const updateBloodRequest = async (requestId, userId, data) => {
  const request = await BloodRequest.findById(requestId)
    .select('requestedBy status')
    .lean();
  
  if (!request) {
    throw new ApiError(404, 'Blood request not found');
  }

  if (request.requestedBy.toString() !== userId.toString()) {
    throw new ApiError(403, 'Not authorized to update this request');
  }

  if (request.status !== 'pending') {
    throw new ApiError(400, 'Cannot update request that is not pending');
  }

  // Validate data if provided
  if (data.bloodGroup) validateBloodGroup(data.bloodGroup);

  // Atomic update
  const updatedRequest = await BloodRequest.findByIdAndUpdate(
    requestId,
    { $set: { ...data, updatedAt: new Date() } },
    { new: true, runValidators: true }
  ).lean();

  return updatedRequest;
};

// Update request status
export const updateRequestStatus = async (requestId, status) => {
  const validStatuses = ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const updatedRequest = await BloodRequest.findByIdAndUpdate(
    requestId,
    { $set: { status, updatedAt: new Date() } },
    { new: true, runValidators: true }
  ).lean();

  if (!updatedRequest) {
    throw new ApiError(404, 'Blood request not found');
  }

  return updatedRequest;
};

// Get blood bank requests
export const getBloodBankRequests = async (bloodBankId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  let filter = { targetBloodBank: bloodBankId };
  if (query.status) filter.status = query.status;

  // Optimized parallel queries
  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .select('_id patientName bloodGroup units urgency status createdAt requiredBy hospital')
      .populate('requestedBy', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BloodRequest.countDocuments(filter)
  ]);

  return buildPaginatedResponse(requests, total, page, limit);
};

// Get approved requests
export const getApprovedRequests = async (bloodBankId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  // Optimized parallel queries
  const [requests, total] = await Promise.all([
    BloodRequest.find({ targetBloodBank: bloodBankId, status: 'approved' })
      .select('_id patientName bloodGroup units urgency createdAt requiredBy hospital')
      .populate('requestedBy', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BloodRequest.countDocuments({ targetBloodBank: bloodBankId, status: 'approved' })
  ]);

  return buildPaginatedResponse(requests, total, page, limit);
};

// Get request statistics
export const getRequestStats = async (bloodBankId) => {
  const stats = await BloodRequest.aggregate([
    { $match: { targetBloodBank: new mongoose.Types.ObjectId(bloodBankId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalUnits: { $sum: '$units' }
      }
    }
  ]);

  const formattedStats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    fulfilled: 0,
    totalUnits: 0
  };

  stats.forEach(stat => {
    formattedStats.total += stat.count;
    formattedStats[stat._id] = stat.count;
    formattedStats.totalUnits += stat.totalUnits || 0;
  });

  return formattedStats;
};
