import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import mongoose from 'mongoose';
import User from '../models/User.model.js';
import BloodRequest from '../models/BloodRequest.model.js';
import BloodBank from '../models/BloodBank.model.js';
import BloodCamp from '../models/BloodCamp.model.js';
import Event from '../models/Event.model.js';
import Donation from '../models/Donation.model.js';
import Inventory from '../models/Inventory.model.js';
import { ApiError } from '../utils/apiError.js';
import { ensureValidObjectId } from '../utils/dbGuards.js';
import {
  sendBloodBankRegistrationApprovedEmail,
  sendBloodBankRegistrationRejectedEmail,
  invalidatePublicBloodBanksCache
} from './bloodBankService.js';
import { BLOOD_BANK_SAFE_FIELDS, USER_SAFE_FIELDS, sanitizeBloodBank, sanitizeUser } from '../utils/serializers.js';

// Maximum rows returned by any single export to prevent memory exhaustion.
const MAX_EXPORT_ROWS = 10_000;

// Prevents ReDoS attacks by escaping regex characters and trimming input.
const escapeRegex = (raw, maxLen = 100) =>
  String(raw || '').substring(0, maxLen).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds a safe $or search filter with regex-escaped terms.
const buildSafeSearchFilter = (rawSearch, fields) => {
  if (!rawSearch || typeof rawSearch !== 'string' || !rawSearch.trim()) return null;
  const escaped = escapeRegex(rawSearch);
  return { $or: fields.map((field) => ({ [field]: { $regex: escaped, $options: 'i' } })) };
};

// Escapes formula-trigger characters to prevent CSV injection.
const csvSafe = (val) => {
  const str = String(val ?? '');
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
};

const buildWorkbookBuffer = async (sheetName, rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    sheet.addRow(headers);
    rows.forEach((row) => sheet.addRow(headers.map((h) => row[h])));
  }

  return workbook.xlsx.writeBuffer();
};

export const exportUsers = async () => {
  const users = await User.find().select(USER_SAFE_FIELDS).limit(MAX_EXPORT_ROWS).lean();
  const rowsLimited = users.length === MAX_EXPORT_ROWS;
  const rows = users.map((user) => ({
    Name: csvSafe(user.name),
    Email: csvSafe(user.email),
    Phone: user.phone || 'N/A',
    BloodGroup: user.bloodGroup || 'N/A',
    Role: user.role,
    IsDonor: user.isDonor ? 'Yes' : 'No',
    CreatedAt: new Date(user.createdAt).toLocaleDateString()
  }));
  return { buffer: await buildWorkbookBuffer('Users', rows), filename: 'users.xlsx', rowsLimited };
};

export const exportRequests = async () => {
  const requests = await BloodRequest.find()
    .populate('requestedBy', 'name email phone')
    .populate('bloodBank', 'name phone')
    .limit(MAX_EXPORT_ROWS)
    .lean();

  const rowsLimited = requests.length === MAX_EXPORT_ROWS;
  const rows = requests.map((req) => ({
    RequestId: req._id.toString(),
    RequesterName: csvSafe(req.requestedBy?.name || 'Unknown'),
    BloodGroup: req.bloodGroup,
    Units: req.units,
    BloodBank: csvSafe(req.bloodBank?.name || 'N/A'),
    Status: req.status,
    Urgency: req.urgency,
    RequiredBy: req.requiredBy ? new Date(req.requiredBy).toLocaleDateString() : 'N/A'
  }));

  return { buffer: await buildWorkbookBuffer('Requests', rows), filename: 'blood_requests.xlsx', rowsLimited };
};

export const exportBloodBanks = async () => {
  const banks = await BloodBank.find().select(BLOOD_BANK_SAFE_FIELDS).limit(MAX_EXPORT_ROWS).lean();
  const rowsLimited = banks.length === MAX_EXPORT_ROWS;
  const rows = banks.map((bank) => ({
    Name: csvSafe(bank.name),
    Email: csvSafe(bank.email),
    Phone: bank.phone,
    LicenseNumber: bank.licenseNumber,
    City: bank.address?.city || 'N/A',
    State: bank.address?.state || 'N/A',
    ApprovalStatus: bank.approvalStatus || 'pending',
    CreatedAt: new Date(bank.createdAt).toLocaleDateString()
  }));

  return { buffer: await buildWorkbookBuffer('BloodBanks', rows), filename: 'blood_banks.xlsx', rowsLimited };
};

