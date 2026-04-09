import ExcelJS from 'exceljs';
import BloodRequest from '../models/BloodRequest.model.js';
import BloodBank from '../models/BloodBank.model.js';
import BloodCamp from '../models/BloodCamp.model.js';
import Inventory from '../models/Inventory.model.js';
import Event from '../models/Event.model.js';
import { ApiError } from '../utils/apiError.js';
import { addInventoryUnits, subtractInventoryUnits } from './inventoryService.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { BLOOD_BANK_SAFE_FIELDS, sanitizeBloodBank } from '../utils/serializers.js';
import * as validationService from './validationService.js';
import { revokeAllPrincipalSessions } from './sessionService.js';

const buildBloodBankAddress = (address = {}) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.street, address.city, address.state, address.pincode || address.zipCode].filter(Boolean).join(', ');
};

export const getAllRequests = async (bloodBankId, query) => {
  const { status = 'pending', bloodGroup, urgency, requestType, direction, limit, page } = query;
  const normalizedStatus = String(status).toLowerCase();
  const isPending = normalizedStatus === 'pending';
  const responseStatuses = isPending ? ['pending', null] : [normalizedStatus];
  const directionFilter = direction === 'sent' || direction === 'received' ? direction : 'all';

  const requestScopes = [];
  const includeUserRequests = requestType !== 'bloodbank';
  const includeBloodBankRequests = requestType !== 'user';

  if (includeUserRequests) {
    const userScope = {
      requestType: 'user',
      'bloodBankResponse.status': { $in: responseStatuses }
    };

    // Non-pending user requests should only include requests already handled by this blood bank.
    if (!isPending) {
      userScope.bloodBank = bloodBankId;
    }

    requestScopes.push(userScope);
  }

  if (includeBloodBankRequests) {
    const interBankScope = {
      requestType: 'bloodbank',
      'bloodBankResponse.status': { $in: responseStatuses }
    };

    if (directionFilter === 'sent') {
      interBankScope.requestingBloodBank = bloodBankId;
    } else if (directionFilter === 'received') {
      interBankScope.targetBloodBank = bloodBankId;
    } else {
      interBankScope.$or = [{ targetBloodBank: bloodBankId }, { requestingBloodBank: bloodBankId }];
    }

    requestScopes.push(interBankScope);
  }

  const filter = {
    status: isPending ? 'pending' : normalizedStatus,
    $or: requestScopes
  };

  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (urgency) filter.urgency = urgency;

  const parsedLimit = Number(limit) || 20;
  const parsedPage = Number(page) || 1;
  const skip = (parsedPage - 1) * parsedLimit;

  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .populate([
        { path: 'requestedBy', select: 'name email phone bloodGroup' },
        { path: 'requestingBloodBank', select: 'name email phone address' },
        { path: 'targetBloodBank', select: 'name email phone address' }
      ])
      .sort({ urgency: -1, createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    BloodRequest.countDocuments(filter)
  ]);

  return {
    count: requests.length,
    total,
    page: parsedPage,
    pages: Math.ceil(total / parsedLimit),
    requests
  };
};

