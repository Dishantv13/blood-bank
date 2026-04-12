import BloodRequest from '../models/BloodRequest.model.js';
import mongoose from 'mongoose';
import { validateBloodRequest, validateBloodGroup } from './validationService.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { ensureValidObjectId } from '../utils/dbGuards.js';
import { sendRequestStatusUpdateEmail, sendRequestReceivedEmail } from '../utils/emailService.js';
import { createNotification } from './notificationService.js';
import { notifyMatchingDonors } from './donorMatchingService.js';

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

  // Trigger donor matching and notification (async)
  notifyMatchingDonors(bloodRequest).catch(err => console.error('Donor notification failed:', err));

  // Populate requester info
  await bloodRequest.populate('requestedBy', 'name email phone');

  return bloodRequest;
};

export const getAllBloodRequests = async (query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  // Build filter
  let filter = { requestType: 'user' };
  
  if (query.status) filter.status = query.status;
  if (query.bloodGroup) filter.bloodGroup = query.bloodGroup;
  if (query.urgency) filter.urgency = query.urgency;

  // Sorting: Urgency first (critical > urgent > normal), then creation date
  const sort = {
    urgency: 1, // We'll need a collation or map if we want custom ordering, 
                // but since normal < urgent < critical alphabetically is not what we want,
                // we'll handle this with a custom weight if needed, or just stay with createdAt for now.
    createdAt: -1
  };

  // Optimized parallel queries
  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .select('_id patientName bloodGroup units urgency status createdAt requiredBy hospital')
      .populate('requestedBy', 'name email phone')
      .sort({ createdAt: -1 }) // Urgency sorting usually needs a numeric weight field
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
    .populate('requestedBy', 'name email phone')
    .populate('bloodBank', 'name email phone address')
    .populate('fulfillment.fulfilledBy', 'name phone')
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

  const request = await BloodRequest.findById(requestId);
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
  
  const editableFields = ['patientName', 'bloodGroup', 'units', 'urgency', 'hospital', 'contactNumber', 'requiredBy', 'description'];
  editableFields.forEach(field => {
      if (data[field] !== undefined) {
          request[field] = field === 'units' ? parseInt(data[field]) : data[field];
      }
  });

  request.timeline.push({
      status: 'pending',
      updatedBy: userId,
      updatedByModel: 'User',
      timestamp: new Date(),
      note: 'Request details updated by user.'
  });

  await request.save();
  return request;
};

// Update request status with timeline tracking
export const updateRequestStatus = async (requestId, status, actor, note = '') => {
  ensureValidObjectId(requestId, 'request id');

  const validStatuses = ['pending', 'approved', 'in_progress', 'fulfilled', 'completed', 'rejected', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const request = await BloodRequest.findById(requestId);
  if (!request) {
    throw new ApiError(404, 'Blood request not found');
  }

  const actorType = actor?.type; // 'user' or 'bloodbank'
  const actorId = actor?.id ? String(actor.id) : null;

  // Authorization and business logic constraints
  if (actorType === 'user') {
    if (String(request.requestedBy) !== actorId) {
      throw new ApiError(403, 'Not authorized to update this request');
    }
    if (status !== 'cancelled') {
        throw new ApiError(400, 'Users can only cancel their own requests');
    }
    if (['fulfilled', 'completed', 'rejected'].includes(request.status)) {
        throw new ApiError(400, `Cannot cancel request in ${request.status} status`);
    }
  } else if (actorType === 'bloodbank') {
      // Blood banks can approve/reject/fulfill requests targeting them
      if (request.targetBloodBank && String(request.targetBloodBank) !== actorId) {
          throw new ApiError(403, 'Not authorized to update this request');
      }
      // If it's a general pool request, first blood bank to approve "claims" it
      if (!request.targetBloodBank && status === 'approved') {
          request.bloodBank = actorId;
      }
  }

  // Update status and timeline
  request.status = status;
  request.timeline.push({
    status: status,
    updatedBy: actorId,
    updatedByModel: actorType === 'user' ? 'User' : 'BloodBank',
    timestamp: new Date(),
    note: note || `Status changed to ${status}`
  });

  if (status === 'rejected' && note) {
      request.bloodBankResponse = {
          status: 'rejected',
          respondedAt: new Date(),
          respondedBy: actorId,
          responseNote: note
      };
  }

  await request.save();
  await request.populate([
      { path: 'requestedBy', select: 'name email' },
      { path: 'bloodBank', select: 'name email' }
  ]);

  // Notifications
  if (request.requestedBy) {
    sendRequestStatusUpdateEmail(request.requestedBy, request, note).catch(err => console.error('Status email failed:', err));
    
    createNotification({
      recipient: request.requestedBy._id,
      recipientModel: 'User',
      title: 'Blood Request Update',
      message: `Your blood request for ${request.patientName} is now ${status.replace('_', ' ')}.`,
      type: 'request',
      actionUrl: `/requests/${request._id}`
    }).catch(err => console.error('In-app notification failed:', err));
  }

  return request;
};

// Handle fulfillment details
export const fulfillRequest = async (requestId, bloodBankId, fulfillmentData) => {
    ensureValidObjectId(requestId, 'request id');
    ensureValidObjectId(bloodBankId, 'blood bank id');

    const request = await BloodRequest.findById(requestId);
    if (!request) throw new ApiError(404, 'Blood request not found');

    if (request.bloodBank && String(request.bloodBank) !== String(bloodBankId)) {
        throw new ApiError(403, 'This request is assigned to another blood bank');
    }

    request.status = 'fulfilled';
    request.fulfillment = {
        fulfilledBy: bloodBankId,
        fulfilledAt: new Date(),
        unitsProvided: fulfillmentData.unitsProvided || request.units,
        deliveryMethod: fulfillmentData.deliveryMethod || 'pickup',
        notes: fulfillmentData.notes || ''
    };

    request.timeline.push({
        status: 'fulfilled',
        updatedBy: bloodBankId,
        updatedByModel: 'BloodBank',
        timestamp: new Date(),
        note: `Fulfillment recorded: ${request.fulfillment.unitsProvided} units via ${request.fulfillment.deliveryMethod}.`
    });

    await request.save();
    return request;
};

// Get blood bank requests
export const getBloodBankRequests = async (bloodBankId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  let filter = { 
    $or: [
        { targetBloodBank: bloodBankId },
        { bloodBank: bloodBankId },
        { targetBloodBank: { $exists: false }, status: 'pending' } // Public pool
    ]
  };
  
  if (query.status) {
      filter.status = query.status;
  }

  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .populate('requestedBy', 'name email phone')
      .sort({ urgency: 1, createdAt: -1 })
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