export const exportCamps = async () => {
  const camps = await BloodCamp.find().populate('organizer', 'name email phone').limit(MAX_EXPORT_ROWS).lean();
  const rowsLimited = camps.length === MAX_EXPORT_ROWS;
  const rows = camps.map((camp) => ({
    CampName: csvSafe(camp.name),
    Organizer: csvSafe(camp.organizerName || camp.organizer?.name || 'Unknown'),
    Date: camp.date ? new Date(camp.date).toLocaleDateString() : 'N/A',
    Venue: csvSafe(camp.venue),
    City: csvSafe(camp.city),
    Status: camp.status
  }));

  return { buffer: await buildWorkbookBuffer('BloodCamps', rows), filename: 'blood_camps.xlsx', rowsLimited };
};

export const exportEvents = async () => {
  const events = await Event.find().limit(MAX_EXPORT_ROWS).lean();
  const rowsLimited = events.length === MAX_EXPORT_ROWS;
  const rows = events.map((event) => ({
    Title: csvSafe(event.title),
    Date: event.date ? new Date(event.date).toLocaleDateString() : 'N/A',
    Organizer: csvSafe(event.organizer),
    EventType: event.eventType,
    Visibility: event.visibility,
    Active: event.isActive ? 'Yes' : 'No'
  }));

  return { buffer: await buildWorkbookBuffer('Events', rows), filename: 'events.xlsx', rowsLimited };
};

// ===================== EXPORT FORMAT UPGRADE (CSV + Module-wise/All-in-One) =====================

const buildCsvBuffer = (rows) => {
  if (!rows || rows.length === 0) {
    return '';
  }
  try {
    const parser = new Parser();
    return parser.parse(rows);
  } catch (error) {
    return '';
  }
};

export const exportUsersCsv = async () => {
  const users = await User.find()
    .select('name email phone bloodGroup isAvailable isDonor lastDonationDate createdAt')
    .limit(MAX_EXPORT_ROWS)
    .lean();
  const rowsLimited = users.length === MAX_EXPORT_ROWS;
  const rows = users.map((user) => ({
    Name: csvSafe(user.name),
    Email: csvSafe(user.email),
    Phone: user.phone || 'N/A',
    BloodGroup: user.bloodGroup || 'N/A',
    Status: user.isAvailable ? 'active' : 'inactive',
    IsDonor: user.isDonor ? 'Yes' : 'No',
    LastDonationDate: user.lastDonationDate ? new Date(user.lastDonationDate).toLocaleDateString() : 'N/A',
    CreatedAt: new Date(user.createdAt).toLocaleDateString(),
  }));

  const csv = buildCsvBuffer(rows);
  return { buffer: Buffer.from(csv), filename: `users_${new Date().toISOString().split('T')[0]}.csv`, rowsLimited };
};

export const exportRequestsCsv = async () => {
  const requests = await BloodRequest.find()
    .select('patientName bloodGroup units hospital status urgency createdAt')
    .limit(MAX_EXPORT_ROWS)
    .lean();
  const rowsLimited = requests.length === MAX_EXPORT_ROWS;
  const rows = requests.map((req) => ({
    PatientName: csvSafe(req.patientName),
    BloodGroup: req.bloodGroup,
    Units: req.units,
    Hospital: csvSafe(req.hospital?.name || req.hospital?.address || 'N/A'),
    Status: req.status,
    Urgency: req.urgency,
    RequestedAt: new Date(req.createdAt).toLocaleDateString(),
  }));

  const csv = buildCsvBuffer(rows);
  return { buffer: Buffer.from(csv), filename: `blood_requests_${new Date().toISOString().split('T')[0]}.csv`, rowsLimited };
};

export const exportBloodBanksCsv = async () => {
  const banks = await BloodBank.find()
    .select('name email phone licenseNumber address approvalStatus createdAt')
    .limit(MAX_EXPORT_ROWS)
    .lean();
  const rowsLimited = banks.length === MAX_EXPORT_ROWS;
  const rows = banks.map((bank) => ({
    Name: csvSafe(bank.name),
    Email: csvSafe(bank.email),
    Phone: bank.phone || 'N/A',
    LicenseNumber: bank.licenseNumber || 'N/A',
    City: bank.address?.city || 'N/A',
    State: bank.address?.state || 'N/A',
    Status: bank.approvalStatus || 'pending',
    CreatedAt: new Date(bank.createdAt).toLocaleDateString(),
  }));

  const csv = buildCsvBuffer(rows);
  return { buffer: Buffer.from(csv), filename: `blood_banks_${new Date().toISOString().split('T')[0]}.csv`, rowsLimited };
};

export const exportCampsCsv = async () => {
  const camps = await BloodCamp.find()
    .select('name organizerName venue city date status createdAt')
    .limit(MAX_EXPORT_ROWS)
    .lean();
  const rowsLimited = camps.length === MAX_EXPORT_ROWS;
  const rows = camps.map((camp) => ({
    Name: csvSafe(camp.name),
    Organizer: csvSafe(camp.organizerName || 'N/A'),
    Venue: csvSafe(camp.venue || 'N/A'),
    City: csvSafe(camp.city || 'N/A'),
    Date: camp.date ? new Date(camp.date).toLocaleDateString() : 'N/A',
    Status: camp.status,
  }));

  const csv = buildCsvBuffer(rows);
  return { buffer: Buffer.from(csv), filename: `blood_camps_${new Date().toISOString().split('T')[0]}.csv`, rowsLimited };
};

