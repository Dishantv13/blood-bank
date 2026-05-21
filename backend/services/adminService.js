import ExcelJS from "exceljs";
import mongoose from "mongoose";
import userRepository from "../repositories/UserRepository.js";
import requestRepository from "../repositories/RequestRepository.js";
import bloodBankRepository from "../repositories/BloodBankRepository.js";
import bloodCampRepository from "../repositories/BloodCampRepository.js";
import eventRepository from "../repositories/EventRepository.js";
import donationRepository from "../repositories/DonationRepository.js";
import inventoryRepository from "../repositories/InventoryRepository.js";
import cacheManager from "../utils/cacheManager.js";
import { ApiError } from "../utils/apiError.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import { ensureValidObjectId, toObjectId } from "../utils/dbGuards.js";
import * as bloodBankService from "./bloodBankService.js";
import * as pagination from "../utils/pagination.js";
import * as auditService from "./auditService.js";
import * as serializers from "../utils/serializers.js";
import * as exportHelper from "../utils/exportHelper.js";

// Prevents ReDoS attacks by escaping regex characters and trimming input.
const escapeRegex = (raw, maxLen = 100) =>
  String(raw || "")
    .substring(0, maxLen)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Builds a safe $or search filter with regex-escaped terms.
const buildSafeSearchFilter = (rawSearch, fields) => {
  if (!rawSearch || typeof rawSearch !== "string" || !rawSearch.trim())
    return null;
  const escaped = escapeRegex(rawSearch);
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: escaped, $options: "i" },
    })),
  };
};

export const exportUsers = async () => {
  const users = await userRepository.find(
    {},
    {
      select: serializers.USER_SAFE_FIELDS,
      limit: exportHelper.MAX_EXPORT_ROWS,
    },
  );
  const rowsLimited = users.length === exportHelper.MAX_EXPORT_ROWS;
  const rows = users.map((user) => ({
    Name: exportHelper.csvSafe(user.name),
    Email: exportHelper.csvSafe(user.email),
    Phone: user.phone || "N/A",
    BloodGroup: user.bloodGroup || "N/A",
    Role: user.role,
    IsDonor: user.isDonor ? "Yes" : "No",
    CreatedAt: new Date(user.createdAt).toLocaleDateString(),
  }));
  return {
    buffer: await exportHelper.buildWorkbookBuffer("Users", rows),
    filename: "users.xlsx",
    rowsLimited,
  };
};

export const exportRequests = async () => {
  const requests = await requestRepository.find(
    {},
    {
      populate: [
        { path: "requestedBy", select: "name email phone" },
        { path: "bloodBank", select: "name phone" },
        { path: "requestingBloodBank", select: "name phone" },
      ],
      limit: exportHelper.MAX_EXPORT_ROWS,
    },
  );
 
  const rowsLimited = requests.length === exportHelper.MAX_EXPORT_ROWS;
  const rows = requests.map((req) => {
    let requesterName = "Unknown";
    if (req.requestType === "user") {
      requesterName = req.requestedBy?.name || "Unknown User";
    } else if (req.requestType === "bloodbank") {
      requesterName = req.requestingBloodBank?.name || "Unknown Blood Bank";
    }

    return {
      RequestId: req._id.toString(),
      RequesterName: exportHelper.csvSafe(requesterName),
      BloodGroup: req.bloodGroup,
      Units: req.units,
      BloodBank: exportHelper.csvSafe(req.bloodBank?.name || "N/A"),
      Status: req.status,
      Urgency: req.urgency,
      RequiredBy: req.requiredBy
        ? new Date(req.requiredBy).toLocaleDateString()
        : "N/A",
    };
  });

  return {
    buffer: await exportHelper.buildWorkbookBuffer("Requests", rows),
    filename: "blood_requests.xlsx",
    rowsLimited,
  };
};

