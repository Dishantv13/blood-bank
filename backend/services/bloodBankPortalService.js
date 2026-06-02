import mongoose from "mongoose";
import requestRepository from "../repositories/RequestRepository.js";
import bloodBankRepository from "../repositories/BloodBankRepository.js";
import bloodCampRepository from "../repositories/BloodCampRepository.js";
import eventRepository from "../repositories/EventRepository.js";
import inventoryRepository from "../repositories/InventoryRepository.js";
import { ApiError } from "../utils/apiError.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import { BLOOD_GROUPS } from "../validations/validation.constants.js";
import { invalidateBloodBankCaches } from "../utils/cacheInvalidation.js";
import { toObjectId } from "../utils/dbGuards.js";
import * as bloodBankManager from "./bloodBankManagerService.js";
import * as auditService from "./auditService.js";
import * as pagination from "../utils/pagination.js";
import * as cloudinary from "../utils/cloudinary.js";
import * as inventoryService from "./inventoryService.js";

const buildBloodBankAddress = (address = {}) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  return [
    address.street,
    address.city,
    address.state,
    address.pincode || address.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
};

export const getAllRequests = async (bloodBankId, query) => {
  const {
    status = "pending",
    bloodGroup,
    urgency,
    requestType,
    direction,
    limit,
    page,
    search,
  } = query;
  const normalizedStatus = String(status).toLowerCase();
  const isPending = normalizedStatus === "pending";
  const responseStatuses = isPending ? ["pending", null] : [normalizedStatus];
  const directionFilter =
    direction === "sent" || direction === "received" ? direction : "all";
  const objectId = toObjectId(bloodBankId);

  const requestScopes = [];
  const includeUserRequests = requestType !== "bloodbank";
  const includeBloodBankRequests = requestType !== "user";

  if (includeUserRequests) {
    const userScope = {
      requestType: "user",
      "bloodBankResponse.status": { $in: responseStatuses },
    };

    if (!isPending) {
      userScope.bloodBank = objectId;
    }

    requestScopes.push(userScope);
  }

  if (includeBloodBankRequests) {
    const interBankScope = {
      requestType: "bloodbank",
      "bloodBankResponse.status": { $in: responseStatuses },
    };

    if (directionFilter === "sent") {
      interBankScope.requestingBloodBank = objectId;
    } else if (directionFilter === "received") {
      interBankScope.targetBloodBank = objectId;
    } else {
      interBankScope.$or = [
        { targetBloodBank: objectId },
        { requestingBloodBank: objectId },
      ];
    }

    requestScopes.push(interBankScope);
  }

  const filter = {
    status: isPending ? "pending" : normalizedStatus,
    $or: requestScopes,
  };

  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (urgency) filter.urgency = urgency;

  if (search) {
    const searchRegex = new RegExp(search, "i");
    const existingOr = filter.$or;
    delete filter.$or;
    filter.$and = [
      { $or: existingOr },
      {
        $or: [
          { patientName: searchRegex },
          { "hospital.name": searchRegex },
          { "hospital.address": searchRegex },
          { description: searchRegex },
          { bloodGroup: searchRegex },
        ],
      },
    ];
  }

  const {
    page: parsedPage,
    limit: parsedLimit,
    skip,
  } = pagination.getPaginationParams({ query: { page, limit } });

  const { data: requests, total } = await requestRepository.findPaginated(
    filter,
    {
      sort: { urgency: -1, createdAt: -1 },
      skip,
      limit: parsedLimit,
    },
  );

  if (requests.length > 0) {
    await requestRepository.model.populate(requests, [
      { path: "requestedBy", select: "name email phone bloodGroup" },
      { path: "requestingBloodBank", select: "name email phone address" },
      { path: "targetBloodBank", select: "name email phone address" },
    ]);
  }

  return pagination.buildPaginatedResponse(
    requests,
    total,
    parsedPage,
    parsedLimit,
  );
};

