import mongoose from "mongoose";
import requestRepository from "../repositories/RequestRepository.js";
import cacheManager from "../utils/cacheManager.js";
import { ApiError } from "../utils/apiError.js";
import { ensureValidObjectId, toObjectId } from "../utils/dbGuards.js";
import { invalidateBloodBankCaches } from "../utils/cacheInvalidation.js";
import * as validationService from "./validationService.js";
import * as pagination from "../utils/pagination.js";
import * as emailService from "../utils/emailService.js";
import * as notificationService from "./notificationService.js";
import * as donorMatchingService from "./donorMatchingService.js";
import * as serializers from "../utils/serializers.js";
import * as inventoryService from "./inventoryService.js";

// Create blood
export const createBloodRequest = async (userId, data) => {
  validationService.validateBloodRequest(data);

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
  donorMatchingService
    .notifyMatchingDonors(bloodRequest)
    .catch((err) => console.error("Donor notification failed:", err));

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
  const { page, limit, skip } = pagination.getPaginationParams({ query });

  // Build filter
  let filter = { requestType: "user" };

  if (query.status) filter.status = query.status;
  if (query.bloodGroup) filter.bloodGroup = query.bloodGroup;
  if (query.urgency) filter.urgency = query.urgency;

  const { data: requests, total } = await requestRepository.findPaginated(
    filter,
    {
      sort: { createdAt: -1 },
      skip,
      limit,
    },
  );

  const sanitizedRequests = requests.map((request) =>
    serializers.sanitizePublicBloodRequest(request),
  );
  return pagination.buildPaginatedResponse(
    sanitizedRequests,
    total,
    page,
    limit,
  );
};

// Get user's blood requests
export const getUserRequests = async (userId, query) => {
  const { page, limit, skip } = pagination.getPaginationParams({ query });
  const objectId = toObjectId(userId);

  const { data: requests, total } = await requestRepository.findPaginated(
    { requestedBy: objectId, requestType: "user" },
    {
      sort: { createdAt: -1 },
      skip,
      limit,
    },
  );

  return pagination.buildPaginatedResponse(requests, total, page, limit);
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

  return serializers.sanitizePrivateBloodRequest(request);
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
  if (data.bloodGroup) validationService.validateBloodGroup(data.bloodGroup);

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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (isNowCommitted && !wasCommitted && actorType === "bloodbank") {
      await inventoryService.subtractInventoryUnits(
        targetBankId,
        bloodGroup,
        units,
        session,
      );

      // Inter-bank: Add units to the requesting blood bank
      if (request.requestType === "bloodbank" && request.requestingBloodBank) {
        await inventoryService.addInventoryUnits(
          String(request.requestingBloodBank),
          bloodGroup,
          units,
          session,
        );
      }
    }

    // 2. Transition FROM a "committed" state to a "cancelled" or "rejected" state
    const isNowReleased = ["cancelled", "rejected"].includes(status);
    if (isNowReleased && wasCommitted && (request.bloodBank || targetBankId)) {
      await inventoryService.addInventoryUnits(
        String(request.bloodBank || targetBankId),
        bloodGroup,
        units,
        session,
      );

      // Inter-bank: Subtract units from the requesting blood bank if it was previously committed
      if (request.requestType === "bloodbank" && request.requestingBloodBank) {
        await inventoryService.subtractInventoryUnits(
          String(request.requestingBloodBank),
          bloodGroup,
          units,
          session,
        );
      }
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

    await request.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
  await request.populate([
    { path: "requestedBy", select: "name email" },
    { path: "bloodBank", select: "name email" },
  ]);

  // Proactively clear blood bank detail caches to ensure fresh inventory is shown
  await invalidateBloodBankCaches(targetBankId || request.bloodBank);
  if (request.requestingBloodBank) {
    const requesterId = String(
      request.requestingBloodBank._id || request.requestingBloodBank,
    );
    await invalidateBloodBankCaches(requesterId);
  }

  // Notifications
  if (request.requestedBy) {
    emailService
      .sendRequestStatusUpdateEmail(request.requestedBy, request, note)
      .catch((err) => console.error("Status email failed:", err));

    notificationService
      .createNotification({
        recipient: request.requestedBy._id,
        recipientModel: "User",
        title: "Blood Request Update",
        message: `Your blood request for ${request.patientName} is now ${status.replace("_", " ")}.`,
        type: "request",
        actionUrl: `/requests/${request._id}`,
      })
      .catch((err) => console.error("In-app notification failed:", err));
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

  const oldStatus = request.status;
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
    oldStatus,
  );
  const unitsToFulfill = request.fulfillment.unitsProvided || request.units;
  const bloodGroup = request.bloodGroup;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!wasAlreadyCommitted) {
      // 1. Subtract from fulfilling blood bank
      await inventoryService.subtractInventoryUnits(
        bloodBankId,
        bloodGroup,
        unitsToFulfill,
        session,
      );

      // 2. If it's a bloodbank-to-bloodbank request, add to the requesting bank
      if (request.requestType === "bloodbank" && request.requestingBloodBank) {
        await inventoryService.addInventoryUnits(
          String(request.requestingBloodBank),
          bloodGroup,
          unitsToFulfill,
          session,
        );
      }
    }
    await request.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  // Proactively clear blood bank detail caches
  try {
    const { clearCacheByPrefix } = await import("../middleware/cache.js");
    const { invalidatePublicBloodBanksCache } =
      await import("./bloodBankService.js");

    await invalidatePublicBloodBanksCache();
    await clearCacheByPrefix(String(bloodBankId));

    if (request.requestType === "bloodbank" && request.requestingBloodBank) {
      const requesterId = String(
        request.requestingBloodBank._id || request.requestingBloodBank,
      );
      await clearCacheByPrefix(requesterId);
    }
    cacheManager.del("admin:dashboard_stats");
  } catch (cacheErr) {
    console.error(
      "[Cache] Invalidation failed after fulfillment:",
      cacheErr.message,
    );
  }

  return request;
};