export const exportBloodBanks = async () => {
  const banks = await bloodBankRepository.find(
    {},
    {
      select: serializers.BLOOD_BANK_SAFE_FIELDS,
      limit: exportHelper.MAX_EXPORT_ROWS,
    },
  );
  const rowsLimited = banks.length === exportHelper.MAX_EXPORT_ROWS;
  const rows = banks.map((bank) => ({
    Name: exportHelper.csvSafe(bank.name),
    Email: exportHelper.csvSafe(bank.email),
    Phone: bank.phone,
    LicenseNumber: bank.licenseNumber,
    City: bank.address?.city || "N/A",
    State: bank.address?.state || "N/A",
    ApprovalStatus: bank.approvalStatus || "pending",
    CreatedAt: new Date(bank.createdAt).toLocaleDateString(),
  }));

  return {
    buffer: await exportHelper.buildWorkbookBuffer("BloodBanks", rows),
    filename: "blood_banks.xlsx",
    rowsLimited,
  };
};

export const exportCamps = async () => {
  const camps = await bloodCampRepository.find(
    {},
    {
      populate: { path: "organizer", select: "name email phone" },
      limit: exportHelper.MAX_EXPORT_ROWS,
    },
  );
  const rowsLimited = camps.length === exportHelper.MAX_EXPORT_ROWS;
  const rows = camps.map((camp) => ({
    CampName: exportHelper.csvSafe(camp.name),
    Organizer: exportHelper.csvSafe(
      camp.organizerName || camp.organizer?.name || "Unknown",
    ),
    Date: camp.date ? new Date(camp.date).toLocaleDateString() : "N/A",
    Venue: exportHelper.csvSafe(camp.venue),
    City: exportHelper.csvSafe(camp.city),
    Status: camp.status,
  }));

  return {
    buffer: await exportHelper.buildWorkbookBuffer("BloodCamps", rows),
    filename: "blood_camps.xlsx",
    rowsLimited,
  };
};

export const exportEvents = async () => {
  const events = await eventRepository.find(
    {},
    { limit: exportHelper.MAX_EXPORT_ROWS },
  );
  const rowsLimited = events.length === exportHelper.MAX_EXPORT_ROWS;
  const rows = events.map((event) => ({
    Title: exportHelper.csvSafe(event.title),
    Date: event.date ? new Date(event.date).toLocaleDateString() : "N/A",
    Organizer: exportHelper.csvSafe(event.organizer),
    EventType: event.eventType,
    Visibility: event.visibility,
    Active: event.isActive ? "Yes" : "No",
  }));

  return {
    buffer: await exportHelper.buildWorkbookBuffer("Events", rows),
    filename: "events.xlsx",
    rowsLimited,
  };
};