export const getApprovedRequests = async (bloodBankId, query) => {
  const { requestType, direction, limit, page, search } = query;

  const approvedQuery = {
    status: "approved",
    $or: [
      { requestType: "user", bloodBank: toObjectId(bloodBankId) },
      {
        requestType: "bloodbank",
        $or: [
          { targetBloodBank: toObjectId(bloodBankId) },
          { requestingBloodBank: toObjectId(bloodBankId) },
        ],
      },
    ],
  };

  if (requestType === "user" || requestType === "bloodbank") {
    approvedQuery.$or = approvedQuery.$or.filter(
      (entry) => entry.requestType === requestType,
    );
  }

  const directionFilter =
    direction === "sent" || direction === "received" ? direction : "all";
  if (directionFilter !== "all") {
    approvedQuery.$or = approvedQuery.$or
      .map((entry) => {
        if (entry.requestType !== "bloodbank" || !entry.$or) return entry;
        const scoped = { ...entry };
        scoped.$or = scoped.$or.filter((condition) =>
          directionFilter === "sent"
            ? Object.prototype.hasOwnProperty.call(
                condition,
                "requestingBloodBank",
              )
            : Object.prototype.hasOwnProperty.call(
                condition,
                "targetBloodBank",
              ),
        );
        if (!scoped.$or.length) return null;
        return scoped;
      })
      .filter(Boolean);
  }
  if (search) {
    const searchRegex = new RegExp(search, "i");
    const existingOr = approvedQuery.$or;
    delete approvedQuery.$or;
    approvedQuery.$and = [
      { $or: existingOr },
      {
        $or: [
          { patientName: searchRegex },
          { "hospital.name": searchRegex },
          { "hospital.address": searchRegex },
          { description: searchRegex },
          { bloodGroup: searchRegex },
        ],
      },
    ];
  }

  const {
    page: parsedPage,
    limit: parsedLimit,
    skip,
  } = pagination.getPaginationParams({ query: { page, limit } });

  const { data: requests, total } = await requestRepository.findPaginated(
    approvedQuery,
    {
      sort: {
        "bloodBankResponse.respondedAt": -1,
        updatedAt: -1,
        createdAt: -1,
      },
      skip,
      limit: parsedLimit,
    },
  );

  if (requests.length > 0) {
    await requestRepository.model.populate(requests, [
      { path: "requestedBy", select: "name email phone bloodGroup" },
      { path: "requestingBloodBank", select: "name email phone address" },
      { path: "targetBloodBank", select: "name email phone address" },
    ]);
  }

  return pagination.buildPaginatedResponse(
    requests,
    total,
    parsedPage,
    parsedLimit,
  );
};

export const getRequestDetails = async (id, requesterBankId) => {
  const request = await requestRepository.findById(id, {
    populate: [
      { path: "requestedBy", select: "name email phone bloodGroup address" },
      { path: "requestingBloodBank", select: "name email phone address" },
      { path: "targetBloodBank", select: "name email phone address" },
      { path: "bloodBankResponse.respondedBy", select: "name" },
    ],
  });

  if (!request) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Request not found");

  // SECURITY FIX: IDOR Prevention
  // 1. Pending requests are public for all blood banks to see/act upon.
  if (request.status === "pending") return request;

  // 2. For non-pending requests, the requester must be involved.
  const isTargetBank =
    String(request.targetBloodBank?._id || request.targetBloodBank) ===
    String(requesterBankId);
  const isRequestingBank =
    String(request.requestingBloodBank?._id || request.requestingBloodBank) ===
    String(requesterBankId);
  const isAssignedBank =
    String(request.bloodBank?._id || request.bloodBank) ===
    String(requesterBankId);

  if (!isTargetBank && !isRequestingBank && !isAssignedBank) {
    throw new ApiError(
      HTTPS_CODE.FORBIDDEN,
      "You are not authorized to view the details of this non-pending request.",
    );
  }

  return request;
};

