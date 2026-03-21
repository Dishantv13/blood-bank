import BloodRequest from '../models/BloodRequest.model.js';
import BloodBank from '../models/BloodBank.model.js';
import BloodCamp from '../models/BloodCamp.model.js';
import Inventory from '../models/Inventory.model.js';
import Event from '../models/Event.model.js';
import ExcelJS from 'exceljs';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse, errorResponse } from '../utils/response.js';

// Middleware to verify blood bank authentication
// const bloodBankAuth = async (req, res, next) => {
//   try {
//     const token = req.header('Authorization')?.replace('Bearer ', '');
    
//     if (!token) {
//       return res.status(401).json({ message: 'No authentication token, access denied' });
//     }

//     const jwt = require('jsonwebtoken');
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     if (decoded.type !== 'bloodbank') {
//       return res.status(403).json({ message: 'Access denied. Blood banks only.' });
//     }

//     req.bloodBank = decoded;
//     next();
//   } catch (error) {
//     res.status(401).json({ message: 'Token is invalid or expired' });
//   }
// };

// ==================== BLOOD REQUEST MANAGEMENT ====================

const buildBloodBankAddress = (address = {}) => {
  if (!address) return '';
  if (typeof address === 'string') return address;

  return [address.street, address.city, address.state, address.pincode || address.zipCode]
    .filter(Boolean)
    .join(', ');
};

const adjustInventoryUnits = async (bloodBankId, bloodGroup, unitsToDeduct) => {
  const inventoryDoc = await Inventory.findOne({ bloodBank: bloodBankId });

  if (!inventoryDoc) {
    throw new Error('Inventory record not found for this blood bank');
  }

  const inventoryItem = inventoryDoc.items.find((item) => item.bloodGroup === bloodGroup);
  if (!inventoryItem || inventoryItem.units < unitsToDeduct) {
    throw new Error(`Insufficient ${bloodGroup} units available`);
  }

  inventoryItem.units -= unitsToDeduct;
  inventoryItem.lastUpdated = new Date();
  inventoryDoc.markModified('items');
  await inventoryDoc.save();

  const bloodBank = await BloodBank.findById(bloodBankId);
  if (bloodBank) {
    const bankInventoryItem = bloodBank.inventory.find((item) => item.bloodGroup === bloodGroup);
    if (bankInventoryItem) {
      bankInventoryItem.units = Math.max(0, bankInventoryItem.units - unitsToDeduct);
      bankInventoryItem.lastUpdated = new Date();
      await bloodBank.save();
    }
  }
};

const addInventoryUnits = async (bloodBankId, bloodGroup, unitsToAdd) => {
  if (!unitsToAdd || unitsToAdd <= 0) return;

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  let inventoryDoc = await Inventory.findOne({ bloodBank: bloodBankId });

  if (!inventoryDoc) {
    const bank = await BloodBank.findById(bloodBankId);
    inventoryDoc = new Inventory({
      bloodBank: bloodBankId,
      bloodBankName: bank?.name || 'Blood Bank',
      items: bloodGroups.map((group) => ({
        bloodGroup: group,
        units: 0,
        lastUpdated: new Date()
      }))
    });
  }

  let inventoryItem = inventoryDoc.items.find((item) => item.bloodGroup === bloodGroup);
  if (!inventoryItem) {
    inventoryItem = { bloodGroup, units: 0, lastUpdated: new Date() };
    inventoryDoc.items.push(inventoryItem);
  }

  inventoryItem.units += unitsToAdd;
  inventoryItem.lastUpdated = new Date();
  inventoryDoc.markModified('items');
  await inventoryDoc.save();

  const bloodBank = await BloodBank.findById(bloodBankId);
  if (bloodBank) {
    let bankInventoryItem = bloodBank.inventory.find((item) => item.bloodGroup === bloodGroup);
    if (!bankInventoryItem) {
      bloodBank.inventory.push({ bloodGroup, units: unitsToAdd, lastUpdated: new Date() });
    } else {
      bankInventoryItem.units += unitsToAdd;
      bankInventoryItem.lastUpdated = new Date();
    }
    await bloodBank.save();
  }
};

// Get all blood requests for blood bank
const getAllRequests = asyncHandler(async (req, res) => {
  const { status, bloodGroup, urgency, requestType, direction, limit, page } = req.query;
    const bloodBankId = req.bloodBank.bloodBankId;
    const effectiveStatus = status || 'pending';
    const pendingStatuses = effectiveStatus === 'pending'
      ? ['pending', null]
      : [effectiveStatus];

    let query;

    if (effectiveStatus === 'pending') {
      query = {
        status: 'pending',
        $or: [
          {
            requestType: 'user',
            'bloodBankResponse.status': { $in: ['pending', null] }
          },
          {
            requestType: 'bloodbank',
            targetBloodBank: bloodBankId,
            'bloodBankResponse.status': { $in: ['pending', null] }
          }
        ]
      };
    } else {
      query = {
        status: effectiveStatus,
        $or: [
          {
            requestType: 'user',
            bloodBank: bloodBankId,
            'bloodBankResponse.status': { $in: pendingStatuses }
          },
          {
            requestType: 'bloodbank',
            $or: [
              { targetBloodBank: bloodBankId },
              { requestingBloodBank: bloodBankId }
            ],
            'bloodBankResponse.status': { $in: pendingStatuses }
          }
        ]
      };
    }

    const directionFilter = direction === 'sent' || direction === 'received' ? direction : 'all';
    if (directionFilter !== 'all') {
      query.$or = query.$or
        .map((entry) => {
          if (entry.requestType !== 'bloodbank') return entry;

          const scopedEntry = { ...entry };
          if (scopedEntry.$or) {
            scopedEntry.$or = scopedEntry.$or.filter((condition) => (
              directionFilter === 'sent'
                ? Object.prototype.hasOwnProperty.call(condition, 'requestingBloodBank')
                : Object.prototype.hasOwnProperty.call(condition, 'targetBloodBank')
            ));

            if (!scopedEntry.$or.length) return null;
          } else if (directionFilter === 'sent') {
            delete scopedEntry.targetBloodBank;
            scopedEntry.requestingBloodBank = bloodBankId;
          } else {
            delete scopedEntry.requestingBloodBank;
            scopedEntry.targetBloodBank = bloodBankId;
          }

          return scopedEntry;
        })
        .filter(Boolean);
    }

    if (requestType === 'user' || requestType === 'bloodbank') {
      query.$or = query.$or.filter((entry) => entry.requestType === requestType);
    }
    
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (urgency) query.urgency = urgency;

    // Pagination support
    const parsedLimit = Number(limit) || 20;
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const [requests, total] = await Promise.all([
      BloodRequest.find(query)
        .populate([
          { path: 'requestedBy', select: 'name email phone bloodGroup' },
          { path: 'requestingBloodBank', select: 'name email phone address' },
          { path: 'targetBloodBank', select: 'name email phone address' }
        ])
        .sort({ urgency: -1, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      BloodRequest.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: requests.length,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      requests
    });
});

// Get approved blood requests by this blood bank
const getApprovedRequests = asyncHandler(async (req, res) => {
    const bloodBankId = req.bloodBank.bloodBankId;
  const { requestType, direction, limit, page } = req.query;

    const approvedQuery = {
      status: 'approved',
      $or: [
        { requestType: 'user', bloodBank: bloodBankId },
        {
          requestType: 'bloodbank',
          $or: [
            { targetBloodBank: bloodBankId },
            { requestingBloodBank: bloodBankId }
          ]
        }
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

          const scopedEntry = { ...entry };
          scopedEntry.$or = scopedEntry.$or.filter((condition) => (
            directionFilter === 'sent'
              ? Object.prototype.hasOwnProperty.call(condition, 'requestingBloodBank')
              : Object.prototype.hasOwnProperty.call(condition, 'targetBloodBank')
          ));

          if (!scopedEntry.$or.length) return null;
          return scopedEntry;
        })
        .filter(Boolean);
    }

    // Pagination support
    const parsedLimit = Number(limit) || 20;
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    const [approvedRequests, total] = await Promise.all([
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

    res.json({
      success: true,
      count: approvedRequests.length,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
      requests: approvedRequests
    });
});

// Get single blood request details
const getRequestDetails = asyncHandler(async (req, res) => {
  const request = await BloodRequest.findById(req.params.id)
    .populate([
      { path: 'requestedBy', select: 'name email phone bloodGroup address' },
      { path: 'requestingBloodBank', select: 'name email phone address' },
      { path: 'targetBloodBank', select: 'name email phone address' },
      { path: 'bloodBankResponse.respondedBy', select: 'name' }
    ])
    .lean();

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json({ success: true, request });
});

// Create a bank-to-bank blood request
const createBankToBankRequest = asyncHandler(async (req, res) => {
  const { targetBloodBankId, bloodGroup, units, urgency, description } = req.body;

  if (!targetBloodBankId || !bloodGroup || !units) {
    return res.status(400).json({ message: 'Target blood bank, blood group, and units are required' });
  }

  const requestingBankId = req.bloodBank.bloodBankId;
  if (String(requestingBankId) === String(targetBloodBankId)) {
    return res.status(400).json({ message: 'You cannot request blood from your own blood bank' });
  }

  const [requestingBank, targetBloodBank] = await Promise.all([
    BloodBank.findById(requestingBankId),
    BloodBank.findById(targetBloodBankId)
  ]);

  if (!requestingBank || !targetBloodBank) {
    return res.status(404).json({ message: 'Blood bank not found' });
  }

  const transferRequest = await BloodRequest.create({
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
    bloodBankResponse: {
      status: 'pending'
    }
  });

  await transferRequest.populate('requestingBloodBank', 'name email phone address');
  await transferRequest.populate('targetBloodBank', 'name email phone address');

  res.status(201).json({
    success: true,
    message: 'Blood request sent to the selected blood bank',
    request: transferRequest
  });
});

// Approve a blood request
const approveRequest = asyncHandler(async (req, res) => {
  const { responseNote } = req.body;
  const responderBankId = req.bloodBank.bloodBankId;
  
  const request = await BloodRequest.findById(req.params.id);
  
  if (!request) {
    return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is no longer pending' });
    }

    if (request.requestType === 'bloodbank') {
      if (String(request.targetBloodBank) !== String(responderBankId)) {
        return res.status(403).json({ message: 'You can only approve requests sent to your blood bank' });
      }

      await adjustInventoryUnits(responderBankId, request.bloodGroup, request.units);
      await addInventoryUnits(request.requestingBloodBank, request.bloodGroup, request.units);
    } else {
      await adjustInventoryUnits(responderBankId, request.bloodGroup, request.units);
    }

    // Update request with blood bank response
    request.status = 'approved';
    request.bloodBank = responderBankId;
    request.bloodBankResponse = {
      status: 'approved',
      respondedAt: new Date(),
      respondedBy: responderBankId,
      responseNote: responseNote || 'Request approved. Please contact us for collection.'
    };

    await request.save();

    // Populate for response
    // Combined populate for better performance (1 call instead of 4)
    await request.populate([
      { path: 'requestedBy', select: 'name email phone' },
      { path: 'requestingBloodBank', select: 'name email phone address' },
      { path: 'targetBloodBank', select: 'name email phone address' },
      { path: 'bloodBank', select: 'name phone email address' }
    ]);

    res.json({
      success: true,
      message: 'Blood request approved successfully',
      request
    });
});

// Reject a blood request
const rejectRequest = asyncHandler(async (req, res) => {
  const { responseNote } = req.body;
    
    const request = await BloodRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is no longer pending' });
    }

    if (request.requestType === 'bloodbank' && String(request.targetBloodBank) !== String(req.bloodBank.bloodBankId)) {
      return res.status(403).json({ message: 'You can only reject requests sent to your blood bank' });
    }

    // Update request with blood bank response
    request.status = 'rejected';
    request.bloodBank = req.bloodBank.bloodBankId;
    request.bloodBankResponse = {
      status: 'rejected',
      respondedAt: new Date(),
      respondedBy: req.bloodBank.bloodBankId,
      responseNote: responseNote || 'Unable to fulfill this request at this time.'
    };

    await request.save();

    // Populate for response
    // Combined populate for better performance (1 call instead of 4)
    await request.populate([
      { path: 'requestedBy', select: 'name email phone' },
      { path: 'requestingBloodBank', select: 'name email phone address' },
      { path: 'targetBloodBank', select: 'name email phone address' },
      { path: 'bloodBank', select: 'name phone email' }
    ]);

    res.json({
      success: true,
      message: 'Blood request rejected',
      request
    });
});

// Get blood request statistics for dashboard
const getRequestStats = asyncHandler(async (req, res) => {
    const bloodBankId = req.bloodBank.bloodBankId;
    
    const stats = await BloodRequest.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          pending: [
            { $match: { status: 'pending' } },
            { $count: 'count' }
          ],
          approved: [
            { $match: { bloodBank: bloodBankId, status: 'approved' } },
            { $count: 'count' }
          ],
          rejected: [
            { $match: { bloodBank: bloodBankId, status: 'rejected' } },
            { $count: 'count' }
          ],
          byBloodGroup: [
            { $match: { status: 'pending' } },
            { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }
          ],
          byUrgency: [
            { $match: { status: 'pending' } },
            { $group: { _id: '$urgency', count: { $sum: 1 } } }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        total: stats[0].total[0]?.count || 0,
        pending: stats[0].pending[0]?.count || 0,
        approved: stats[0].approved[0]?.count || 0,
        rejected: stats[0].rejected[0]?.count || 0,
        byBloodGroup: stats[0].byBloodGroup,
        byUrgency: stats[0].byUrgency
      }
    });
});

// ==================== EVENT MANAGEMENT ====================

// Get all events organized by this blood bank
const getAllEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({ 
    organizedBy: req.bloodBank.bloodBankId,
    organizerModel: 'BloodBank'
  })
    .populate('registeredDonors', 'name email phone bloodGroup')
    .sort({ date: 1 })
    .lean();

    res.json({ success: true, count: events.length, events });
});