// All-in-One Export
export const exportAllData = async (res) => {
  const getCursors = () => ({
    users: userRepository.model
      .find({})
      .select("name email phone bloodGroup isAvailable isDonor createdAt")
      .cursor(),
    requests: requestRepository.model
      .find({})
      .select("patientName bloodGroup units hospital status urgency createdAt requestType requestedBy requestingBloodBank bloodBank")
      .populate("requestedBy", "name")
      .populate("requestingBloodBank", "name")
      .populate("bloodBank", "name")
      .cursor(),
    banks: bloodBankRepository.model
      .find({})
      .select("name email phone licenseNumber address approvalStatus createdAt")
      .cursor(),
    camps: bloodCampRepository.model
      .find({})
      .select("name organizerName venue city date status createdAt")
      .cursor(),
    events: eventRepository.model
      .find({})
      .select("title eventType date location isActive createdAt")
      .cursor(),
  });

  // XLSX format – one sheet per collection using stream
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const cursors = getCursors();

  const userSheet = workbook.addWorksheet("Users");
  userSheet
    .addRow([
      "Name",
      "Email",
      "Phone",
      "BloodGroup",
      "Status",
      "IsDonor",
      "CreatedAt",
    ])
    .commit();
  for await (const u of cursors.users) {
    userSheet
      .addRow([
        exportHelper.csvSafe(u.name),
        exportHelper.csvSafe(u.email),
        u.phone || "N/A",
        u.bloodGroup || "N/A",
        u.isAvailable ? "active" : "inactive",
        u.isDonor ? "Yes" : "No",
        new Date(u.createdAt).toLocaleDateString(),
      ])
      .commit();
  }
  userSheet.commit();

  const requestSheet = workbook.addWorksheet("Requests");
  requestSheet
    .addRow([
      "RequestId",
      "RequesterName",
      "PatientName",
      "BloodGroup",
      "Units",
      "Hospital",
      "BloodBank",
      "Status",
      "Urgency",
      "RequestedAt",
    ])
    .commit();
  for await (const r of cursors.requests) {
    let requesterName = "Unknown";
    if (r.requestType === "user") {
      requesterName = r.requestedBy?.name || "Unknown User";
    } else if (r.requestType === "bloodbank") {
      requesterName = r.requestingBloodBank?.name || "Unknown Blood Bank";
    }

    requestSheet
      .addRow([
        r._id.toString(),
        exportHelper.csvSafe(requesterName),
        exportHelper.csvSafe(r.patientName),
        r.bloodGroup,
        r.units,
        exportHelper.csvSafe(r.hospital?.name || r.hospital?.address || "N/A"),
        exportHelper.csvSafe(r.bloodBank?.name || "N/A"),
        r.status,
        r.urgency,
        new Date(r.createdAt).toLocaleDateString(),
      ])
      .commit();
  }
  requestSheet.commit();

  const bankSheet = workbook.addWorksheet("BloodBanks");
  bankSheet
    .addRow([
      "Name",
      "Email",
      "Phone",
      "LicenseNumber",
      "City",
      "State",
      "Status",
      "CreatedAt",
    ])
    .commit();
  for await (const b of cursors.banks) {
    bankSheet
      .addRow([
        exportHelper.csvSafe(b.name),
        exportHelper.csvSafe(b.email),
        b.phone || "N/A",
        b.licenseNumber || "N/A",
        exportHelper.csvSafe(b.address?.city || "N/A"),
        exportHelper.csvSafe(b.address?.state || "N/A"),
        b.approvalStatus || "pending",
        new Date(b.createdAt).toLocaleDateString(),
      ])
      .commit();
  }
  bankSheet.commit();

  const campSheet = workbook.addWorksheet("Camps");
  campSheet
    .addRow(["Name", "Organizer", "Venue", "City", "Date", "Status"])
    .commit();
  for await (const c of cursors.camps) {
    campSheet
      .addRow([
        exportHelper.csvSafe(c.name),
        exportHelper.csvSafe(c.organizerName || "N/A"),
        exportHelper.csvSafe(c.venue || "N/A"),
        exportHelper.csvSafe(c.city || "N/A"),
        c.date ? new Date(c.date).toLocaleDateString() : "N/A",
        c.status,
      ])
      .commit();
  }
  campSheet.commit();

  const eventSheet = workbook.addWorksheet("Events");
  eventSheet
    .addRow(["Title", "EventType", "Date", "Location", "Active"])
    .commit();
  for await (const e of cursors.events) {
    eventSheet
      .addRow([
        exportHelper.csvSafe(e.title),
        e.eventType || "N/A",
        e.date ? new Date(e.date).toLocaleDateString() : "N/A",
        exportHelper.csvSafe(e.location?.name || e.location?.address || "N/A"),
        e.isActive ? "Yes" : "No",
      ])
      .commit();
  }
  eventSheet.commit();

  await workbook.commit();
};

// Users Management