export const createBankToBankRequest = async (requestingBankId, data) => {
  const { targetBloodBankId, bloodGroup, units, urgency, description } = data;
  if (!targetBloodBankId || !bloodGroup || !units) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      "Target blood bank, blood group, and units are required",
    );
  }
  if (String(requestingBankId) === String(targetBloodBankId)) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      "You cannot request blood from your own blood bank",
    );
  }

  const [requestingBank, targetBloodBank] = await Promise.all([
    bloodBankRepository.findById(requestingBankId),
    bloodBankRepository.findById(targetBloodBankId),
  ]);

  if (!requestingBank || !targetBloodBank)
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood bank not found");

  const request = await requestRepository.create({
    requestType: "bloodbank",
    requestingBloodBank: requestingBankId,
    targetBloodBank: targetBloodBankId,
    patientName: requestingBank.name,
    bloodGroup,
    units: parseInt(units, 10),
    urgency: urgency || "normal",
    hospital: {
      name: requestingBank.name,
      address: buildBloodBankAddress(requestingBank.address),
    },
    contactNumber: requestingBank.phone,
    description:
      description || `Inventory request sent to ${targetBloodBank.name}`,
    bloodBankResponse: { status: "pending" },
  });

  await requestRepository.model.populate(request, [
    { path: "requestingBloodBank", select: "name email phone address" },
    { path: "targetBloodBank", select: "name email phone address" },
  ]);
  return request;
};