export const exportEventsCsv = async () => {
  const events = await Event.find()
    .select('title eventType date location isActive createdAt')
    .limit(MAX_EXPORT_ROWS)
    .lean();
  const rowsLimited = events.length === MAX_EXPORT_ROWS;
  const rows = events.map((event) => ({
    Title: csvSafe(event.title),
    EventType: event.eventType || 'N/A',
    Date: event.date ? new Date(event.date).toLocaleDateString() : 'N/A',
    Location: csvSafe(event.location?.name || event.location?.address || 'N/A'),
    Active: event.isActive ? 'Yes' : 'No',
  }));

  const csv = buildCsvBuffer(rows);
  return { buffer: Buffer.from(csv), filename: `events_${new Date().toISOString().split('T')[0]}.csv`, rowsLimited };
};

// All-in-One Export
export const exportAllData = async (format = 'xlsx') => {
  const timestamp = new Date().toISOString().split('T')[0];

  const [usersData, requestsData, banksData, campsData, eventsData] = await Promise.all([
    User.find().select('name email phone bloodGroup isAvailable isDonor createdAt').limit(MAX_EXPORT_ROWS).lean(),
    BloodRequest.find().select('patientName bloodGroup units hospital status urgency createdAt').limit(MAX_EXPORT_ROWS).lean(),
    BloodBank.find().select('name email phone licenseNumber address approvalStatus createdAt').limit(MAX_EXPORT_ROWS).lean(),
    BloodCamp.find().select('name organizerName venue city date status createdAt').limit(MAX_EXPORT_ROWS).lean(),
    Event.find().select('title eventType date location isActive createdAt').limit(MAX_EXPORT_ROWS).lean(),
  ]);

  const rowsLimited =
    usersData.length === MAX_EXPORT_ROWS ||
    requestsData.length === MAX_EXPORT_ROWS ||
    banksData.length === MAX_EXPORT_ROWS ||
    campsData.length === MAX_EXPORT_ROWS ||
    eventsData.length === MAX_EXPORT_ROWS;

  const userRows = usersData.map((u) => ({
    Name: csvSafe(u.name), Email: csvSafe(u.email), Phone: u.phone || 'N/A',
    BloodGroup: u.bloodGroup || 'N/A', Status: u.isAvailable ? 'active' : 'inactive',
    IsDonor: u.isDonor ? 'Yes' : 'No', CreatedAt: new Date(u.createdAt).toLocaleDateString(),
  }));
  const requestRows = requestsData.map((r) => ({
    PatientName: csvSafe(r.patientName), BloodGroup: r.bloodGroup, Units: r.units,
    Hospital: csvSafe(r.hospital?.name || r.hospital?.address || 'N/A'),
    Status: r.status, Urgency: r.urgency, RequestedAt: new Date(r.createdAt).toLocaleDateString(),
  }));
  const bankRows = banksData.map((b) => ({
    Name: csvSafe(b.name), Email: csvSafe(b.email), Phone: b.phone || 'N/A',
    LicenseNumber: b.licenseNumber || 'N/A', City: b.address?.city || 'N/A',
    State: b.address?.state || 'N/A', Status: b.approvalStatus || 'pending',
    CreatedAt: new Date(b.createdAt).toLocaleDateString(),
  }));
  const campRows = campsData.map((c) => ({
    Name: csvSafe(c.name), Organizer: csvSafe(c.organizerName || 'N/A'),
    Venue: csvSafe(c.venue || 'N/A'), City: csvSafe(c.city || 'N/A'),
    Date: c.date ? new Date(c.date).toLocaleDateString() : 'N/A', Status: c.status,
  }));
  const eventRows = eventsData.map((e) => ({
    Title: csvSafe(e.title), EventType: e.eventType || 'N/A',
    Date: e.date ? new Date(e.date).toLocaleDateString() : 'N/A',
    Location: csvSafe(e.location?.name || e.location?.address || 'N/A'),
    Active: e.isActive ? 'Yes' : 'No',
  }));

  if (format === 'csv') {
    const allRows = [
      ...userRows.map((r) => ({ ...r, _sheet: 'Users' })),
      ...requestRows.map((r) => ({ ...r, _sheet: 'Requests' })),
      ...bankRows.map((r) => ({ ...r, _sheet: 'BloodBanks' })),
      ...campRows.map((r) => ({ ...r, _sheet: 'Camps' })),
      ...eventRows.map((r) => ({ ...r, _sheet: 'Events' })),
    ];
    const csv = buildCsvBuffer(allRows);
    return { buffer: Buffer.from(csv), filename: `all_data_${timestamp}.csv`, rowsLimited };
  }

  // XLSX format – one sheet per collection
  const workbook = new ExcelJS.Workbook();
  const addSheet = (name, rows) => {
    const sheet = workbook.addWorksheet(name);
    if (rows.length > 0) {
      const headers = Object.keys(rows[0]);
      sheet.addRow(headers);
      rows.forEach((row) => sheet.addRow(headers.map((h) => row[h])));
    }
  };

  addSheet('Users', userRows);
  addSheet('BloodBanks', bankRows);
  addSheet('Camps', campRows);
  addSheet('Events', eventRows);
  addSheet('Requests', requestRows);

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename: `all_data_${timestamp}.xlsx`, rowsLimited };
};