export const getAllUsers = async (page = 1, limit = 10, filters = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;
  const query = {};

  const ALLOWED_STATUS_VALUES = ["active", "inactive", "suspended"];
  const ALLOWED_BLOOD_TYPES = [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
  ];

  if (filters.status && ALLOWED_STATUS_VALUES.includes(filters.status)) {
    if (filters.status === "active") query.isAvailable = true;
    if (filters.status === "inactive" || filters.status === "suspended")
      query.isAvailable = false;
  }

  if (filters.bloodType && ALLOWED_BLOOD_TYPES.includes(filters.bloodType)) {
    query.bloodGroup = filters.bloodType;
  }

  if (filters.search && typeof filters.search === "string") {
    const escapedSearch = filters.search
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .substring(0, 100);
    query.$or = [
      { name: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { phone: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const result = await userRepository.getAllUsersPaginated({
    query,
    skip,
    limit: safeLimit,
  });
  const users = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return pagination.buildPaginatedResponse(users, total, safePage, safeLimit);
};

export const getUserById = async (userId) => {
  const user = await userRepository.findById(userId, {
    select: serializers.USER_SAFE_FIELDS,
    lean: true,
  });

  if (!user) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "User not found");
  }

  return serializers.sanitizeUser(user);
};

export const updateUserStatus = async (userId, status) => {
  ensureValidObjectId(userId, "user id");
  const validStatuses = ["active", "inactive", "suspended"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const isAvailable = status === "active";

  const user = await userRepository.updateOne(
    { _id: userId },
    { isAvailable, updatedAt: new Date() },
    { returnDocument: "after" },
  );

  if (!user) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "User not found");
  }

  invalidateDashboardStats();
  return user;
};

// Blood Banks Management

const ALLOWED_APPROVAL_STATUSES = ["pending", "approved", "rejected"];
const ALLOWED_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const ALLOWED_CAMP_STATUSES = ["active", "completed", "cancelled"];
const ALLOWED_EVENT_STATUSES = [
  "scheduled",
  "ongoing",
  "completed",
  "cancelled",
];
const ALLOWED_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "fulfilled",
  "cancelled",
];
const ALLOWED_URGENCY = [
  "high",
  "medium",
  "low",
  "critical",
  "urgent",
  "normal",
];
const ALLOWED_DONATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "completed",
];

export const getAllBloodBanks = async (page = 1, limit = 10, filters = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;
  const query = {};

  if (filters.status && ALLOWED_APPROVAL_STATUSES.includes(filters.status)) {
    query.approvalStatus = filters.status;
  }
  const searchFilter = buildSafeSearchFilter(filters.search, [
    "name",
    "email",
    "address.city",
  ]);
  if (searchFilter) Object.assign(query, searchFilter);

  const result = await bloodBankRepository.getAllBloodBanksPaginated({
    query,
    skip,
    limit: safeLimit,
  });
  const banks = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return pagination.buildPaginatedResponse(banks, total, safePage, safeLimit);
};

export const getBloodBankById = async (bankId) => {
  ensureValidObjectId(bankId, "blood bank id");
  const [bank, inventory] = await Promise.all([
    bloodBankRepository.findById(bankId, {
      select: serializers.BLOOD_BANK_SAFE_FIELDS,
      lean: true,
    }),
    inventoryRepository.findByBloodBank(bankId),
  ]);

  if (!bank) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood bank not found");
  }

  const sanitizedBank = serializers.sanitizeBloodBank(bank);

  return {
    ...sanitizedBank,
    registrationNumber: bank.registrationNumber || bank.licenseNumber || "",
    inventory: inventory?.items || [],
  };
};

