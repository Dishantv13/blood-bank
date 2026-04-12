import ExcelJS from 'exceljs';
import BloodCamp from '../models/BloodCamp.model.js';
import User from '../models/User.model.js';
import Donation from '../models/Donation.model.js';
import { ApiError } from '../utils/apiError.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { sendRegistrationConfirmationEmail } from '../utils/emailService.js';
import { createNotification, broadcastNotification } from './notificationService.js';

const CAMP_LIST_FIELDS = '_id name organizer organizerName date startTime endTime venue address city state targetUnits collectedUnits description contactPhone status registeredDonors.donor';

export const getAllCamps = async (query) => {
  const { city, status, upcoming } = query;
  const { page, limit, skip } = getPaginationParams({ query });
  const filter = {};
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (city) filter.city = new RegExp(city, 'i');
  if (status) filter.status = status;
  if (upcoming === 'true' || !status) {
    filter.date = { $gte: startOfToday };
    filter.status = { $in: ['scheduled', 'upcoming'] };
  }

  const [camps, total] = await Promise.all([
    BloodCamp.find(filter)
      .select(CAMP_LIST_FIELDS)
      .populate('organizer', 'name email phone')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BloodCamp.countDocuments(filter)
  ]);

  return buildPaginatedResponse(camps, total, page, limit);
};

export const getCampById = async (campId) => {
  const camp = await BloodCamp.findById(campId)
    .populate('organizer', 'name email phone address')
    .lean();

  if (!camp) throw new ApiError(404, 'Blood camp not found');
  return camp;
};

export const createCamp = async (bloodBank, data) => {
  const camp = new BloodCamp({
    ...data,
    organizer: bloodBank._id,
    organizerName: bloodBank.name,
    contactPhone: data.contactPhone || bloodBank.phone,
    contactEmail: data.contactEmail || bloodBank.email
  });

  await camp.save();

  // Notify all users about the new camp
  broadcastNotification({
    title: 'New Blood Donation Camp',
    message: `${bloodBank.name} has organized a new blood donation camp: ${camp.name}. Join us to save lives!`,
    type: 'event', // Use 'event' type for both events and camps in notifications
    actionUrl: '/events'
  }).catch(err => console.error('Broadcast notification for camp failed:', err));

  return camp;
};

export const updateCamp = async (campId, bloodBankId, data) => {
  const camp = await BloodCamp.findById(campId);
  if (!camp) throw new ApiError(404, 'Blood camp not found');

  if (camp.organizer.toString() !== bloodBankId.toString()) {
    throw new ApiError(403, 'Not authorized to update this camp');
  }

  const updateFields = [
    'name', 'date', 'startTime', 'endTime', 'venue', 'address', 'city', 'state', 'pincode',
    'targetUnits', 'description', 'status'
  ];

  updateFields.forEach((field) => {
    if (data[field] !== undefined) camp[field] = data[field];
  });

  await camp.save();
  return camp;
};

export const deleteCamp = async (campId, bloodBankId) => {
  const camp = await BloodCamp.findById(campId);
  if (!camp) throw new ApiError(404, 'Blood camp not found');

  if (camp.organizer.toString() !== bloodBankId.toString()) {
    throw new ApiError(403, 'Not authorized to delete this camp');
  }

  await BloodCamp.findByIdAndDelete(campId);
  return { success: true };
};

export const registerCamp = async (campId, userId) => {
  const camp = await BloodCamp.findById(campId);
  if (!camp) throw new ApiError(404, 'Blood camp not found');

  const user = await User.findById(userId).select('name email phone bloodGroup donorInfo');
  if (!user) throw new ApiError(404, 'User not found');

  const alreadyRegistered = camp.registeredDonors.some(
    (donor) => donor && donor.donor && donor.donor.toString() === userId.toString()
  );
  if (alreadyRegistered) throw new ApiError(400, 'You have already registered for this camp');

  if (user.donorInfo?.lastDonationDate) {
    const lastDate = new Date(user.donorInfo.lastDonationDate);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    if (lastDate > threeMonthsAgo) {
      throw new ApiError(400, 'You must wait 3 months after your last donation to donate again.');
    }
  }

  camp.registeredDonors.push({
    donor: userId,
    name: user.name || 'Unknown',
    phone: user.phone || 'Not provided',
    bloodGroup: user.bloodGroup || 'Not specified',
    registeredAt: new Date()
  });

  const donation = new Donation({
    donor: userId,
    bloodBank: camp.organizer,
    camp: camp._id,
    type: 'camp',
    bloodGroup: user.bloodGroup || 'O+',
    donationDate: camp.date,
    notes: `Registered for camp: ${camp.name}`,
    status: 'pending'
  });

  await Promise.all([camp.save(), donation.save()]);

  // Send confirmation email (async)
  sendRegistrationConfirmationEmail(user, 'camp', camp)
    .catch(err => console.error('Camp registration email failed:', err));

  // Create in-app notification
  createNotification({
    recipient: user._id,
    recipientModel: 'User',
    title: 'Camp Registration Confirmed',
    message: `You have successfully registered for the camp: ${camp.name}.`,
    type: 'event',
    actionUrl: '/dashboard'
  }).catch(err => console.error('In-app notification failed:', err));

  return {
    registration: {
      name: user.name,
      bloodGroup: user.bloodGroup,
      phone: user.phone
    }
  };
};

