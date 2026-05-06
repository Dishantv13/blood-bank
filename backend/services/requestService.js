import requestRepository from "../repositories/RequestRepository.js";
import mongoose from "mongoose";
import {
  validateBloodRequest,
  validateBloodGroup,
} from "./validationService.js";
import {
  getPaginationParams,
  buildPaginatedResponse,
} from "../utils/pagination.js";
import { ApiError } from "../utils/apiError.js";
import { ensureValidObjectId } from "../utils/dbGuards.js";
import {
  sendRequestStatusUpdateEmail,
  sendRequestReceivedEmail,
} from "../utils/emailService.js";
import { createNotification } from "./notificationService.js";
import { notifyMatchingDonors } from "./donorMatchingService.js";
import cacheManager from "../utils/cacheManager.js";
import {
  sanitizePrivateBloodRequest,
  sanitizePublicBloodRequest,
} from "../utils/serializers.js";
import * as inventoryService from "./inventoryService.js";

// Create blood
export const createBloodRequest = async (userId, data) => {
  validateBloodRequest(data);

  const {
    patientName,
    bloodGroup,
    units,
    urgency,
    hospital,
    contactNumber,
    requiredBy,
    description,
  } = data;

  // Set default requiredBy if not provided (7 days from now)
  const requestDate = requiredBy
    ? new Date(requiredBy)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const bloodRequest = await requestRepository.create({
    requestType: "user",
    requestedBy: userId,
    patientName,
    bloodGroup,
    units: parseInt(units),
    urgency: urgency || "normal",
    hospital: hospital || { name: "", address: "" },
    contactNumber,
    requiredBy: requestDate,
    description: description || "",
  });

  cacheManager.del("admin:dashboard_stats");

  // Trigger donor matching and notification (async)
  notifyMatchingDonors(bloodRequest).catch((err) =>
    console.error("Donor notification failed:", err),
  );

  // NEW: Notify all blood banks about the new request
  const { notifyAllBloodBanks } = await import("./notificationService.js");
  notifyAllBloodBanks({
    title: "New Blood Request Posted",
    message: `A new request for ${bloodRequest.bloodGroup} has been posted for ${bloodRequest.patientName}.`,
    type: "request",
    actionUrl: `/requests/${bloodRequest._id}`,
  }).catch((err) => console.error("Blood bank notification failed:", err));

  // Populate requester info
  await bloodRequest.populate("requestedBy", "name email phone");

  return bloodRequest;
};

export const getAllBloodRequests = async (query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  // Build filter
  let filter = { requestType: "user" };

  if (query.status) filter.status = query.status;
  if (query.bloodGroup) filter.bloodGroup = query.bloodGroup;
  if (query.urgency) filter.urgency = query.urgency;

  const [requests, total] = await Promise.all([
    requestRepository.find(filter, {
      select:
        "_id patientName bloodGroup units urgency status createdAt requiredBy hospital",
      sort: { createdAt: -1 },
      skip,
      limit,
    }),
    requestRepository.count(filter),
  ]);

  const sanitizedRequests = requests.map((request) =>
    sanitizePublicBloodRequest(request),
  );
  return buildPaginatedResponse(sanitizedRequests, total, page, limit);
};

// Get user's blood requests
export const getUserRequests = async (userId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  // Optimized parallel queries
  const [requests, total] = await Promise.all([
    requestRepository.find(
      { requestedBy: userId, requestType: "user" },
      {
        select:
          "_id patientName bloodGroup units urgency status createdAt requiredBy hospital",
        sort: { createdAt: -1 },
        skip,
        limit,
      },
    ),
    requestRepository.count({ requestedBy: userId, requestType: "user" }),
  ]);

  return buildPaginatedResponse(requests, total, page, limit);
};