export const approveRequest = async (
  requestId,
  responderBankId,
  responseNote,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await requestRepository.findById(requestId, {
      lean: false,
      session,
    });
    if (!request) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Request not found");
    if (request.status !== "pending")
      throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Request is no longer pending");

    if (request.requestType === "bloodbank") {
      if (String(request.targetBloodBank) !== String(responderBankId)) {
        throw new ApiError(
          HTTPS_CODE.FORBIDDEN,
          "You can only approve requests sent to your blood bank",
        );
      }
      await inventoryService.subtractInventoryUnits(
        responderBankId,
        request.bloodGroup,
        request.units,
        session,
      );
      await inventoryService.addInventoryUnits(
        request.requestingBloodBank,
        request.bloodGroup,
        request.units,
        session,
      );
    } else {
      await inventoryService.subtractInventoryUnits(
        responderBankId,
        request.bloodGroup,
        request.units,
        session,
      );
    }

    request.status = "approved";
    request.bloodBank = responderBankId;
    request.bloodBankResponse = {
      status: "approved",
      respondedAt: new Date(),
      respondedBy: responderBankId,
      responseNote:
        responseNote || "Request approved. Please contact us for collection.",
    };

    await request.save({ session });

    await auditService.logAction({
      action: "BLOOD_REQUEST_APPROVED",
      actorId: responderBankId,
      actorModel: "BloodBank",
      targetId: request._id,
      targetModel: "BloodRequest",
      changes: { status: "approved" },
      metadata: {
        requestType: request.requestType,
        bloodGroup: request.bloodGroup,
        units: request.units,
      },
    });

    await session.commitTransaction();

    await request.populate([
      { path: "requestedBy", select: "name email phone" },
      { path: "requestingBloodBank", select: "name email phone address" },
      { path: "targetBloodBank", select: "name email phone address" },
      { path: "bloodBank", select: "name phone email address" },
    ]);

    return request;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const rejectRequest = async (requestId, bloodBankId, responseNote) => {
  const request = await requestRepository.findById(requestId, { lean: false });
  if (!request) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Request not found");
  if (request.status !== "pending")
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Request is no longer pending");
  if (
    request.requestType === "bloodbank" &&
    String(request.targetBloodBank) !== String(bloodBankId)
  ) {
    throw new ApiError(
      HTTPS_CODE.FORBIDDEN,
      "You can only reject requests sent to your blood bank",
    );
  }

  request.status = "rejected";
  request.bloodBank = bloodBankId;
  request.bloodBankResponse = {
    status: "rejected",
    respondedAt: new Date(),
    respondedBy: bloodBankId,
    responseNote:
      responseNote || "Unable to fulfill this request at this time.",
  };
  await request.save();

  await auditService.logAction({
    action: "BLOOD_REQUEST_REJECTED",
    actorId: bloodBankId,
    actorModel: "BloodBank",
    targetId: request._id,
    targetModel: "BloodRequest",
    changes: { status: "rejected" },
    metadata: { reason: responseNote },
  });

  await request.populate([
    { path: "requestedBy", select: "name email phone" },
    { path: "requestingBloodBank", select: "name email phone address" },
    { path: "targetBloodBank", select: "name email phone address" },
    { path: "bloodBank", select: "name phone email" },
  ]);

  return request;
};

export const getRequestStats = async (bloodBankId) => {
  const stats = await requestRepository.getFacetedStats(bloodBankId);

  return {
    total: stats[0].total[0]?.count || 0,
    pending: stats[0].pending[0]?.count || 0,
    approved: stats[0].approved[0]?.count || 0,
    rejected: stats[0].rejected[0]?.count || 0,
    byBloodGroup: stats[0].byBloodGroup,
    byUrgency: stats[0].byUrgency,
  };
};

export const getAllEvents = async (bloodBankId, query = {}) => {
  const { time, search, page, limit } = query;
  const organizerId = toObjectId(bloodBankId);
  const filter = { organizedBy: organizerId };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get counts for both regardless of current filter
  const [upcomingCount, pastCount] = await Promise.all([
    eventRepository.count({ organizedBy: organizerId, date: { $gte: today } }),
    eventRepository.count({ organizedBy: organizerId, date: { $lt: today } }),
  ]);

  if (time === "upcoming") {
    filter.date = { $gte: today };
  } else if (time === "past") {
    filter.date = { $lt: today };
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  const {
    page: parsedPage,
    limit: parsedLimit,
    skip,
  } = pagination.getPaginationParams({ query: { page, limit } });

  const { data: events, total } = await eventRepository.findPaginated(filter, {
    populate: {
      path: "registeredDonors",
      select: "name email phone bloodGroup",
    },
    sort: { date: time === "past" ? -1 : 1 },
    skip,
    limit: parsedLimit,
  });

  return {
    events,
    pagination: {
      ...pagination.getPaginationMetadata(parsedPage, parsedLimit, total),
      upcomingCount,
      pastCount,
    },
  };
};

export const createEvent = async (bloodBankId, eventData) => {
  const bloodBank = await bloodBankRepository.findById(bloodBankId);
  if (!bloodBank) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood bank not found");

  const event = await eventRepository.create({
    ...eventData,
    organizer: bloodBank.name,
    organizedBy: bloodBankId,
    organizerModel: "BloodBank",
    visibility: eventData.visibility || "public",
  });
  return event;
};

export const updateEvent = async (eventId, bloodBankId, payload) => {
  const event = await eventRepository.findOne(
    { _id: eventId, organizedBy: bloodBankId },
    { lean: false },
  );
  if (!event) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Event not found or unauthorized");

  const allowedUpdates = [
    "title",
    "description",
    "eventType",
    "location",
    "date",
    "startTime",
    "endTime",
    "contactInfo",
    "expectedDonors",
    "isActive",
    "visibility",
    "maxParticipants",
  ];

  allowedUpdates.forEach((field) => {
    if (payload[field] !== undefined) event[field] = payload[field];
  });

  await event.save();
  return event;
};

export const deleteEvent = async (eventId, bloodBankId) => {
  const event = await eventRepository.deleteOne({
    _id: eventId,
    organizedBy: bloodBankId,
  });
  if (!event) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Event not found or unauthorized");
  return { success: true };
};

export const getEventRegistrations = async (eventId, bloodBankId) => {
  const event = await eventRepository.findOne(
    { _id: eventId, organizedBy: bloodBankId },
    {
      populate: {
        path: "registeredDonors",
        select:
          "name email phone bloodGroup address lastDonationDate isDonor donorInfo",
      },
    },
  );

  if (!event) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Event not found or unauthorized");

  return {
    event: { title: event.title, date: event.date, location: event.location },
    registrations: event.registeredDonors,
    count: event.registeredDonors.length,
  };
};

export const getAllCamps = async (bloodBankId, query = {}) => {
  const { tab, time, search, page, limit } = query;
  const organizerId = toObjectId(bloodBankId);
  const filter = { organizer: organizerId };

  // Date Logic for Filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get counts
  const [upcomingCount, pastCount] = await Promise.all([
    bloodCampRepository.count({
      organizer: organizerId,
      date: { $gte: today },
      status: { $ne: "completed" },
    }),
    bloodCampRepository.count({
      organizer: organizerId,
      $or: [{ date: { $lt: today } }, { status: "completed" }],
    }),
  ]);

  if (time === "upcoming") {
    filter.date = { $gte: today };
    filter.status = { $ne: "completed" };
  } else if (time === "past") {
    filter.$or = [{ date: { $lt: today } }, { status: "completed" }];
  } else if (tab === "registrations") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Only Today's camps
    filter.date = { $gte: today, $lt: tomorrow };
  } else if (tab === "collections") {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Past and Today's camps (<= Today)
    filter.date = { $lt: tomorrow };
  }

  if (search) {
    const searchFilter = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { venue: { $regex: search, $options: "i" } },
      ],
    };
    if (filter.$or) {
      const originalOr = filter.$or;
      delete filter.$or;
      filter.$and = [{ $or: originalOr }, searchFilter];
    } else {
      Object.assign(filter, searchFilter);
    }
  }

  const {
    page: parsedPage,
    limit: parsedLimit,
    skip,
  } = pagination.getPaginationParams({ query: { page, limit } });

  const { data: camps, total } = await bloodCampRepository.findPaginated(
    filter,
    {
      sort: { date: time === "past" ? -1 : 1 },
      skip,
      limit: parsedLimit,
    },
  );
  return {
    camps,
    pagination: {
      ...pagination.getPaginationMetadata(parsedPage, parsedLimit, total),
      upcomingCount,
      pastCount,
    },
  };
};