export const updateBloodBankStatus = async (
  bankId,
  status,
  reviewContext = {},
) => {
  const validStatuses = ["pending", "approved", "rejected"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const bank = await bloodBankRepository.findById(bankId, { lean: false });

  if (!bank) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood bank not found");
  }

  const reviewer =
    reviewContext.reviewedBy ||
    reviewContext.adminEmail ||
    reviewContext.adminName ||
    "admin";

  if (status === "rejected") {
    const rejectionReason = String(reviewContext.rejectionReason || "").trim();
    if (!rejectionReason) {
      throw new ApiError(
        HTTPS_CODE.BAD_REQUEST,
        "Rejection reason is required when rejecting a blood bank",
      );
    }

    bank.approvalStatus = "rejected";
    bank.isActive = false;
    bank.isVerified = false;
    bank.rejectionReason = rejectionReason;
    bank.reviewedAt = new Date();
    bank.reviewedBy = reviewer;
    await bank.save();

    await auditService.logAction({
      action: "BLOOD_BANK_REJECTED",
      actorId: reviewContext.adminId, // Will fallback to ctx if req provided
      actorModel: "Admin",
      targetId: bank._id,
      targetModel: "BloodBank",
      changes: { approvalStatus: "rejected", rejectionReason },
      metadata: { reviewer },
    });

    await bloodBankService.sendBloodBankRegistrationRejectedEmail(
      bank,
      rejectionReason,
    );
    bloodBankService.invalidatePublicBloodBanksCache();
    invalidateDashboardStats();
    return bank.toObject();
  }

  if (status === "approved") {
    bank.approvalStatus = "approved";
    bank.isActive = true;
    bank.isVerified = true;
    bank.rejectionReason = "";
    bank.reviewedAt = new Date();
    bank.reviewedBy = reviewer;
    await bank.save();

    await auditService.logAction({
      action: "BLOOD_BANK_APPROVED",
      actorId: reviewContext.adminId,
      actorModel: "Admin",
      targetId: bank._id,
      targetModel: "BloodBank",
      changes: { approvalStatus: "approved" },
      metadata: { reviewer },
    });

    await bloodBankService.sendBloodBankRegistrationApprovedEmail(bank);
    bloodBankService.invalidatePublicBloodBanksCache();
    invalidateDashboardStats();
    return bank.toObject();
  }

  bank.approvalStatus = "pending";
  bank.isActive = false;
  bank.isVerified = false;
  bank.rejectionReason = "";
  bank.reviewedAt = new Date();
  bank.reviewedBy = reviewer;
  await bank.save();
  bloodBankService.invalidatePublicBloodBanksCache();

  return bank.toObject();
};

// Blood Camps Management

export const getAllCamps = async (page = 1, limit = 10, filters = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;
  const query = {};

  if (filters.status && ALLOWED_CAMP_STATUSES.includes(filters.status))
    query.status = filters.status;
  if (
    filters.bloodBankId &&
    mongoose.Types.ObjectId.isValid(filters.bloodBankId)
  )
    query.organizer = toObjectId(filters.bloodBankId);
  const searchFilter = buildSafeSearchFilter(filters.search, [
    "name",
    "venue",
    "city",
    "address",
    "organizerName",
  ]);
  if (searchFilter) Object.assign(query, searchFilter);

  const result = await bloodCampRepository.getAllCampsPaginated({
    query,
    skip,
    limit: safeLimit,
  });
  const camps = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return pagination.buildPaginatedResponse(camps, total, safePage, safeLimit);
};

export const getCampsByBloodBank = async (
  bankId,
  page = 1,
  limit = 10,
  filters = {},
) => {
  const skip = (page - 1) * limit;
  const query = { organizer: toObjectId(bankId) };

  if (filters.status && ALLOWED_CAMP_STATUSES.includes(filters.status))
    query.status = filters.status;
  const searchFilter = buildSafeSearchFilter(filters.search, [
    "name",
    "venue",
    "city",
    "address",
  ]);
  if (searchFilter) Object.assign(query, searchFilter);

  const [camps, total] = await Promise.all([
    bloodCampRepository.find(query, {
      select:
        "_id name organizer organizerName venue city address date status createdAt",
      skip,
      limit,
      sort: { date: -1 },
    }),
    bloodCampRepository.count(query),
  ]);
  const normalizedCamps = camps.map((camp) => ({
    _id: camp._id,
    name: camp.name,
    bloodBankId: camp.organizer,
    bloodBankName: camp.organizerName || "-",
    location:
      [camp.venue, camp.city].filter(Boolean).join(", ") || camp.address || "-",
    startDate: camp.date,
    endDate: camp.date,
    status: camp.status,
    createdAt: camp.createdAt,
  }));

  return pagination.buildPaginatedResponse(normalizedCamps, total, page, limit);
};