// Get request by ID
export const getRequestById = async (requestId, viewer = {}) => {
  ensureValidObjectId(requestId, "request id");
  const request = await requestRepository.findById(requestId, {
    populate: [
      { path: "requestedBy", select: "_id name email phone" },
      { path: "bloodBank", select: "_id name email phone address" },
      { path: "fulfillment.fulfilledBy", select: "_id name phone" },
    ],
  });

  if (!request) {
    throw new ApiError(404, "Blood request not found");
  }

  const isAdmin = viewer?.type === "admin";
  const viewerUserId = viewer?.type === "user" ? String(viewer.id || "") : null;
  const viewerBloodBankId =
    viewer?.type === "bloodbank" ? String(viewer.id || "") : null;

  // Helper to extract ID from populated or unpopulated fields
  const extractId = (field) => {
    if (!field) return "";
    return field._id ? String(field._id) : String(field);
  };

  const ownerUserId = extractId(request.requestedBy);
  const assignedBloodBankId = extractId(request.bloodBank);
  const targetBloodBankId = extractId(request.targetBloodBank);
  const requestingBloodBankId = extractId(request.requestingBloodBank);

  const canViewSensitiveDetails =
    isAdmin ||
    request.requestType === "user" || // Public requests are viewable by any authenticated user
    (viewerUserId && ownerUserId && viewerUserId === ownerUserId) ||
    (viewerBloodBankId &&
      [assignedBloodBankId, targetBloodBankId, requestingBloodBankId].includes(
        viewerBloodBankId,
      ));

  if (!canViewSensitiveDetails) {
    throw new ApiError(403, "Not authorized to view this blood request");
  }

  return sanitizePrivateBloodRequest(request);
};

// Update request (user can only update own request)
export const updateBloodRequest = async (requestId, userId, data) => {
  ensureValidObjectId(requestId, "request id");
  ensureValidObjectId(userId, "user id");

  const request = await requestRepository.findById(requestId, { lean: false });
  if (!request) {
    throw new ApiError(404, "Blood request not found");
  }

  if (request.requestedBy.toString() !== userId.toString()) {
    throw new ApiError(403, "Not authorized to update this request");
  }

  if (request.status !== "pending") {
    throw new ApiError(400, "Cannot update request that is not pending");
  }

  // Validate data if provided
  if (data.bloodGroup) validateBloodGroup(data.bloodGroup);

  const editableFields = [
    "patientName",
    "bloodGroup",
    "units",
    "urgency",
    "hospital",
    "contactNumber",
    "requiredBy",
    "description",
  ];
  editableFields.forEach((field) => {
    if (data[field] !== undefined) {
      request[field] = field === "units" ? parseInt(data[field]) : data[field];
    }
  });

  request.timeline.push({
    status: "pending",
    updatedBy: userId,
    updatedByModel: "User",
    timestamp: new Date(),
    note: "Request details updated by user.",
  });

  await request.save();
  return request;
};