export const getCampRegistrations = async (campId, bloodBankId) => {
  const camp = await bloodCampRepository.findOne({
    _id: campId,
    organizer: bloodBankId,
  });
  if (!camp) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood camp not found or unauthorized");

  return {
    camp: {
      name: camp.name,
      date: camp.date,
      venue: camp.venue,
      city: camp.city,
    },
    registrations: camp.registeredDonors,
    count: camp.registeredDonors.length,
  };
};

export const removeDonorRegistration = async (
  campId,
  bloodBankId,
  donorIdToRemove,
) => {
  const camp = await bloodCampRepository.findOne(
    { _id: campId, organizer: bloodBankId },
    { lean: false },
  );
  if (!camp) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood camp not found or unauthorized");

  const initialLength = camp.registeredDonors.length;
  camp.registeredDonors = camp.registeredDonors.filter((donor) => {
    const donorSubdocId = donor._id ? donor._id.toString() : null;
    const donorUserId = donor.donor ? donor.donor.toString() : null;
    return donorSubdocId !== donorIdToRemove && donorUserId !== donorIdToRemove;
  });

  if (camp.registeredDonors.length === initialLength) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Donor registration not found");
  }

  await camp.save();
  return { remainingRegistrations: camp.registeredDonors.length };
};

export const uploadPhoto = async (bloodBankId, localFilePath) => {
  if (!localFilePath) throw new ApiError(HTTPS_CODE.BAD_REQUEST, "No file path provided");

  const bloodBank = await bloodBankRepository.findById(bloodBankId, {
    lean: false,
  });
  if (!bloodBank) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood bank not found");

  if (bloodBank.profileImagePublicId) {
    await cloudinary.deleteFromCloudinary(bloodBank.profileImagePublicId);
  }

  const cloudinaryResponse = await cloudinary.uploadOnCloudinary(
    localFilePath,
    "blood-bank/profiles",
  );

  if (!cloudinaryResponse) {
    throw new ApiError(HTTPS_CODE.INTERNAL_SERVER_ERROR, "Failed to upload photo to Cloudinary");
  }

  bloodBank.profileImage = cloudinaryResponse.secure_url;
  bloodBank.profileImagePublicId = cloudinaryResponse.public_id;

  await bloodBank.save();

  return {
    photo: bloodBank.profileImage,
    publicId: cloudinaryResponse.public_id,
  };
};

export const getDashboard = async (bloodBankId) => {
  const bloodBank = await bloodBankRepository.findById(bloodBankId, {
    select: "name inventory",
  });
  if (!bloodBank) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood bank not found");

  const [requestStats, eventStats] = await Promise.all([
    requestRepository.getDashboardStats(bloodBankId),
    eventRepository.getEventStats(bloodBankId),
  ]);

  return {
    bloodBank: { name: bloodBank.name, inventory: bloodBank.inventory },
    requests: {
      pending: requestStats[0].pending[0]?.count || 0,
      approved: requestStats[0].approved[0]?.count || 0,
      thisMonth: requestStats[0].thisMonth[0]?.count || 0,
    },
    events: {
      total: eventStats[0].total[0]?.count || 0,
      upcoming: eventStats[0].upcoming[0]?.count || 0,
      totalRegistrations: eventStats[0].totalRegistrations[0]?.count || 0,
    },
  };
};