export const getCampById = async (campId) => {
  const camp = await bloodCampRepository.findById(campId, { lean: true });

  if (!camp) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood camp not found");
  }

  invalidateDashboardStats();
  return camp;
};

export const updateCampStatus = async (campId, status) => {
  const validStatuses = ["active", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const camp = await bloodCampRepository.updateOne(
    { _id: campId },
    { status, updatedAt: new Date() },
    { returnDocument: "after" },
  );

  if (!camp) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood camp not found");
  }

  invalidateDashboardStats();
  return camp;
};

// Events Management

export const getAllEvents = async (page = 1, limit = 10, filters = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;
  const query = {};

  if (
    filters.bloodBankId &&
    mongoose.Types.ObjectId.isValid(filters.bloodBankId)
  ) {
    query.organizerModel = "BloodBank";
    query.organizedBy = toObjectId(filters.bloodBankId);
  }

  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  if (filters.status && ALLOWED_EVENT_STATUSES.includes(filters.status)) {
    if (filters.status === "cancelled") query.isActive = false;
    if (filters.status === "scheduled") {
      query.isActive = true;
      query.date = { $gt: now };
    }
    if (filters.status === "ongoing") {
      query.isActive = true;
      query.date = { $gte: todayStart, $lt: todayEnd };
    }
    if (filters.status === "completed") {
      query.isActive = true;
      query.date = { $lt: todayStart };
    }
  }

  const eventsSearchFilter = buildSafeSearchFilter(filters.search, [
    "title",
    "description",
    "location.name",
    "location.address",
  ]);
  if (eventsSearchFilter) Object.assign(query, eventsSearchFilter);

  const result = await eventRepository.getAllEventsPaginated({
    query,
    skip,
    limit: safeLimit,
  });
  const events = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return pagination.buildPaginatedResponse(events, total, safePage, safeLimit);
};

export const getEventsByBloodBank = async (
  bankId,
  page = 1,
  limit = 10,
  filters = {},
) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;
  const query = {
    organizerModel: "BloodBank",
    organizedBy: toObjectId(bankId),
  };

  if (filters.status) {
    const now = new Date();
    if (filters.status === "cancelled") query.isActive = false;
    if (filters.status === "scheduled") {
      query.isActive = true;
      query.date = { $gt: now };
    }
    if (filters.status === "ongoing") {
      query.isActive = true;
      query.date = {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      };
    }
    if (filters.status === "completed") {
      query.isActive = true;
      query.date = {
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      };
    }
  }
  const bloodBankEventsSearchFilter = buildSafeSearchFilter(filters.search, [
    "title",
    "description",
    "location.name",
    "location.address",
  ]);
  if (bloodBankEventsSearchFilter)
    Object.assign(query, bloodBankEventsSearchFilter);

  const result = await eventRepository.getAllEventsPaginated({
    query,
    skip,
    limit: safeLimit,
  });
  const events = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return pagination.buildPaginatedResponse(events, total, safePage, safeLimit);
};

export const getEventById = async (eventId) => {
  const event = await eventRepository.findById(eventId);

  if (!event) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Event not found");
  }

  invalidateDashboardStats();
  return event;
};

export const updateEventStatus = async (eventId, status) => {
  const validStatuses = ["scheduled", "ongoing", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const event = await eventRepository.updateOne(
    { _id: eventId },
    { status, updatedAt: new Date() },
    { returnDocument: "after" },
  );

  if (!event) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Event not found");
  }

  invalidateDashboardStats();
  return event;
};