export const getApprovedRequests = async (bloodBankId, query) => {
  const { requestType, direction, limit, page } = query;

  const approvedQuery = {
    status: 'approved',
    $or: [
      { requestType: 'user', bloodBank: bloodBankId },
      { requestType: 'bloodbank', $or: [{ targetBloodBank: bloodBankId }, { requestingBloodBank: bloodBankId }] }
    ]
  };

  if (requestType === 'user' || requestType === 'bloodbank') {
    approvedQuery.$or = approvedQuery.$or.filter((entry) => entry.requestType === requestType);
  }

  const directionFilter = direction === 'sent' || direction === 'received' ? direction : 'all';
  if (directionFilter !== 'all') {
    approvedQuery.$or = approvedQuery.$or
      .map((entry) => {
        if (entry.requestType !== 'bloodbank' || !entry.$or) return entry;
        const scoped = { ...entry };
        scoped.$or = scoped.$or.filter((condition) =>
          directionFilter === 'sent'
            ? Object.prototype.hasOwnProperty.call(condition, 'requestingBloodBank')
            : Object.prototype.hasOwnProperty.call(condition, 'targetBloodBank')
        );
        if (!scoped.$or.length) return null;
        return scoped;
      })
      .filter(Boolean);
  }

  const parsedLimit = Number(limit) || 20;
  const parsedPage = Number(page) || 1;
  const skip = (parsedPage - 1) * parsedLimit;

  const [requests, total] = await Promise.all([
    BloodRequest.find(approvedQuery)
      .populate([
        { path: 'requestedBy', select: 'name email phone bloodGroup' },
        { path: 'requestingBloodBank', select: 'name email phone address' },
        { path: 'targetBloodBank', select: 'name email phone address' }
      ])
      .sort({ 'bloodBankResponse.respondedAt': -1, updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    BloodRequest.countDocuments(approvedQuery)
  ]);

  return {
    count: requests.length,
    total,
    page: parsedPage,
    pages: Math.ceil(total / parsedLimit),
    requests
  };
};

export const getRequestDetails = async (id) => {
  const request = await BloodRequest.findById(id)
    .populate([
      { path: 'requestedBy', select: 'name email phone bloodGroup address' },
      { path: 'requestingBloodBank', select: 'name email phone address' },
      { path: 'targetBloodBank', select: 'name email phone address' },
      { path: 'bloodBankResponse.respondedBy', select: 'name' }
    ])
    .lean();

  if (!request) throw new ApiError(404, 'Request not found');
  return request;
};

export const createBankToBankRequest = async (requestingBankId, data) => {
  const { targetBloodBankId, bloodGroup, units, urgency, description } = data;
  if (!targetBloodBankId || !bloodGroup || !units) {
    throw new ApiError(400, 'Target blood bank, blood group, and units are required');
  }
  if (String(requestingBankId) === String(targetBloodBankId)) {
    throw new ApiError(400, 'You cannot request blood from your own blood bank');
  }

  const [requestingBank, targetBloodBank] = await Promise.all([
    BloodBank.findById(requestingBankId),
    BloodBank.findById(targetBloodBankId)
  ]);

  if (!requestingBank || !targetBloodBank) throw new ApiError(404, 'Blood bank not found');

  const request = await BloodRequest.create({
    requestType: 'bloodbank',
    requestingBloodBank: requestingBankId,
    targetBloodBank: targetBloodBankId,
    patientName: requestingBank.name,
    bloodGroup,
    units: parseInt(units, 10),
    urgency: urgency || 'normal',
    hospital: {
      name: requestingBank.name,
      address: buildBloodBankAddress(requestingBank.address)
    },
    contactNumber: requestingBank.phone,
    description: description || `Inventory request sent to ${targetBloodBank.name}`,
    bloodBankResponse: { status: 'pending' }
  });

  await request.populate([
    { path: 'requestingBloodBank', select: 'name email phone address' },
    { path: 'targetBloodBank', select: 'name email phone address' }
  ]);
  return request;
};

export const approveRequest = async (requestId, responderBankId, responseNote) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Request not found');
  if (request.status !== 'pending') throw new ApiError(400, 'Request is no longer pending');

  if (request.requestType === 'bloodbank') {
    if (String(request.targetBloodBank) !== String(responderBankId)) {
      throw new ApiError(403, 'You can only approve requests sent to your blood bank');
    }
    await subtractInventoryUnits(responderBankId, request.bloodGroup, request.units);
    await addInventoryUnits(request.requestingBloodBank, request.bloodGroup, request.units);
  } else {
    await subtractInventoryUnits(responderBankId, request.bloodGroup, request.units);
  }

  request.status = 'approved';
  request.bloodBank = responderBankId;
  request.bloodBankResponse = {
    status: 'approved',
    respondedAt: new Date(),
    respondedBy: responderBankId,
    responseNote: responseNote || 'Request approved. Please contact us for collection.'
  };

  await request.save();
  await request.populate([
    { path: 'requestedBy', select: 'name email phone' },
    { path: 'requestingBloodBank', select: 'name email phone address' },
    { path: 'targetBloodBank', select: 'name email phone address' },
    { path: 'bloodBank', select: 'name phone email address' }
  ]);

  return request;
};

export const rejectRequest = async (requestId, bloodBankId, responseNote) => {
  const request = await BloodRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Request not found');
  if (request.status !== 'pending') throw new ApiError(400, 'Request is no longer pending');
  if (request.requestType === 'bloodbank' && String(request.targetBloodBank) !== String(bloodBankId)) {
    throw new ApiError(403, 'You can only reject requests sent to your blood bank');
  }

  request.status = 'rejected';
  request.bloodBank = bloodBankId;
  request.bloodBankResponse = {
    status: 'rejected',
    respondedAt: new Date(),
    respondedBy: bloodBankId,
    responseNote: responseNote || 'Unable to fulfill this request at this time.'
  };
  await request.save();

  await request.populate([
    { path: 'requestedBy', select: 'name email phone' },
    { path: 'requestingBloodBank', select: 'name email phone address' },
    { path: 'targetBloodBank', select: 'name email phone address' },
    { path: 'bloodBank', select: 'name phone email' }
  ]);

  return request;
};

export const getRequestStats = async (bloodBankId) => {
  const stats = await BloodRequest.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
        approved: [{ $match: { bloodBank: bloodBankId, status: 'approved' } }, { $count: 'count' }],
        rejected: [{ $match: { bloodBank: bloodBankId, status: 'rejected' } }, { $count: 'count' }],
        byBloodGroup: [{ $match: { status: 'pending' } }, { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }],
        byUrgency: [{ $match: { status: 'pending' } }, { $group: { _id: '$urgency', count: { $sum: 1 } } }]
      }
    }
  ]);

  return {
    total: stats[0].total[0]?.count || 0,
    pending: stats[0].pending[0]?.count || 0,
    approved: stats[0].approved[0]?.count || 0,
    rejected: stats[0].rejected[0]?.count || 0,
    byBloodGroup: stats[0].byBloodGroup,
    byUrgency: stats[0].byUrgency
  };
};