export const getProfile = (bloodBankId) =>
  bloodBankManager.getProfile(bloodBankId);

export const updateProfile = (bloodBankId, payload) =>
  bloodBankManager.updateProfile(bloodBankId, payload);

export const changePassword = (bloodBankId, currentPassword, newPassword) =>
  bloodBankManager.changePassword(bloodBankId, currentPassword, newPassword);

export const getInventory = async (bloodBankId) => {
  const inventory = await inventoryRepository.findOne({
    bloodBank: bloodBankId,
  });

  if (!inventory) {
    const defaultItems = BLOOD_GROUPS.map((group) => ({
      bloodGroup: group,
      units: 0,
      lastUpdated: new Date(),
    }));
    return {
      bloodBank: { id: bloodBankId },
      inventory: defaultItems,
    };
  }

  // Sanitize items: remove internal MongoDB _id and include components
  const sanitizedItems = (inventory.items || []).map((item) => ({
    bloodGroup: item.bloodGroup,
    units: item.units,
    components: (item.components || []).map(c => ({
      componentType: c.componentType,
      units: c.units,
      lastUpdated: c.lastUpdated
    })),
    lastUpdated: item.lastUpdated,
  }));

  return {
    bloodBank: {
      id: inventory.bloodBank,
      name: inventory.bloodBankName,
    },
    inventory: sanitizedItems,
  };
};

export const updateInventory = async (bloodBankId, inventory) => {
  if (!Array.isArray(inventory))
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Inventory must be an array");

  const validatedInventory = inventory.map((item) => ({
    bloodGroup: item.bloodGroup || item.type,
    units: parseInt(item.units, 10) || 0,
    lastUpdated: new Date(),
  }));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let doc = await inventoryRepository.findOne(
      { bloodBank: bloodBankId },
      { lean: false, session },
    );
    if (!doc) {
      const bloodBank = await bloodBankRepository.findById(bloodBankId, {
        session,
      });
      if (!bloodBank) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood bank not found");

      doc = await inventoryRepository.create(
        [
          {
            bloodBank: bloodBankId,
            bloodBankName: bloodBank.name,
            items: validatedInventory,
          },
        ],
        { session },
      );
      doc = doc[0];
    } else {
      doc.items = validatedInventory;
      doc.markModified("items");
      await doc.save({ session });
    }

    await auditService.logAction(
      {
        action: "INVENTORY_UPDATED",
        actorId: bloodBankId,
        actorModel: "BloodBank",
        targetId: doc._id,
        targetModel: "Inventory",
        changes: { inventoryCount: validatedInventory.length },
        metadata: { inventory: validatedInventory },
      },
      { session },
    );

    await session.commitTransaction();
    invalidateBloodBankCaches(bloodBankId);
    return doc.items;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const updateBloodGroupUnits = async (bloodBankId, bloodGroup, units) => {
  if (units === undefined || units < 0)
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Please provide valid units (>=0)");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const inventory = await inventoryRepository.findOne(
      { bloodBank: bloodBankId },
      { lean: false, session },
    );
    if (!inventory) throw new ApiError(HTTPS_CODE.NOT_FOUND, "Inventory record not found");

    const itemIndex = inventory.items.findIndex(
      (item) => item.bloodGroup === bloodGroup,
    );
    const oldUnits = itemIndex > -1 ? inventory.items[itemIndex].units : 0;

    if (itemIndex > -1) {
      inventory.items[itemIndex].units = units;
      inventory.items[itemIndex].lastUpdated = new Date();
    } else {
      inventory.items.push({ bloodGroup, units, lastUpdated: new Date() });
    }

    await inventory.save({ session });

    await auditService.logAction(
      {
        action: "BLOOD_GROUP_UNITS_UPDATED",
        actorId: bloodBankId,
        actorModel: "BloodBank",
        targetId: inventory._id,
        targetModel: "Inventory",
        changes: { bloodGroup, oldUnits, newUnits: units },
        metadata: { bloodGroup, units },
      },
      { session },
    );

    await session.commitTransaction();
    invalidateBloodBankCaches(bloodBankId);
    return inventory.items;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