// Blood Requests Management

export const getAllRequests = async (page = 1, limit = 10, filters = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;
  const query = {};

  if (filters.status && ALLOWED_REQUEST_STATUSES.includes(filters.status))
    query.status = filters.status;
  if (filters.bloodType && ALLOWED_BLOOD_GROUPS.includes(filters.bloodType))
    query.bloodGroup = filters.bloodType;
  if (filters.userId && mongoose.Types.ObjectId.isValid(filters.userId))
    query.requestedBy = toObjectId(filters.userId);
  if (
    filters.requestType &&
    ["user", "bloodbank"].includes(filters.requestType)
  )
    query.requestType = filters.requestType;
  if (filters.urgency && ALLOWED_URGENCY.includes(filters.urgency)) {
    const urgencyMap = { high: "critical", medium: "urgent", low: "normal" };
    query.urgency = urgencyMap[filters.urgency] || filters.urgency;
  }
  const requestsSearchFilter = buildSafeSearchFilter(filters.search, [
    "patientName",
    "hospital.name",
    "hospital.address",
  ]);
  if (requestsSearchFilter) Object.assign(query, requestsSearchFilter);

  const result = await requestRepository.getAllRequestsPaginated({
    query,
    skip,
    limit: safeLimit,
  });
  const requests = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return pagination.buildPaginatedResponse(
    requests,
    total,
    safePage,
    safeLimit,
  );
};

export const getRequestById = async (requestId) => {
  const request = await requestRepository.findById(requestId);

  if (!request) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood request not found");
  }

  return request;
};

export const updateRequestStatus = async (requestId, status) => {
  const validStatuses = [
    "pending",
    "approved",
    "rejected",
    "fulfilled",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const request = await requestRepository.updateOne(
    { _id: requestId },
    { status, updatedAt: new Date() },
    { returnDocument: "after" },
  );

  if (!request) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood request not found");
  }

  invalidateDashboardStats();
  return request;
};

// Donations Management

export const getAllDonations = async (page = 1, limit = 10, filters = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const matchStage = {};
  if (filters.status && ALLOWED_DONATION_STATUSES.includes(filters.status))
    matchStage.status = filters.status;
  if (filters.bloodType && ALLOWED_BLOOD_GROUPS.includes(filters.bloodType))
    matchStage.bloodGroup = filters.bloodType;
  if (filters.userId && mongoose.Types.ObjectId.isValid(filters.userId)) {
    matchStage.donor = toObjectId(filters.userId);
  }

  const result = await donationRepository.getAllDonationsPaginated({
    matchStage,
    skip,
    limit: safeLimit,
    searchQuery: filters.search,
  });
  const donations = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;

  return pagination.buildPaginatedResponse(
    donations,
    total,
    safePage,
    safeLimit,
  );
};

export const getDonationById = async (donationId) => {
  const donation = await donationRepository.findById(donationId, {
    lean: true,
  });

  if (!donation) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Donation record not found");
  }

  return donation;
};

export const updateDonationStatus = async (donationId, status) => {
  const validStatuses = ["pending", "approved", "rejected", "completed"];
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const donation = await donationRepository.updateOne(
    { _id: donationId },
    { status, updatedAt: new Date() },
    { returnDocument: "after", lean: true },
  );

  if (!donation) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Donation record not found");
  }

  invalidateDashboardStats();
  return donation;
};

// Inventory Management

