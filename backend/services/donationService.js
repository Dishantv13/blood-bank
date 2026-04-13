import Donation from '../models/Donation.model.js';
import User from '../models/User.model.js';
import mongoose from 'mongoose';
import { validateDonation, validateBloodGroup } from './validationService.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import { ApiError } from '../utils/apiError.js';
import { sendDonationUpdateEmail, sendCertificateNotificationEmail } from '../utils/emailService.js';
import { createNotification } from './notificationService.js';
import { generateVerificationCode } from './certificateService.js';

const DONATION_ELIGIBILITY_PERIOD = 90 * 24 * 60 * 60 * 1000; // 90 days in ms

// Create donation request
export const createDonationRequest = async (donorId, bloodBankId, data) => {
  validateDonation({ bloodBankId, date: data.date });

  // Get user with optimized query
  const user = await User.findById(donorId)
    .select('_id name bloodGroup isDonor donorInfo')
    .lean();
  
  if (!user || !user.isDonor) {
    throw new ApiError(403, 'Only registered donors can request to donate');
  }

  // Check 3-month donation rule
  if (user.donorInfo?.lastDonationDate) {
    const lastDate = new Date(user.donorInfo.lastDonationDate);
    const threeMonthsAgo = new Date(Date.now() - DONATION_ELIGIBILITY_PERIOD);

    if (lastDate > threeMonthsAgo) {
      throw new ApiError(400, 'You must wait 3 months after your last donation to donate again');
    }
  }

  // Create donation request
  const donation = new Donation({
    donor: donorId,
    bloodBank: bloodBankId,
    type: 'request',
    bloodGroup: user.bloodGroup,
    donationDate: data.date || new Date(),
    notes: data.notes || '',
    status: 'pending'
  });

  await donation.save();

  return donation;
};

// Get user's donation history (paginated, optimized)
export const getUserDonations = async (donorId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  // Optimized queries - parallel execution
  const [donations, total] = await Promise.all([
    Donation.find({ donor: donorId })
      .select('_id bloodGroup status volumeDonated donationDate type createdAt certificateCode certificateIssuedAt')
      .populate('bloodBank', 'name phone')
      .populate('camp', 'name date')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Donation.countDocuments({ donor: donorId })
  ]);

  return buildPaginatedResponse(donations, total, page, limit);
};

// Get blood bank's donations (paginated, optimized)
export const getBloodBankDonations = async (bloodBankId, query) => {
  const { page, limit, skip } = getPaginationParams({ query });

  // Optimized queries - parallel execution
  const [donations, total] = await Promise.all([
    Donation.find({ bloodBank: bloodBankId })
      .select('_id donor bloodGroup status volumeDonated donationDate type createdAt')
      .populate('donor', 'name phone email bloodGroup')
      .populate('camp', 'name date')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Donation.countDocuments({ bloodBank: bloodBankId })
  ]);

  return buildPaginatedResponse(donations, total, page, limit);
};

// Record/approve donation (atomic operation)
export const recordDonation = async (donationId, bloodBankId, volumeDonated) => {
  if (!volumeDonated || volumeDonated <= 0) {
    throw new ApiError(400, 'Volume donated must be greater than 0');
  }

  // Get donation with optimized query
  const donation = await Donation.findById(donationId)
    .select('_id bloodBank status donor')
    .lean();
  
  if (!donation) {
    throw new ApiError(404, 'Donation record not found');
  }

  if (donation.bloodBank.toString() !== bloodBankId.toString()) {
    throw new ApiError(403, 'Not authorized to record this donation');
  }

  if (donation.status === 'completed') {
    throw new ApiError(400, 'This donation has already been recorded');
  }

  const updatedDonation = await Donation.findByIdAndUpdate(
    donationId,
    {
      $set: {
        status: 'completed',
        volumeDonated,
        donationDate: new Date(),
        certificateCode: generateVerificationCode(),
        certificateIssuedAt: new Date()
      }
    },
    { returnDocument: 'after', runValidators: true }
  ).populate('donor', 'name email').populate('bloodBank', 'name');

  // Send donation completion email (async)
  if (updatedDonation && updatedDonation.donor) {
    sendDonationUpdateEmail(
      updatedDonation.donor, 
      updatedDonation, 
      `Your donation of ${volumeDonated} units was successfully completed and recorded.`
    ).catch(err => console.error('Donation record email failed:', err));

    // Send certificate notification email
    sendCertificateNotificationEmail(updatedDonation.donor, updatedDonation)
      .catch(err => console.error('Certificate email failed:', err));

    // Create in-app notification
    createNotification({
      recipient: updatedDonation.donor._id,
      recipientModel: 'User',
      title: 'Donation Completed ✨',
      message: `Your blood donation of ${volumeDonated} units has been successfully recorded. Your certificate is ready!`,
      type: 'donation',
      actionUrl: '/donation-history'
    }).catch(err => console.error('In-app notification failed:', err));
  }

  // Update donor info — awaited via Promise.allSettled to prevent silent data loss
  const [donorUpdateResult] = await Promise.allSettled([
    User.findByIdAndUpdate(
      donation.donor,
      {
        $set: { 'donorInfo.lastDonationDate': new Date() },
        $inc: {
          'donorInfo.totalDonations': 1,
          'donorInfo.totalDonatedVolume': volumeDonated
        }
      }
    )
  ]);
  if (donorUpdateResult.status === 'rejected') {
    console.error('Failed to update donor info:', donorUpdateResult.reason);
  }

  return updatedDonation;
};