// Get blood bank requests
export const getBloodBankRequests = async (bloodBankId, query) => {
  const { page, limit, skip } = pagination.getPaginationParams({ query });
  const objectId = toObjectId(bloodBankId);
  const { status, requestType, direction } = query;

  let filter = {};

  if (requestType === "user") {
    // Requests from regular users
    filter = { requestType: "user" };

    if (status === "pending") {
      // For pending, show requests assigned to this bank OR public requests (no bank assigned)
      filter.$or = [
        { bloodBank: objectId },
        { bloodBank: { $exists: false } },
        { bloodBank: null },
      ];
    } else {
      // For other statuses (approved, fulfilled, etc), only show those assigned to this bank
      filter.bloodBank = objectId;
    }
  } else if (requestType === "bloodbank") {
    // Inter-bank transfers
    filter = { requestType: "bloodbank" };

    if (direction === "sent") {
      // Requests made BY this blood bank to others
      filter.requestingBloodBank = objectId;
    } else {
      // Requests made TO this blood bank by others
      filter.targetBloodBank = objectId;
    }
  } else {
    // Legacy/Default fallback logic: show anything related to this bank
    filter = {
      $or: [
        { targetBloodBank: objectId },
        { bloodBank: objectId },
        { requestingBloodBank: objectId },
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

  const { data: requests, total } = await requestRepository.findPaginated(
    filter,
    {
      sort: { urgency: 1, createdAt: -1 },
      skip,
      limit,
    },
  );

  if (requests.length > 0) {
    await requestRepository.model.populate(requests, [
      { path: "requestedBy", select: "name email phone" },
      { path: "requestingBloodBank", select: "name email phone" },
      { path: "targetBloodBank", select: "name email phone" },
    ]);
  }

  return pagination.buildPaginatedResponse(requests, total, page, limit);
};

// Get approved requests
export const getApprovedRequests = async (bloodBankId, query) => {
  const { page, limit, skip } = pagination.getPaginationParams({ query });

  const { data: requests, total } = await requestRepository.findPaginated(
    { targetBloodBank: toObjectId(bloodBankId), status: "approved" },
    {
      sort: { createdAt: -1 },
      skip,
      limit,
    },
  );

  if (requests.length > 0) {
    await requestRepository.model.populate(requests, {
      path: "requestedBy",
      select: "name email phone",
    });
  }

  return pagination.buildPaginatedResponse(requests, total, page, limit);
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