// Create a new event
const createEvent = asyncHandler(async (req, res) => {
  const bloodBank = await BloodBank.findById(req.bloodBank.bloodBankId);
    
    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    const eventData = {
      ...req.body,
      organizer: bloodBank.name,
      organizedBy: req.bloodBank.bloodBankId,
      organizerModel: 'BloodBank',
      visibility: req.body.visibility || 'public'
    };

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({
      success: true,
      message: 'Event created successfully and is now visible to users',
      event
    });
});

// Update an event
const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findOne({
      _id: req.params.id,
      organizedBy: req.bloodBank.bloodBankId
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found or unauthorized' });
    }

    const allowedUpdates = [
      'title', 'description', 'eventType', 'location', 'date',
      'startTime', 'endTime', 'contactInfo', 'expectedDonors',
      'isActive', 'visibility', 'maxParticipants'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      event
    });
});

// Delete/Cancel an event
const deleteEvent = asyncHandler(async (req, res) => {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      organizedBy: req.bloodBank.bloodBankId
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found or unauthorized' });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
});

// Get all registrations for an event
const getEventRegistrations = asyncHandler(async (req, res) => {
    const event = await Event.findOne({
      _id: req.params.id,
      organizedBy: req.bloodBank.bloodBankId
    }).populate('registeredDonors', 'name email phone bloodGroup address lastDonationDate isDonor donorInfo');

    if (!event) {
      return res.status(404).json({ message: 'Event not found or unauthorized' });
    }

    res.json({
      success: true,
      event: {
        title: event.title,
        date: event.date,
        location: event.location
      },
      registrations: event.registeredDonors,
      count: event.registeredDonors.length
    });
});