export const getInventoryOverview = async (
  page = 1,
  limit = 10,
  filters = {},
) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const matchStage = {};
  if (filters.search && typeof filters.search === "string") {
    matchStage.bloodBankName = {
      $regex: escapeRegex(filters.search),
      $options: "i",
    };
  }

  const result = await inventoryRepository.getInventoryOverview({
    skip,
    limit: safeLimit,
    matchStage,
    bloodType: filters.bloodType,
  });

  const data = result[0]?.data || [];
  const total = result[0]?.totalCount[0]?.count || 0;
  const rawStats = result[0]?.stats || [];

  const stats = {
    totalUnits: rawStats.reduce((sum, s) => sum + s.total, 0),
    byBloodType: rawStats.reduce(
      (acc, s) => ({ ...acc, [s._id]: s.total }),
      {},
    ),
    expiringSoon: 0,
    expired: 0,
  };

  return {
    ...pagination.buildPaginatedResponse(data, total, safePage, safeLimit),
    stats,
  };
};

export const getInventoryById = async (inventoryId) => {
  ensureValidObjectId(inventoryId, "inventoryId");

  const inventoryDoc = await inventoryRepository.findById(inventoryId, {
    select: "_id bloodBank bloodBankName items lastModified updatedAt",
    lean: true,
  });

  if (!inventoryDoc) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Inventory record not found");
  }

  const inventory = (inventoryDoc.items || []).map((item) => ({
    bloodType: item.bloodGroup,
    quantity: item.units || 0,
    lastUpdated:
      item.lastUpdated || inventoryDoc.lastModified || inventoryDoc.updatedAt,
  }));

  const totalUnits = inventory.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0,
  );

  return {
    _id: inventoryDoc._id,
    bloodBankId: inventoryDoc.bloodBank,
    bloodBank: inventoryDoc.bloodBankName,
    totalUnits,
    bloodTypeCount: inventory.length,
    lastUpdated: inventoryDoc.lastModified || inventoryDoc.updatedAt,
    inventory,
  };
};

// Dashboard Stats

// Helper to invalidate dashboard stats
export const invalidateDashboardStats = () =>
  cacheManager.del("admin:dashboard_stats");

export const getDashboardStats = async () => {
  const CACHE_KEY = "admin:dashboard_stats";
  const cached = await cacheManager.get(CACHE_KEY);
  if (cached) return cached;

  const [
    totalUsers,
    totalBanks,
    totalCamps,
    totalEvents,
    pendingRequests,
    totalDonations,
    inventoryStats,
    recentRequests,
    recentBanks,
    recentDonations,
  ] = await Promise.all([
    userRepository.count({ isAvailable: true }),
    bloodBankRepository.count({ isActive: true, approvalStatus: "approved" }),
    bloodCampRepository.count({ status: { $ne: "cancelled" } }),
    eventRepository.count({ isActive: true }),
    requestRepository.count({ status: "pending" }),
    donationRepository.count({ status: "completed" }),
    inventoryRepository.getBloodTypeDistribution(),
    requestRepository.getRecentRequests(5),
    bloodBankRepository.getPendingBloodBanks(5),
    donationRepository.getRecentDonations(null, 5),
  ]);

  const bloodTypeDistribution = inventoryStats.reduce((acc, curr) => {
    acc[curr._id] = curr.totalUnits;
    return acc;
  }, {});

  const totalBloodInventory = Object.values(bloodTypeDistribution).reduce(
    (a, b) => a + b,
    0,
  );

  const stats = {
    activeUsers: totalUsers,
    activeBloodBanks: totalBanks,
    activeCamps: totalCamps,
    activeEvents: totalEvents,
    pendingRequests,
    completedDonations: totalDonations,
    totalBloodInventory,
    bloodTypeDistribution,
    recentRequests,
    pendingBloodBanks: recentBanks,
    recentDonations: recentDonations.map((d) => ({
      _id: d._id,
      donorName: d.donor?.name || "Unknown",
      bloodGroup: d.bloodGroup,
      units: Math.round((d.volumeDonated || 0) * 1000),
      date: d.donationDate || d.createdAt,
    })),
  };

  await cacheManager.set(CACHE_KEY, stats, 1800); // 30 minutes cache for better response speed
  return stats;
};