export const getAllEvents = async (bloodBankId) => {
  const events = await Event.find({ organizedBy: bloodBankId, organizerModel: 'BloodBank' })
    .populate('registeredDonors', 'name email phone bloodGroup')
    .sort({ date: 1 })
    .lean();
  return { count: events.length, events };
};

export const createEvent = async (bloodBankId, eventData) => {
  const bloodBank = await BloodBank.findById(bloodBankId);
  if (!bloodBank) throw new ApiError(404, 'Blood bank not found');

  const event = new Event({
    ...eventData,
    organizer: bloodBank.name,
    organizedBy: bloodBankId,
    organizerModel: 'BloodBank',
    visibility: eventData.visibility || 'public'
  });
  await event.save();
  return event;
};

export const updateEvent = async (eventId, bloodBankId, payload) => {
  const event = await Event.findOne({ _id: eventId, organizedBy: bloodBankId });
  if (!event) throw new ApiError(404, 'Event not found or unauthorized');

  const allowedUpdates = [
    'title', 'description', 'eventType', 'location', 'date', 'startTime', 'endTime',
    'contactInfo', 'expectedDonors', 'isActive', 'visibility', 'maxParticipants'
  ];

  allowedUpdates.forEach((field) => {
    if (payload[field] !== undefined) event[field] = payload[field];
  });

  await event.save();
  return event;
};

export const deleteEvent = async (eventId, bloodBankId) => {
  const event = await Event.findOneAndDelete({ _id: eventId, organizedBy: bloodBankId });
  if (!event) throw new ApiError(404, 'Event not found or unauthorized');
  return { success: true };
};

export const getEventRegistrations = async (eventId, bloodBankId) => {
  const event = await Event.findOne({ _id: eventId, organizedBy: bloodBankId })
    .populate('registeredDonors', 'name email phone bloodGroup address lastDonationDate isDonor donorInfo');

  if (!event) throw new ApiError(404, 'Event not found or unauthorized');

  return {
    event: { title: event.title, date: event.date, location: event.location },
    registrations: event.registeredDonors,
    count: event.registeredDonors.length
  };
};