// Update donation status
export const updateDonationStatus = async (donationId, bloodBankId, status) => {
  const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
  
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const donation = await Donation.findById(donationId)
    .select('bloodBank status')
    .lean();
  
  if (!donation) {
    throw new ApiError(404, 'Donation record not found');
  }

  if (donation.bloodBank.toString() !== bloodBankId.toString()) {
    throw new ApiError(403, 'Not authorized to update this donation');
  }

  // Atomic update
  const updatedDonation = await Donation.findByIdAndUpdate(
    donationId,
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after', runValidators: true }
  ).populate('donor', 'name email').populate('bloodBank', 'name');

  // Send status update email (async)
  if (updatedDonation && updatedDonation.donor && updatedDonation.status !== 'completed') {
    const message = status === 'rejected' 
      ? 'Unfortunately, your donation request was not approved at this time. Please contact the blood bank for details.'
      : `Your donation request has been marked as ${status}.`;
      
    sendDonationUpdateEmail(updatedDonation.donor, updatedDonation, message)
      .catch(err => console.error('Donation status email failed:', err));

    // Create in-app notification
    createNotification({
      recipient: updatedDonation.donor._id,
      recipientModel: 'User',
      title: 'Donation Request Update',
      message: `Your donation request status has been updated to ${status}.`,
      type: 'donation',
      actionUrl: '/dashboard'
    }).catch(err => console.error('In-app notification failed:', err));
  }

  return updatedDonation;
};

// Check donor eligibility
export const checkDonorEligibility = async (donorId) => {
  const user = await User.findById(donorId)
    .select('donorInfo isDonor')
    .lean();
  
  if (!user || !user.isDonor) {
    throw new ApiError(403, 'User is not a registered donor');
  }

  if (!user.donorInfo?.lastDonationDate) {
    return { eligible: true, message: 'Eligible to donate' };
  }

  const lastDate = new Date(user.donorInfo.lastDonationDate);
  const threeMonthsAgo = new Date(Date.now() - DONATION_ELIGIBILITY_PERIOD);

  if (lastDate > threeMonthsAgo) {
    const daysRemaining = Math.ceil(
      (lastDate.getTime() + DONATION_ELIGIBILITY_PERIOD - Date.now()) / (24 * 60 * 60 * 1000)
    );
    return {
      eligible: false,
      message: `You can donate again in ${daysRemaining} days`,
      daysRemaining
    };
  }

  return { eligible: true, message: 'Eligible to donate' };
};

// Get donation statistics
export const getDonationStats = async (bloodBankId, query) => {
  const stats = await Donation.aggregate([
    { $match: { bloodBank: new mongoose.Types.ObjectId(bloodBankId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalVolume: { $sum: '$volumeDonated' }
      }
    }
  ]);

  const formattedStats = {
    total: 0,
    completed: 0,
    pending: 0,
    rejected: 0,
    totalVolume: 0
  };

  stats.forEach(stat => {
    formattedStats.total += stat.count;
    formattedStats[stat._id] = stat.count;
    formattedStats.totalVolume += stat.totalVolume || 0;
  });

  return formattedStats;
};