// ===================== USERS MANAGEMENT =====================

export const getAllUsers = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = {};

  // Whitelist-based filtering to prevent NoSQL injection
  const ALLOWED_STATUS_VALUES = ['active', 'inactive', 'suspended'];
  const ALLOWED_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  if (filters.status && ALLOWED_STATUS_VALUES.includes(filters.status)) {
    if (filters.status === 'active') query.isAvailable = true;
    if (filters.status === 'inactive' || filters.status === 'suspended') query.isAvailable = false;
  }
  
  // Validate blood type against whitelist
  if (filters.bloodType && ALLOWED_BLOOD_TYPES.includes(filters.bloodType)) {
    query.bloodGroup = filters.bloodType;
  }
  
  // Escape regex special characters in search to prevent ReDoS attacks
  if (filters.search && typeof filters.search === 'string') {
    // Escape special regex characters
    const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Limit search string length to prevent DoS
    const sanitizedSearch = escapedSearch.substring(0, 100);
    
    query.$or = [
      { name: { $regex: sanitizedSearch, $options: 'i' } },
      { email: { $regex: sanitizedSearch, $options: 'i' } },
      { phone: { $regex: sanitizedSearch, $options: 'i' } },
    ];
  }

  // Run find + countDocuments in parallel (countDocuments does not depend on userIds)
  const [users, total] = await Promise.all([
    User.find(query)
      .select('_id name email phone bloodGroup isAvailable donorInfo lastDonationDate createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    User.countDocuments(query),
  ]);

  const userIds = users.map((user) => user._id);

  const [requestCounts, donationCounts] = await Promise.all([
    BloodRequest.aggregate([
      { $match: { requestedBy: { $in: userIds } } },
      { $group: { _id: '$requestedBy', count: { $sum: 1 } } },
    ]),
    Donation.aggregate([
      { $match: { donor: { $in: userIds } } },
      { $group: { _id: '$donor', count: { $sum: 1 } } },
    ]),
  ]);

  const requestCountMap = new Map(requestCounts.map((item) => [String(item._id), item.count]));
  const donationCountMap = new Map(donationCounts.map((item) => [String(item._id), item.count]));
  const normalizedUsers = users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    mobileNumber: user.phone || '',
    bloodType: user.bloodGroup || user.donorInfo?.bloodGroup || '',
    requestCount: requestCountMap.get(String(user._id)) || 0,
    donationCount: donationCountMap.get(String(user._id)) || 0,
    status: user.isAvailable ? 'active' : 'inactive',
    lastDonationDate: user.lastDonationDate,
    createdAt: user.createdAt,
  }));

  return {
    data: normalizedUsers,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .select(USER_SAFE_FIELDS)
    .lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return sanitizeUser(user);
};

export const updateUserStatus = async (userId, status) => {
  ensureValidObjectId(userId, 'user id');
  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const isAvailable = status === 'active';

  const user = await User.findByIdAndUpdate(
    userId,
    { isAvailable, updatedAt: new Date() },
    { returnDocument: 'after' }
  ).lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

// ===================== BLOOD BANKS MANAGEMENT =====================

const ALLOWED_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];
const ALLOWED_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const ALLOWED_CAMP_STATUSES = ['active', 'completed', 'cancelled'];
const ALLOWED_EVENT_STATUSES = ['scheduled', 'ongoing', 'completed', 'cancelled'];
const ALLOWED_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'];
const ALLOWED_URGENCY = ['high', 'medium', 'low', 'critical', 'urgent', 'normal'];
const ALLOWED_DONATION_STATUSES = ['pending', 'approved', 'rejected', 'completed'];

