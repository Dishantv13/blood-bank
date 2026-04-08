import BloodRequest from '../models/BloodRequest.model.js';
import mongoose from 'mongoose';
import { validateBloodRequest, validateBloodGroup } from './validationService.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { ensureValidObjectId } from '../utils/dbGuards.js';

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
  ensureValidObjectId(requestId, 'request id');
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
  ensureValidObjectId(requestId, 'request id');
  ensureValidObjectId(userId, 'user id');

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
  if (data.units !== undefined) {
    const parsedUnits = Number(data.units);
    if (!Number.isInteger(parsedUnits) || parsedUnits <= 0) {
      throw new ApiError(400, 'Units must be a positive integer');
    }
  }

  const editableFields = ['patientName', 'bloodGroup', 'units', 'urgency', 'hospital', 'contactNumber', 'requiredBy', 'description'];
  const safeUpdateData = editableFields.reduce((accumulator, field) => {
    if (data[field] !== undefined) {
      accumulator[field] = field === 'units' ? Number(data[field]) : data[field];
    }
    return accumulator;
  }, {});

  if (safeUpdateData.contactNumber) {
    const normalizedPhone = String(safeUpdateData.contactNumber).replace(/\D/g, '');
    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      throw new ApiError(400, 'Contact number must be 10 digits');
    }
    safeUpdateData.contactNumber = normalizedPhone;
  }

  // Atomic update
  const updatedRequest = await BloodRequest.findByIdAndUpdate(
    requestId,
    { $set: { ...safeUpdateData, updatedAt: new Date() } },
    { new: true, runValidators: true }
  ).lean();

  return updatedRequest;
};

export const updateRequestStatus = async (requestId, status, actor) => {
  ensureValidObjectId(requestId, 'request id');

  const validStatuses = ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const request = await BloodRequest.findById(requestId)
    .select('requestType requestedBy targetBloodBank bloodBank status')
    .lean();

  if (!request) {
    throw new ApiError(404, 'Blood request not found');
  }

  const actorType = actor?.type;
  const actorId = actor?.id ? String(actor.id) : null;

  if (actorType === 'user') {
    if (!actorId || String(request.requestedBy) !== actorId) {
      throw new ApiError(403, 'Not authorized to update this request');
    }

    if (status !== 'cancelled') {
      throw new ApiError(403, 'Users can only cancel their own requests');
    }

    if (!['pending', 'approved'].includes(request.status)) {
      throw new ApiError(400, 'Request can no longer be cancelled');
    }
  } else if (actorType === 'bloodbank') {
    if (request.requestType !== 'bloodbank') {
      throw new ApiError(403, 'Blood banks cannot update user request status from this endpoint');
    }

    if (!actorId || String(request.targetBloodBank) !== actorId) {
      throw new ApiError(403, 'Not authorized to update this request');
    }

    if (!['approved', 'rejected', 'fulfilled'].includes(status)) {
      throw new ApiError(403, 'Blood banks can only approve, reject, or fulfill assigned requests');
    }
  } else {
    throw new ApiError(403, 'Request status update is not authorized');
  }

  const updatedRequest = await BloodRequest.findByIdAndUpdate(
    requestId,
    { $set: { status, updatedAt: new Date() } },
    { new: true, runValidators: true }
  ).lean();

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