// Export event registrations to Excel file
const exportEventRegistrations = asyncHandler(async (req, res) => {
    const event = await Event.findOne({
      _id: req.params.id,
      organizedBy: req.bloodBank.bloodBankId
    }).populate('registeredDonors', 'name email phone bloodGroup address lastDonationDate isDonor donorInfo createdAt');

    if (!event) {
      return res.status(404).json({ message: 'Event not found or unauthorized' });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Event Registrations');

    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = `Event: ${event.title}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    
    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `Date: ${new Date(event.date).toLocaleDateString()} | Location: ${event.location?.name || 'N/A'}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.getRow(4).values = [
      'S.No', 'Name', 'Email', 'Phone', 'Blood Group', 'Address', 'Last Donation', 'Registration Date', 'Health Status', 'Notes'
    ];
    
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(4).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE74C3C' }
    };
    worksheet.getRow(4).alignment = { horizontal: 'center', vertical: 'middle' };

    event.registeredDonors.forEach((donor, index) => {
      const row = worksheet.addRow([
        index + 1,
        donor.name || 'N/A',
        donor.email || 'N/A',
        donor.phone || 'N/A',
        donor.bloodGroup || 'N/A',
        donor.address || 'N/A',
        donor.lastDonationDate ? new Date(donor.lastDonationDate).toLocaleDateString() : 'Never',
        new Date(donor.createdAt).toLocaleDateString(),
        donor.isDonor ? 'Active Donor' : 'New Registration',
        donor.donorInfo?.diseases?.length > 0 ? `Diseases: ${donor.donorInfo.diseases.join(', ')}` : 'No health issues reported'
      ]);
      
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F9FA' }
        };
      }
    });

    worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    const summaryRow = worksheet.addRow([]);
    summaryRow.getCell(1).value = 'Total Registrations:';
    summaryRow.getCell(2).value = event.registeredDonors.length;
    summaryRow.font = { bold: true };

    const fileName = `${event.title.replace(/\s+/g, '_')}_Registrations_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
});

// ==================== BLOOD CAMP MANAGEMENT ====================

// Get all blood camps for this blood bank
const getAllCamps = asyncHandler(async (req, res) => {
    // console.log('Blood bank requesting camps. ID:', req.bloodBank.bloodBankId);
    
    const camps = await BloodCamp.find({ organizer: req.bloodBank.bloodBankId })
      .sort({ date: -1 })
      .lean();
    
    // console.log(`Fetched ${camps.length} camps for blood bank ${req.bloodBank.bloodBankId}`);
    
    res.json({
      success: true,
      camps
    });
});

// Get registrations for a specific blood camp
const getCampRegistrations = asyncHandler(async (req, res) => {
    const camp = await BloodCamp.findOne({
      _id: req.params.id,
      organizer: req.bloodBank.bloodBankId
    });

    if (!camp) {
      return res.status(404).json({ message: 'Blood camp not found or unauthorized' });
    }

    res.json({
      success: true,
      camp: {
        name: camp.name,
        date: camp.date,
        venue: camp.venue,
        city: camp.city
      },
      registrations: camp.registeredDonors,
      count: camp.registeredDonors.length
    });
});

// Remove a specific donor registration from a camp
const removeDonorRegistration = asyncHandler(async (req, res) => {
    const camp = await BloodCamp.findOne({
      _id: req.params.id,
      organizer: req.bloodBank.bloodBankId
    });

    if (!camp) {
      return res.status(404).json({ message: 'Blood camp not found or unauthorized' });
    }

    const initialLength = camp.registeredDonors.length;
    const donorIdToRemove = req.params.donorId;
    
    camp.registeredDonors = camp.registeredDonors.filter(donor => {
      const donorSubdocId = donor._id ? donor._id.toString() : null;
      const donorUserId = donor.donor ? donor.donor.toString() : null;
      
      return donorSubdocId !== donorIdToRemove && donorUserId !== donorIdToRemove;
    });

    if (camp.registeredDonors.length === initialLength) {
      return res.status(404).json({ 
        message: 'Donor registration not found',
        debug: { attemptedId: donorIdToRemove, totalRegistrations: initialLength }
      });
    }

    await camp.save();

    res.json({
      success: true,
      message: 'Donor registration removed successfully',
      remainingRegistrations: camp.registeredDonors.length
    });
});

// Export camp registrations to Excel
const exportCampRegistrations = asyncHandler(async (req, res) => {
    const camp = await BloodCamp.findOne({
      _id: req.params.id,
      organizer: req.bloodBank.bloodBankId
    }).populate('registeredDonors.donor', 'name email phone bloodGroup address');

    if (!camp) {
      return res.status(404).json({ message: 'Blood camp not found or unauthorized' });
    }

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

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE63946' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=camp_${camp.name.replace(/[^a-z0-9]/gi, '_')}_registrations.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
});

// ==================== SETTINGS ====================

// Upload blood bank photo
const uploadPhoto = asyncHandler(async (req, res) => {
    const { photo } = req.body;
    
    if (!photo) {
      return res.status(400).json({ message: 'No photo provided' });
    }

    const bloodBank = await BloodBank.findById(req.bloodBank.bloodBankId);
    
    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    bloodBank.profileImage = photo;
    await bloodBank.save();

    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      photo: bloodBank.profileImage
    });
});

// ==================== DASHBOARD & ANALYTICS ====================

// Get dashboard data for blood bank
const getDashboard = asyncHandler(async (req, res) => {
    const bloodBankId = req.bloodBank.bloodBankId;

    const bloodBank = await BloodBank.findById(bloodBankId).select('name inventory').lean();

    const requestStats = await BloodRequest.aggregate([
      {
        $facet: {
          pending: [
            { $match: { status: 'pending' } },
            { $count: 'count' }
          ],
          approved: [
            { $match: { bloodBank: bloodBankId, status: 'approved' } },
            { $count: 'count' }
          ],
          thisMonth: [
            { 
              $match: { 
                bloodBank: bloodBankId,
                createdAt: { 
                  $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
                }
              } 
            },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const eventStats = await Event.aggregate([
      {
        $match: {
          organizedBy: bloodBankId,
          organizerModel: 'BloodBank'
        }
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          upcoming: [
            { $match: { date: { $gte: new Date() }, isActive: true } },
            { $count: 'count' }
          ],
          totalRegistrations: [
            { $unwind: '$registeredDonors' },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const dashboardData = {
      bloodBank: {
        name: bloodBank.name,
        inventory: bloodBank.inventory
      },
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

    return successResponse(res, dashboardData, 200, 'Dashboard data fetched successfully');
});

// ==================== SETTINGS & PROFILE MANAGEMENT ====================

// Get blood bank profile details
const getProfile = asyncHandler(async (req, res) => {
    const bloodBank = await BloodBank.findById(req.bloodBank.bloodBankId).select('-password').lean();
    
    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    return successResponse(res, bloodBank, 200, 'Profile fetched successfully');
});

// Update blood bank profile
const updateProfile = asyncHandler(async (req, res) => {
    const bloodBank = await BloodBank.findById(req.bloodBank.bloodBankId);
    
    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    const allowedUpdates = [
      'name', 'phone', 'logo', 'imageUrl', 'address', 'location',
      'operatingHours', 'services', 'contactPerson', 'establishedYear'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        bloodBank[field] = req.body[field];
      }
    });

    await bloodBank.save();
    const updatedBank = await BloodBank.findById(bloodBank._id).select('-password');

    return successResponse(res, updatedBank, 200, 'Profile updated successfully');
});

// Change blood bank password
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const bloodBank = await BloodBank.findById(req.bloodBank.bloodBankId);
    
    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    // Verify current password
    const isMatch = await bloodBank.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    bloodBank.password = newPassword;
    await bloodBank.save();

    return successResponse(res, null, 200, 'Password changed successfully');
});

// Get blood inventory
const getInventory = asyncHandler(async (req, res) => {
    let inventory = await Inventory.findOne({ bloodBank: req.bloodBank.bloodBankId });
    
    if (!inventory) {
      console.log('⚠️  No inventory found for blood bank:', req.bloodBank.bloodBankId);
      
      const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      const emptyInventory = bloodGroups.map(group => ({
        bloodGroup: group,
        units: 0,
        lastUpdated: new Date()
      }));
      
      return successResponse(res, emptyInventory, 200, 'New inventory initialized');
    }

    return successResponse(res, inventory.items || [], 200, 'Inventory fetched successfully');
});

// Update blood inventory
const updateInventory = asyncHandler(async (req, res) => {
    const { inventory } = req.body;

    if (!Array.isArray(inventory)) {
      return res.status(400).json({ message: 'Inventory must be an array' });
    }

    const validatedInventory = inventory.map(item => ({
      bloodGroup: item.bloodGroup || item.type,
      units: parseInt(item.units) || 0,
      lastUpdated: new Date()
    }));

    let inventoryDoc = await Inventory.findOne({ bloodBank: req.bloodBank.bloodBankId });
    
    if (!inventoryDoc) {
      const bloodBank = await BloodBank.findById(req.bloodBank.bloodBankId);
      if (!bloodBank) {
        return res.status(404).json({ message: 'Blood bank not found' });
      }

      inventoryDoc = new Inventory({
        bloodBank: req.bloodBank.bloodBankId,
        bloodBankName: bloodBank.name,
        items: validatedInventory
      });
    } else {
      inventoryDoc.items = validatedInventory;
      inventoryDoc.markModified('items');
    }

    const savedDoc = await inventoryDoc.save();

    return successResponse(res, savedDoc.items, 200, 'Inventory updated successfully');
});

// Update specific blood group units
const updateBloodGroupUnits = asyncHandler(async (req, res) => {
    const { bloodGroup } = req.params;
    const { units } = req.body;

    if (units === undefined || units < 0) {
      return res.status(400).json({ message: 'Please provide valid units (>=0)' });
    }

    const bloodBank = await BloodBank.findById(req.bloodBank.bloodBankId);
    
    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    const inventoryItem = bloodBank.inventory.find(item => item.bloodGroup === bloodGroup);
    
    if (inventoryItem) {
      inventoryItem.units = units;
      inventoryItem.lastUpdated = new Date();
    } else {
      bloodBank.inventory.push({
        bloodGroup,
        units,
        lastUpdated: new Date()
      });
    }

    await bloodBank.save();

    return successResponse(res, bloodBank.inventory, 200, `${bloodGroup} inventory updated to ${units} units`);
});

export {
  getAllRequests,
  getApprovedRequests,
  getRequestDetails,
  createBankToBankRequest,
  approveRequest,
  rejectRequest,
  getRequestStats,
  getAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventRegistrations,
  exportEventRegistrations,
  getAllCamps,
  getCampRegistrations,
  removeDonorRegistration,
  exportCampRegistrations,
  uploadPhoto,
  getDashboard,
  getProfile, 
  updateProfile,
  changePassword,
  getInventory,
  updateInventory,
  updateBloodGroupUnits
}