// Update request status with timeline tracking
export const updateRequestStatus = async (
  requestId,
  status,
  actor,
  note = "",
) => {
  ensureValidObjectId(requestId, "request id");

  const validStatuses = [
    "pending",
    "approved",
    "in_progress",
    "fulfilled",
    "completed",
    "rejected",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const request = await requestRepository.findById(requestId, { lean: false });
  if (!request) {
    throw new ApiError(404, "Blood request not found");
  }

  const actorType = actor?.type; // 'user' or 'bloodbank'
  const actorId = actor?.id ? String(actor.id) : null;

  // Authorization and business logic constraints
  if (actorType === "user") {
    if (String(request.requestedBy) !== actorId) {
      throw new ApiError(403, "Not authorized to update this request");
    }
    if (status !== "cancelled") {
      throw new ApiError(400, "Users can only cancel their own requests");
    }
    if (["fulfilled", "completed", "rejected"].includes(request.status)) {
      throw new ApiError(
        400,
        `Cannot cancel request in ${request.status} status`,
      );
    }
  } else if (actorType === "bloodbank") {
    // Blood banks can approve/reject/fulfill requests targeting them
    if (
      request.targetBloodBank &&
      String(request.targetBloodBank) !== actorId
    ) {
      throw new ApiError(403, "Not authorized to update this request");
    }
    // If it's a general pool request, first blood bank to approve "claims" it
    if (!request.targetBloodBank && status === "approved") {
      request.bloodBank = actorId;
    }
  }

  // Inventory management based on status transition
  const oldStatus = request.status;
  const bloodGroup = request.bloodGroup;
  const units = request.units;
  const targetBankId = request.bloodBank || actorId;

  // 1. Transition TO a "committed" state (approved, fulfilled, completed)
  const isNowCommitted = ["approved", "fulfilled", "completed"].includes(
    status,
  );
  const wasCommitted = ["approved", "fulfilled", "completed"].includes(
    oldStatus,
  );

  if (isNowCommitted && !wasCommitted && actorType === "bloodbank") {
    try {
      await inventoryService.subtractInventoryUnits(
        targetBankId,
        bloodGroup,
        units,
      );
    } catch (err) {
      // If inventory fails (e.g. insufficient units), we shouldn't change the status
      throw err;
    }
  }

  // 2. Transition FROM a "committed" state to a "cancelled" or "rejected" state
  const isNowReleased = ["cancelled", "rejected"].includes(status);
  if (isNowReleased && wasCommitted && (request.bloodBank || targetBankId)) {
    await inventoryService.addInventoryUnits(
      String(request.bloodBank || targetBankId),
      bloodGroup,
      units,
    );
  }

  // Update status and timeline
  request.status = status;
  request.timeline.push({
    status: status,
    updatedBy: actorId,
    updatedByModel: actorType === "user" ? "User" : "BloodBank",
    timestamp: new Date(),
    note: note || `Status changed to ${status}`,
  });

  if (status === "rejected" && note) {
    request.bloodBankResponse = {
      status: "rejected",
      respondedAt: new Date(),
      respondedBy: actorId,
      responseNote: note,
    };
  }

  await request.save();
  await request.populate([
    { path: "requestedBy", select: "name email" },
    { path: "bloodBank", select: "name email" },
  ]);

  // Notifications
  if (request.requestedBy) {
    sendRequestStatusUpdateEmail(request.requestedBy, request, note).catch(
      (err) => console.error("Status email failed:", err),
    );

    createNotification({
      recipient: request.requestedBy._id,
      recipientModel: "User",
      title: "Blood Request Update",
      message: `Your blood request for ${request.patientName} is now ${status.replace("_", " ")}.`,
      type: "request",
      actionUrl: `/requests/${request._id}`,
    }).catch((err) => console.error("In-app notification failed:", err));
  }

  return request;
};

// Handle fulfillment details
export const fulfillRequest = async (
  requestId,
  bloodBankId,
  fulfillmentData,
) => {
  ensureValidObjectId(requestId, "request id");
  ensureValidObjectId(bloodBankId, "blood bank id");

  const request = await requestRepository.findById(requestId, { lean: false });
  if (!request) throw new ApiError(404, "Blood request not found");

  if (request.bloodBank && String(request.bloodBank) !== String(bloodBankId)) {
    throw new ApiError(403, "This request is assigned to another blood bank");
  }

  request.status = "fulfilled";
  request.fulfillment = {
    fulfilledBy: bloodBankId,
    fulfilledAt: new Date(),
    unitsProvided: fulfillmentData.unitsProvided || request.units,
    deliveryMethod: fulfillmentData.deliveryMethod || "pickup",
    notes: fulfillmentData.notes || "",
  };

  request.timeline.push({
    status: "fulfilled",
    updatedBy: bloodBankId,
    updatedByModel: "BloodBank",
    timestamp: new Date(),
    note: `Fulfillment recorded: ${request.fulfillment.unitsProvided} units via ${request.fulfillment.deliveryMethod}.`,
  });

  // UPDATE INVENTORY (Only if not already committed in a previous status like 'approved')
  const wasAlreadyCommitted = ["approved", "fulfilled", "completed"].includes(
    request.status,
  );
  const unitsToFulfill = request.fulfillment.unitsProvided || request.units;
  const bloodGroup = request.bloodGroup;

  if (!wasAlreadyCommitted) {
    // 1. Subtract from fulfilling blood bank
    await inventoryService.subtractInventoryUnits(
      bloodBankId,
      bloodGroup,
      unitsToFulfill,
    );

    // 2. If it's a bloodbank-to-bloodbank request, add to the requesting bank
    if (request.requestType === "bloodbank" && request.requestingBloodBank) {
      await inventoryService.addInventoryUnits(
        String(request.requestingBloodBank),
        bloodGroup,
        unitsToFulfill,
      );
    }
  }

  request.status = "fulfilled";
  await request.save();
  return request;
};

// Get blood bank requests
export const getBloodBankRequests = async (bloodBankId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });
  const { status, requestType, direction } = query;

  let filter = {};

  if (requestType === "user") {
    // Requests from regular users
    filter = { requestType: "user" };

    if (status === "pending") {
      // For pending, show requests assigned to this bank OR public requests (no bank assigned)
      filter.$or = [
        { bloodBank: bloodBankId },
        { bloodBank: { $exists: false } },
      ];
    } else {
      // For other statuses (approved, fulfilled, etc), only show those assigned to this bank
      filter.bloodBank = bloodBankId;
    }
  } else if (requestType === "bloodbank") {
    // Inter-bank transfers
    filter = { requestType: "bloodbank" };

    if (direction === "sent") {
      // Requests made BY this blood bank to others
      filter.requestingBloodBank = bloodBankId;
    } else {
      // Requests made TO this blood bank by others
      filter.targetBloodBank = bloodBankId;
    }
  } else {
    // Legacy/Default fallback logic: show anything related to this bank
    filter = {
      $or: [
        { targetBloodBank: bloodBankId },
        { bloodBank: bloodBankId },
        { requestingBloodBank: bloodBankId },
        { targetBloodBank: { $exists: false }, status: "pending" },
      ],
    };
  }

  // Apply status filter if provided (wrapping in $and if $or was used)
  if (status) {
    if (filter.$or) {
      filter = { $and: [filter, { status }] };
    } else {
      filter.status = status;
    }
  }

  const [requests, total] = await Promise.all([
    requestRepository.find(filter, {
      populate: [
        { path: "requestedBy", select: "name email phone" },
        { path: "requestingBloodBank", select: "name email phone" },
        { path: "targetBloodBank", select: "name email phone" },
      ],
      sort: { urgency: 1, createdAt: -1 },
      skip,
      limit,
    }),
    requestRepository.count(filter),
  ]);

  return buildPaginatedResponse(requests, total, page, limit);
};

// Get approved requests
export const getApprovedRequests = async (bloodBankId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  // Optimized parallel queries
  const [requests, total] = await Promise.all([
    requestRepository.find(
      { targetBloodBank: bloodBankId, status: "approved" },
      {
        select:
          "_id patientName bloodGroup units urgency createdAt requiredBy hospital",
        populate: { path: "requestedBy", select: "name email phone" },
        sort: { createdAt: -1 },
        skip,
        limit,
      },
    ),
    requestRepository.count({
      targetBloodBank: bloodBankId,
      status: "approved",
    }),
  ]);

  return buildPaginatedResponse(requests, total, page, limit);
};

// Get request statistics
export const getRequestStats = async (bloodBankId) => {
  const stats = await requestRepository.getStatusStats(bloodBankId);

  const formattedStats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    fulfilled: 0,
    totalUnits: 0,
  };

  stats.forEach((stat) => {
    formattedStats.total += stat.count;
    formattedStats[stat._id] = stat.count;
    formattedStats.totalUnits += stat.totalUnits || 0;
  });

  return formattedStats;
};