export const getMyCamps = async (bloodBankId) => {
  return BloodCamp.find({ organizer: bloodBankId }).sort({ date: -1 }).lean();
};

export const updateCollectedUnits = async (campId, bloodBankId, collectedUnits) => {
  const camp = await BloodCamp.findById(campId);
  if (!camp) throw new ApiError(404, 'Blood camp not found');
  if (camp.organizer.toString() !== bloodBankId.toString()) throw new ApiError(403, 'Not authorized');

  camp.collectedUnits = collectedUnits;
  await camp.save();
  return camp;
};

export const cleanupRegistrations = async () => {
  const camps = await BloodCamp.find({ 'registeredDonors.0': { $exists: true } });
  let removed = 0;

  for (const camp of camps) {
    const before = camp.registeredDonors.length;
    camp.registeredDonors = camp.registeredDonors.filter((donor) => {
      const hasValidName = donor.name && donor.name !== 'Unknown' && donor.name.trim() !== '';
      const hasValidDonor = donor.donor && donor.donor.toString().length === 24;
      if (!hasValidName || !hasValidDonor) {
        removed += 1;
        return false;
      }
      return true;
    });
    if (before !== camp.registeredDonors.length) await camp.save();
  }

  return { removed, campsProcessed: camps.length };
};

export const fixRegistrations = async () => {
  const camps = await BloodCamp.find({ 'registeredDonors.0': { $exists: true } });
  let fixed = 0;
  let errors = 0;

  for (const camp of camps) {
    let updated = false;
    for (let i = 0; i < camp.registeredDonors.length; i += 1) {
      const donor = camp.registeredDonors[i];
      if (!donor.name || !donor.phone || !donor.bloodGroup || donor.name === 'Unknown' || donor.phone === 'Not provided') {
        try {
          const user = await User.findById(donor.donor).select('name phone bloodGroup');
          if (user) {
            camp.registeredDonors[i].name = user.name || 'Unknown';
            camp.registeredDonors[i].phone = user.phone || 'Not provided';
            camp.registeredDonors[i].bloodGroup = user.bloodGroup || 'Not specified';
            fixed += 1;
            updated = true;
          } else {
            errors += 1;
          }
        } catch {
          errors += 1;
        }
      }
    }
    if (updated) await camp.save();
  }

  return { fixed, errors, campsProcessed: camps.length };
};

export const exportRegistrations = async (campId, bloodBankId) => {
  const camp = await BloodCamp.findById(campId)
    .populate('registeredUsers', 'name email phone bloodGroup city state age gender address')
    .lean();

  if (!camp) throw new ApiError(404, 'Blood camp not found');
  if (camp.organizer.toString() !== bloodBankId.toString()) throw new ApiError(403, 'Not authorized to export this camp\'s data');
  if (!camp.registeredUsers || camp.registeredUsers.length === 0) throw new ApiError(400, 'No registered users to export');

  const workbook = new ExcelJS.Workbook();
  const infoSheet = workbook.addWorksheet('Camp Info');
  infoSheet.addRow(['Camp Name', camp.name]);
  infoSheet.addRow(['Date', new Date(camp.date).toLocaleDateString()]);
  infoSheet.addRow(['Total Registrations', camp.registeredUsers.length]);

  const regSheet = workbook.addWorksheet('Registrations');
  regSheet.columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Blood Group', key: 'bloodGroup', width: 12 }
  ];
  camp.registeredUsers.forEach((user, index) => {
    regSheet.addRow({
      sno: index + 1,
      name: user.name || 'N/A',
      email: user.email || 'N/A',
      phone: user.phone || 'N/A',
      bloodGroup: user.bloodGroup || 'N/A'
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${camp.name.replace(/[^a-z0-9]/gi, '_')}_registrations.xlsx`;
  return { buffer, filename };
};