export const exportEventRegistrations = async (eventId, bloodBankId) => {
  const event = await Event.findOne({ _id: eventId, organizedBy: bloodBankId })
    .select('title registeredDonors')
    .populate('registeredDonors', 'name email phone bloodGroup createdAt')
    .lean();

  if (!event) throw new ApiError(404, 'Event not found or unauthorized');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Event Registrations');
  worksheet.columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Blood Group', key: 'bloodGroup', width: 12 },
    { header: 'Registration Date', key: 'registeredAt', width: 20 }
  ];

  event.registeredDonors.forEach((donor, index) => {
    worksheet.addRow({
      sno: index + 1,
      name: donor.name || 'N/A',
      email: donor.email || 'N/A',
      phone: donor.phone || 'N/A',
      bloodGroup: donor.bloodGroup || 'N/A',
      registeredAt: donor.createdAt ? new Date(donor.createdAt).toLocaleDateString() : 'N/A'
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    fileName: `${event.title.replace(/\s+/g, '_')}_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`
  };
};

export const getAllCamps = async (bloodBankId) => {
  const camps = await BloodCamp.find({ organizer: bloodBankId }).sort({ date: -1 }).lean();
  return { camps };
};

export const getCampRegistrations = async (campId, bloodBankId) => {
  const camp = await BloodCamp.findOne({ _id: campId, organizer: bloodBankId });
  if (!camp) throw new ApiError(404, 'Blood camp not found or unauthorized');

  return {
    camp: { name: camp.name, date: camp.date, venue: camp.venue, city: camp.city },
    registrations: camp.registeredDonors,
    count: camp.registeredDonors.length
  };
};

export const removeDonorRegistration = async (campId, bloodBankId, donorIdToRemove) => {
  const camp = await BloodCamp.findOne({ _id: campId, organizer: bloodBankId });
  if (!camp) throw new ApiError(404, 'Blood camp not found or unauthorized');

  const initialLength = camp.registeredDonors.length;
  camp.registeredDonors = camp.registeredDonors.filter((donor) => {
    const donorSubdocId = donor._id ? donor._id.toString() : null;
    const donorUserId = donor.donor ? donor.donor.toString() : null;
    return donorSubdocId !== donorIdToRemove && donorUserId !== donorIdToRemove;
  });

  if (camp.registeredDonors.length === initialLength) {
    throw new ApiError(404, 'Donor registration not found');
  }

  await camp.save();
  return { remainingRegistrations: camp.registeredDonors.length };
};

export const exportCampRegistrations = async (campId, bloodBankId) => {
  const camp = await BloodCamp.findOne({ _id: campId, organizer: bloodBankId })
    .populate('registeredDonors.donor', 'name email phone bloodGroup address');

  if (!camp) throw new ApiError(404, 'Blood camp not found or unauthorized');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Camp Registrations');
  worksheet.columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Blood Group', key: 'bloodGroup', width: 12 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Registered At', key: 'registeredAt', width: 20 }
  ];

  camp.registeredDonors.forEach((registration, index) => {
    worksheet.addRow({
      sno: index + 1,
      name: registration.name || 'N/A',
      bloodGroup: registration.bloodGroup || 'N/A',
      phone: registration.phone || 'N/A',
      email: registration.donor?.email || 'N/A',
      registeredAt: new Date(registration.registeredAt).toLocaleString()
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    buffer,
    fileName: `camp_${camp.name.replace(/[^a-z0-9]/gi, '_')}_registrations.xlsx`
  };
};

// ... (other imports)

export const uploadPhoto = async (bloodBankId, localFilePath) => {
  if (!localFilePath) throw new ApiError(400, 'No file path provided');
  
  const bloodBank = await BloodBank.findById(bloodBankId);
  if (!bloodBank) throw new ApiError(404, 'Blood bank not found');

  // Delete old photo from Cloudinary if it exists
  if (bloodBank.profileImagePublicId) {
    await deleteFromCloudinary(bloodBank.profileImagePublicId);
  }

  // Upload to Cloudinary
  const cloudinaryResponse = await uploadOnCloudinary(localFilePath, 'blood-bank/profiles');
  
  if (!cloudinaryResponse) {
    throw new ApiError(500, 'Failed to upload photo to Cloudinary');
  }

  // Update blood bank profile with Cloudinary URL and Public ID
  bloodBank.profileImage = cloudinaryResponse.secure_url;
  bloodBank.profileImagePublicId = cloudinaryResponse.public_id;
  
  await bloodBank.save();
  
  return { 
    photo: bloodBank.profileImage,
    publicId: cloudinaryResponse.public_id 
  };
};

export const getDashboard = async (bloodBankId) => {
  const bloodBank = await BloodBank.findById(bloodBankId).select('name inventory').lean();
  if (!bloodBank) throw new ApiError(404, 'Blood bank not found');

  const requestStats = await BloodRequest.aggregate([
    {
      $facet: {
        pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
        approved: [{ $match: { bloodBank: bloodBankId, status: 'approved' } }, { $count: 'count' }],
        thisMonth: [
          { $match: { bloodBank: bloodBankId, createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
          { $count: 'count' }
        ]
      }
    }
  ]);

  const eventStats = await Event.aggregate([
    { $match: { organizedBy: bloodBankId, organizerModel: 'BloodBank' } },
    {
      $facet: {
        total: [{ $count: 'count' }],
        upcoming: [{ $match: { date: { $gte: new Date() }, isActive: true } }, { $count: 'count' }],
        totalRegistrations: [{ $unwind: '$registeredDonors' }, { $count: 'count' }]
      }
    }
  ]);

  return {
    bloodBank: { name: bloodBank.name, inventory: bloodBank.inventory },
    requests: {
      pending: requestStats[0].pending[0]?.count || 0,
      approved: requestStats[0].approved[0]?.count || 0,
      thisMonth: requestStats[0].thisMonth[0]?.count || 0
    },
    events: {
      total: eventStats[0].total[0]?.count || 0,
      upcoming: eventStats[0].upcoming[0]?.count || 0,
      totalRegistrations: eventStats[0].totalRegistrations[0]?.count || 0
    }
  };
};

export const getProfile = async (bloodBankId) => {
  const bloodBank = await BloodBank.findById(bloodBankId).select(BLOOD_BANK_SAFE_FIELDS).lean();
  if (!bloodBank) throw new ApiError(404, 'Blood bank not found');
  return sanitizeBloodBank(bloodBank);
};

export const updateProfile = async (bloodBankId, payload) => {
  const bloodBank = await BloodBank.findById(bloodBankId);
  if (!bloodBank) throw new ApiError(404, 'Blood bank not found');

  const allowedUpdates = ['name', 'phone', 'logo', 'imageUrl', 'address', 'location', 'operatingHours', 'services', 'contactPerson', 'establishedYear'];
  allowedUpdates.forEach((field) => {
    if (payload[field] !== undefined) bloodBank[field] = payload[field];
  });

  await bloodBank.save();
  const updatedBloodBank = await BloodBank.findById(bloodBank._id).select(BLOOD_BANK_SAFE_FIELDS).lean();
  return sanitizeBloodBank(updatedBloodBank);
};

export const changePassword = async (bloodBankId, currentPassword, newPassword) => {
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Please provide current and new password');
  if (currentPassword === newPassword) throw new ApiError(400, 'New password must be different from current password');
  validationService.validatePassword(newPassword);

  const bloodBank = await BloodBank.findById(bloodBankId).select('+password +tokenVersion');
  if (!bloodBank) throw new ApiError(404, 'Blood bank not found');

  const isMatch = await bloodBank.comparePassword(currentPassword);
  if (!isMatch) throw new ApiError(401, 'Current password is incorrect');

  bloodBank.password = newPassword;
  bloodBank.tokenVersion = Number(bloodBank.tokenVersion || 0) + 1;
  bloodBank.passwordChangedAt = new Date();
  await bloodBank.save();
  await revokeAllPrincipalSessions({ role: 'bloodbank', bloodBankId: bloodBank._id, reason: 'password_change' });
  return { success: true };
};

export const getInventory = async (bloodBankId) => {
  const inventory = await Inventory.findOne({ bloodBank: bloodBankId }).lean();
  if (!inventory) {
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    return bloodGroups.map((group) => ({ bloodGroup: group, units: 0, lastUpdated: new Date() }));
  }
  return inventory.items || [];
};

export const updateInventory = async (bloodBankId, inventory) => {
  if (!Array.isArray(inventory)) throw new ApiError(400, 'Inventory must be an array');

  const validatedInventory = inventory.map((item) => ({
    bloodGroup: item.bloodGroup || item.type,
    units: parseInt(item.units, 10) || 0,
    lastUpdated: new Date()
  }));

  let doc = await Inventory.findOne({ bloodBank: bloodBankId });
  if (!doc) {
    const bloodBank = await BloodBank.findById(bloodBankId);
    if (!bloodBank) throw new ApiError(404, 'Blood bank not found');

    doc = new Inventory({ bloodBank: bloodBankId, bloodBankName: bloodBank.name, items: validatedInventory });
  } else {
    doc.items = validatedInventory;
    doc.markModified('items');
  }

  const saved = await doc.save();
  return saved.items;
};

export const updateBloodGroupUnits = async (bloodBankId, bloodGroup, units) => {
  if (units === undefined || units < 0) throw new ApiError(400, 'Please provide valid units (>=0)');

  const bloodBank = await BloodBank.findById(bloodBankId);
  if (!bloodBank) throw new ApiError(404, 'Blood bank not found');

  const inventoryItem = bloodBank.inventory.find((item) => item.bloodGroup === bloodGroup);
  if (inventoryItem) {
    inventoryItem.units = units;
    inventoryItem.lastUpdated = new Date();
  } else {
    bloodBank.inventory.push({ bloodGroup, units, lastUpdated: new Date() });
  }

  await bloodBank.save();
  return bloodBank.inventory;
};