export const getAllBloodBanks = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.status && ALLOWED_APPROVAL_STATUSES.includes(filters.status)) {
    query.approvalStatus = filters.status;
  }
  const searchFilter = buildSafeSearchFilter(filters.search, ['name', 'email', 'address.city']);
  if (searchFilter) Object.assign(query, searchFilter);

  const [banks, total] = await Promise.all([
    BloodBank.find(query)
      .select('_id name email phone address isActive isVerified approvalStatus registrationNumber licenseNumber rejectionReason reviewedAt reviewedBy createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    BloodBank.countDocuments(query),
  ]);
  const normalizedBanks = banks.map((bank) => ({
    _id: bank._id,
    name: bank.name,
    email: bank.email,
      mobileNumber: bank.phone || '',
      city: bank.address?.city || '',
      state: bank.address?.state || '',
      status: bank.approvalStatus || 'pending',
      isActive: bank.isActive,
      isVerified: bank.isVerified,
      registrationNumber: bank.registrationNumber || bank.licenseNumber || '',
      rejectionReason: bank.rejectionReason || '',
      reviewedAt: bank.reviewedAt,
      reviewedBy: bank.reviewedBy || '',
      createdAt: bank.createdAt,
  }));

  return {
    data: normalizedBanks,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getBloodBankById = async (bankId) => {
  const bank = await BloodBank.findById(bankId).select(BLOOD_BANK_SAFE_FIELDS).lean();

  if (!bank) {
    throw new ApiError(404, 'Blood bank not found');
  }

  return sanitizeBloodBank(bank);
};

export const updateBloodBankStatus = async (bankId, status, reviewContext = {}) => {
  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const bank = await BloodBank.findById(bankId);

  if (!bank) {
    throw new ApiError(404, 'Blood bank not found');
  }

  const reviewer =
    reviewContext.reviewedBy ||
    reviewContext.adminEmail ||
    reviewContext.adminName ||
    'admin';

  if (status === 'rejected') {
    const rejectionReason = String(reviewContext.rejectionReason || '').trim();
    if (!rejectionReason) {
      throw new ApiError(400, 'Rejection reason is required when rejecting a blood bank');
    }

    bank.approvalStatus = 'rejected';
    bank.isActive = false;
    bank.isVerified = false;
    bank.rejectionReason = rejectionReason;
    bank.reviewedAt = new Date();
    bank.reviewedBy = reviewer;
    await bank.save();

    await sendBloodBankRegistrationRejectedEmail(bank, rejectionReason);
    invalidatePublicBloodBanksCache();
    return bank.toObject();
  }

  if (status === 'approved') {
    bank.approvalStatus = 'approved';
    bank.isActive = true;
    bank.isVerified = true;
    bank.rejectionReason = '';
    bank.reviewedAt = new Date();
    bank.reviewedBy = reviewer;
    await bank.save();

    await sendBloodBankRegistrationApprovedEmail(bank);
    invalidatePublicBloodBanksCache();
    return bank.toObject();
  }

  bank.approvalStatus = 'pending';
  bank.isActive = false;
  bank.isVerified = false;
  bank.rejectionReason = '';
  bank.reviewedAt = new Date();
  bank.reviewedBy = reviewer;
  await bank.save();
  invalidatePublicBloodBanksCache();

  return bank.toObject();
};

// ===================== BLOOD CAMPS MANAGEMENT =====================

export const getAllCamps = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.status && ALLOWED_CAMP_STATUSES.includes(filters.status)) query.status = filters.status;
  if (filters.bloodBankId && mongoose.Types.ObjectId.isValid(filters.bloodBankId)) query.organizer = new mongoose.Types.ObjectId(filters.bloodBankId);
  const searchFilter = buildSafeSearchFilter(filters.search, ['name', 'venue', 'city', 'address', 'organizerName']);
  if (searchFilter) Object.assign(query, searchFilter);

  const [camps, total] = await Promise.all([
    BloodCamp.find(query)
      .select('_id name organizer organizerName venue city address date status createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
      .lean(),
    BloodCamp.countDocuments(query),
  ]);
  const normalizedCamps = camps.map((camp) => ({
    _id: camp._id,
    name: camp.name,
    bloodBankId: camp.organizer,
    bloodBankName: camp.organizerName || '-',
    location: [camp.venue, camp.city].filter(Boolean).join(', ') || camp.address || '-',
    startDate: camp.date,
    endDate: camp.date,
    status: camp.status,
    createdAt: camp.createdAt,
  }));

  return {
    data: normalizedCamps,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getCampsByBloodBank = async (bankId, page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = { organizer: bankId };

  if (filters.status && ALLOWED_CAMP_STATUSES.includes(filters.status)) query.status = filters.status;
  const searchFilter = buildSafeSearchFilter(filters.search, ['name', 'venue', 'city', 'address']);
  if (searchFilter) Object.assign(query, searchFilter);

  const [camps, total] = await Promise.all([
    BloodCamp.find(query)
      .select('_id name organizer organizerName venue city address date status createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
      .lean(),
    BloodCamp.countDocuments(query),
  ]);
  const normalizedCamps = camps.map((camp) => ({
    _id: camp._id,
    name: camp.name,
    bloodBankId: camp.organizer,
    bloodBankName: camp.organizerName || '-',
    location: [camp.venue, camp.city].filter(Boolean).join(', ') || camp.address || '-',
    startDate: camp.date,
    endDate: camp.date,
    status: camp.status,
    createdAt: camp.createdAt,
  }));

  return {
    data: normalizedCamps,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getCampById = async (campId) => {
  const camp = await BloodCamp.findById(campId).lean();

  if (!camp) {
    throw new ApiError(404, 'Blood camp not found');
  }

  return camp;
};

export const updateCampStatus = async (campId, status) => {
  const validStatuses = ['active', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const camp = await BloodCamp.findByIdAndUpdate(
    campId,
    { status, updatedAt: new Date() },
    { returnDocument: 'after' }
  ).lean();

  if (!camp) {
    throw new ApiError(404, 'Blood camp not found');
  }

  return camp;
};

// ===================== EVENTS MANAGEMENT =====================

export const getAllEvents = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.bloodBankId && mongoose.Types.ObjectId.isValid(filters.bloodBankId)) {
    query.organizerModel = 'BloodBank';
    query.organizedBy = new mongoose.Types.ObjectId(filters.bloodBankId);
  }

  if (filters.status && ALLOWED_EVENT_STATUSES.includes(filters.status)) {
    const now = new Date();
    if (filters.status === 'cancelled') query.isActive = false;
    if (filters.status === 'scheduled') {
      query.isActive = true;
      query.date = { $gt: now };
    }
    if (filters.status === 'ongoing') {
      query.isActive = true;
      query.date = {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      };
    }
    if (filters.status === 'completed') {
      query.isActive = true;
      query.date = { $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
    }
  }
  const eventsSearchFilter = buildSafeSearchFilter(filters.search, ['title', 'description', 'location.name', 'location.address']);
  if (eventsSearchFilter) Object.assign(query, eventsSearchFilter);

  const [events, total] = await Promise.all([
    Event.find(query)
      .populate('organizedBy', 'name')
      .select('_id title description date location isActive organizer organizerModel organizedBy createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
      .lean(),
    Event.countDocuments(query),
  ]);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const normalizedEvents = events.map((event) => {
    let status = 'scheduled';
    if (!event.isActive) {
      status = 'cancelled';
    } else if (event.date < todayStart) {
      status = 'completed';
    } else if (event.date >= todayStart && event.date < todayEnd) {
      status = 'ongoing';
    }

    return {
      _id: event._id,
      name: event.title,
      bloodBankId: event.organizerModel === 'BloodBank' ? event.organizedBy?._id || event.organizedBy : null,
      bloodBankName:
        event.organizerModel === 'BloodBank'
          ? event.organizedBy?.name || event.organizer || '-'
          : '-',
      description: event.description,
      startDate: event.date,
      endDate: event.date,
      location: event.location?.name || event.location?.address || '-',
      status,
      createdAt: event.createdAt,
    };
  });

  return {
    data: normalizedEvents,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getEventsByBloodBank = async (bankId, page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = {
    organizerModel: 'BloodBank',
    organizedBy: bankId,
  };

  if (filters.status) {
    const now = new Date();
    if (filters.status === 'cancelled') query.isActive = false;
    if (filters.status === 'scheduled') {
      query.isActive = true;
      query.date = { $gt: now };
    }
    if (filters.status === 'ongoing') {
      query.isActive = true;
      query.date = {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      };
    }
    if (filters.status === 'completed') {
      query.isActive = true;
      query.date = { $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
    }
  }
  const bloodBankEventsSearchFilter = buildSafeSearchFilter(filters.search, ['title', 'description', 'location.name', 'location.address']);
  if (bloodBankEventsSearchFilter) Object.assign(query, bloodBankEventsSearchFilter);

  const [events, total] = await Promise.all([
    Event.find(query)
      .populate('organizedBy', 'name')
      .select('_id title description date location isActive organizer organizerModel organizedBy createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
      .lean(),
    Event.countDocuments(query),
  ]);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const normalizedEvents = events.map((event) => {
    let status = 'scheduled';
    if (!event.isActive) {
      status = 'cancelled';
    } else if (event.date < todayStart) {
      status = 'completed';
    } else if (event.date >= todayStart && event.date < todayEnd) {
      status = 'ongoing';
    }

    return {
      _id: event._id,
      name: event.title,
      bloodBankId: event.organizedBy?._id || event.organizedBy,
      bloodBankName: event.organizedBy?.name || event.organizer || '-',
      description: event.description,
      startDate: event.date,
      endDate: event.date,
      location: event.location?.name || event.location?.address || '-',
      status,
      createdAt: event.createdAt,
    };
  });

  return {
    data: normalizedEvents,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getEventById = async (eventId) => {
  const event = await Event.findById(eventId).lean();

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  return event;
};

export const updateEventStatus = async (eventId, status) => {
  const validStatuses = ['scheduled', 'ongoing', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const event = await Event.findByIdAndUpdate(
    eventId,
    { status, updatedAt: new Date() },
    { returnDocument: 'after' }
  ).lean();

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  return event;
};

// ===================== BLOOD REQUESTS MANAGEMENT =====================

export const getAllRequests = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.status && ALLOWED_REQUEST_STATUSES.includes(filters.status)) query.status = filters.status;
  if (filters.bloodType && ALLOWED_BLOOD_GROUPS.includes(filters.bloodType)) query.bloodGroup = filters.bloodType;
  if (filters.userId && mongoose.Types.ObjectId.isValid(filters.userId)) query.requestedBy = new mongoose.Types.ObjectId(filters.userId);
  if (filters.urgency && ALLOWED_URGENCY.includes(filters.urgency)) {
    const urgencyMap = { high: 'critical', medium: 'urgent', low: 'normal' };
    query.urgency = urgencyMap[filters.urgency] || filters.urgency;
  }
  const requestsSearchFilter = buildSafeSearchFilter(filters.search, ['patientName', 'hospital.name', 'hospital.address']);
  if (requestsSearchFilter) Object.assign(query, requestsSearchFilter);

  const [requests, total] = await Promise.all([
    BloodRequest.find(query)
      .select('_id patientName bloodGroup units hospital urgency status createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    BloodRequest.countDocuments(query),
  ]);
  const normalizedRequests = requests.map((request) => {
    const urgencyMap = { critical: 'high', urgent: 'medium', normal: 'low' };
    return {
      _id: request._id,
      patientName: request.patientName,
      bloodType: request.bloodGroup,
      quantity: request.units,
      hospital: request.hospital?.name || request.hospital?.address || '-',
      urgency: urgencyMap[request.urgency] || request.urgency,
      status: request.status,
      requestedAt: request.createdAt,
      createdAt: request.createdAt,
    };
  });

  return {
    data: normalizedRequests,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getRequestById = async (requestId) => {
  const request = await BloodRequest.findById(requestId).lean();

  if (!request) {
    throw new ApiError(404, 'Blood request not found');
  }

  return request;
};

export const updateRequestStatus = async (requestId, status) => {
  const validStatuses = ['pending', 'approved', 'rejected', 'fulfilled', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const request = await BloodRequest.findByIdAndUpdate(
    requestId,
    { status, updatedAt: new Date() },
    { returnDocument: 'after' }
  ).lean();

  if (!request) {
    throw new ApiError(404, 'Blood request not found');
  }

  return request;
};

// ===================== DONATIONS MANAGEMENT =====================

export const getAllDonations = async (page = 1, limit = 10, filters = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const matchStage = {};
  if (filters.status && ALLOWED_DONATION_STATUSES.includes(filters.status)) matchStage.status = filters.status;
  if (filters.bloodType && ALLOWED_BLOOD_GROUPS.includes(filters.bloodType)) matchStage.bloodGroup = filters.bloodType;
  if (filters.userId && mongoose.Types.ObjectId.isValid(filters.userId)) {
    matchStage.donor = new mongoose.Types.ObjectId(filters.userId);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'donor',
        foreignField: '_id',
        as: 'donorData',
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    { $addFields: { donorName: { $arrayElemAt: ['$donorData.name', 0] } } },
  ];

  if (filters.search && typeof filters.search === 'string') {
    const escaped = escapeRegex(filters.search);
    pipeline.push({ $match: { donorName: { $regex: escaped, $options: 'i' } } });
  }

  const countPipeline = [...pipeline, { $count: 'total' }];
  const dataPipeline = [
    ...pipeline,
    { $sort: { donationDate: -1, createdAt: -1 } },
    { $skip: skip },
    { $limit: safeLimit },
    {
      $project: {
        _id: 1, donorName: 1, bloodGroup: 1, volumeDonated: 1,
        status: 1, donationDate: 1, createdAt: 1,
      },
    },
  ];

  const [countResult, donations] = await Promise.all([
    Donation.aggregate(countPipeline),
    Donation.aggregate(dataPipeline),
  ]);

  const total = countResult[0]?.total || 0;
  const normalizedDonations = donations.map((donation) => ({
    _id: donation._id,
    donorName: donation.donorName || 'Unknown',
    bloodType: donation.bloodGroup,
    quantity: Math.round((donation.volumeDonated || 0) * 1000),
    status: donation.status,
    donationDate: donation.donationDate || donation.createdAt,
    createdAt: donation.createdAt,
  }));

  return {
    data: normalizedDonations,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

export const getDonationById = async (donationId) => {
  const donation = await Donation.findById(donationId).lean();

  if (!donation) {
    throw new ApiError(404, 'Donation record not found');
  }

  return donation;
};

export const updateDonationStatus = async (donationId, status) => {
  const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const donation = await Donation.findByIdAndUpdate(
    donationId,
    { status, updatedAt: new Date() },
    { returnDocument: 'after' }
  ).lean();

  if (!donation) {
    throw new ApiError(404, 'Donation record not found');
  }

  return donation;
};

// ===================== INVENTORY MANAGEMENT =====================

export const getInventoryOverview = async (page = 1, limit = 10, filters = {}) => {
  const query = {};

  if (filters.search && typeof filters.search === 'string') {
    query.bloodBankName = { $regex: escapeRegex(filters.search), $options: 'i' };
  }

  const inventoryDocs = await Inventory.find(query)
    .select('_id bloodBank bloodBankName items lastModified updatedAt')
    .sort({ updatedAt: -1 })
    .lean();

  const bankRows = inventoryDocs.map((doc) => {
    const filteredItems = (doc.items || []).filter((item) => {
      if (!filters.bloodType) return true;
      return item.bloodGroup === filters.bloodType;
    });

    const totalUnits = filteredItems.reduce((sum, item) => sum + (item.units || 0), 0);
    const latestItemUpdate = filteredItems.reduce((latest, item) => {
      const itemDate = item.lastUpdated ? new Date(item.lastUpdated) : null;
      if (!itemDate) return latest;
      if (!latest || itemDate > latest) return itemDate;
      return latest;
    }, null);

    return {
      _id: doc._id,
      bloodBank: doc.bloodBankName,
      totalUnits,
      bloodTypeCount: filteredItems.length,
      lastUpdated: latestItemUpdate || doc.lastModified || doc.updatedAt,
      inventory: filteredItems.map((item) => ({
        bloodType: item.bloodGroup,
        quantity: item.units || 0,
        lastUpdated: item.lastUpdated || doc.lastModified || doc.updatedAt,
      })),
    };
  }).filter((row) => row.inventory.length > 0 || !filters.bloodType);

  const total = bankRows.length;
  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 10;
  const skip = (safePage - 1) * safeLimit;
  const inventory = bankRows.slice(skip, skip + safeLimit);

  // Calculate stats
  const stats = {
    totalUnits: 0,
    byBloodType: {},
    expiringSoon: 0,
    expired: 0,
  };

  bankRows.forEach((bank) => {
    bank.inventory.forEach((item) => {
      stats.totalUnits += item.quantity || 0;

      if (!stats.byBloodType[item.bloodType]) {
        stats.byBloodType[item.bloodType] = 0;
      }
      stats.byBloodType[item.bloodType] += item.quantity || 0;
    });
  });

  return {
    data: inventory,
    stats,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      pages: Math.ceil(total / safeLimit),
    },
  };
};

export const getInventoryById = async (inventoryId) => {
  ensureValidObjectId(inventoryId, 'inventoryId');

  const inventoryDoc = await Inventory.findById(inventoryId)
    .select('_id bloodBank bloodBankName items lastModified updatedAt')
    .lean();

  if (!inventoryDoc) {
    throw new ApiError(404, 'Inventory record not found');
  }

  const inventory = (inventoryDoc.items || []).map((item) => ({
    bloodType: item.bloodGroup,
    quantity: item.units || 0,
    lastUpdated: item.lastUpdated || inventoryDoc.lastModified || inventoryDoc.updatedAt,
  }));

  const totalUnits = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);

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

// ===================== DASHBOARD STATS =====================

export const getDashboardStats = async () => {
  const [
    totalUsers,
    totalBanks,
    totalCamps,
    totalEvents,
    pendingRequests,
    totalDonations,
    inventoryStats,
  ] = await Promise.all([
    User.countDocuments({ isAvailable: true }),
    BloodBank.countDocuments({ isActive: true, approvalStatus: 'approved' }),
    BloodCamp.countDocuments({ status: { $ne: 'cancelled' } }),
    Event.countDocuments({ isActive: true }),
    BloodRequest.countDocuments({ status: 'pending' }),
    Donation.countDocuments({ status: 'completed' }),
    Inventory.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$items.units' },
        },
      },
    ]),
  ]);

  return {
    activeUsers: totalUsers,
    activeBloodBanks: totalBanks,
    activeCamps: totalCamps,
    activeEvents: totalEvents,
    pendingRequests,
    completedDonations: totalDonations,
    totalBloodInventory: inventoryStats.length > 0 ? inventoryStats[0].totalQuantity : 0,
  };
};
