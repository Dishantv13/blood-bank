import User from '../models/User.model.js';
import DonorHealth from '../models/DonorHealth.model.js';
import BloodRequest from '../models/BloodRequest.model.js';
import Donation from '../models/Donation.model.js';
import Event from '../models/Event.model.js';
import mongoose from 'mongoose';
import * as validationService from './validationService.js';
import { ApiError } from '../utils/apiError.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import { sanitizeUser, USER_DONOR_FIELDS, USER_PROFILE_FIELDS } from '../utils/serializers.js';

const DASHBOARD_STATS_TTL_MS = 30 * 1000;
const dashboardStatsCache = new Map();

const getDashboardStatsFromCache = (userId) => {
  const key = String(userId);
  const cached = dashboardStatsCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    dashboardStatsCache.delete(key);
    return null;
  }
  return cached.payload;
};

const setDashboardStatsCache = (userId, payload) => {
  dashboardStatsCache.set(String(userId), {
    payload,
    expiresAt: Date.now() + DASHBOARD_STATS_TTL_MS,
  });
};

const invalidateDashboardStatsCache = (userId) => {
  dashboardStatsCache.delete(String(userId));
};

// Get user profile
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId)
    .select(USER_PROFILE_FIELDS)
    .populate('healthForm')
    .lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Set default activeMode if not set
  if (!user.activeMode) {
    await User.findByIdAndUpdate(userId, { activeMode: 'patient' });
    user.activeMode = 'patient';
  }

  return sanitizeUser(user);
};

// Update user profile photo
export const updateProfilePhoto = async (userId, localFilePath) => {
  if (!localFilePath) throw new ApiError(400, 'No file path provided');
  
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Delete old photo from Cloudinary if it exists
  if (user.photoURLPublicId) {
    await deleteFromCloudinary(user.photoURLPublicId);
  }

  // Upload to Cloudinary
  const cloudinaryResponse = await uploadOnCloudinary(localFilePath, 'users/profiles');
  
  if (!cloudinaryResponse) {
    throw new ApiError(500, 'Failed to upload photo to Cloudinary');
  }

  // Update user profile with Cloudinary URL and Public ID
  user.photoURL = cloudinaryResponse.secure_url;
  user.photoURLPublicId = cloudinaryResponse.public_id;
  
  await user.save();
  
  return { 
    photoURL: user.photoURL,
    publicId: cloudinaryResponse.public_id 
  };
};

// Update user profile
export const updateUserProfile = async (userId, updateData) => {
  const { name, phone, bloodGroup, isDonor, address, isAvailable, location } = updateData;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (phone) {
    validationService.validatePhone(phone);
    updateFields.phone = phone;
  }
  if (bloodGroup) {
    validationService.validateBloodGroup(bloodGroup);
    updateFields.bloodGroup = bloodGroup;
  }
  if (isDonor !== undefined) updateFields.isDonor = isDonor;
  if (address) updateFields.address = address;
  if (isAvailable !== undefined) updateFields.isAvailable = isAvailable;
  if (location) updateFields.location = location;

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).select(USER_PROFILE_FIELDS).lean();

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  invalidateDashboardStatsCache(userId);

  return sanitizeUser(user);
};

// Update donor information
export const updateDonorInfo = async (userId, incomingDonorInfo) => {
  const { location, ...donorData } = incomingDonorInfo;

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Calculate eligibility on backend
  const calculateEligibility = (data) => {
    const hasDisease = data.diseases ? Object.values(data.diseases).some(v => v === true) : false;
    const hasRecentCondition = data.recentConditions ? Object.values(data.recentConditions).some(v => v === true) : false;

    const weight = parseFloat(data.weight);
    const weightOk = !isNaN(weight) && weight >= 50;

    let ageOk = false;
    if (data.dateOfBirth) {
      const birthDate = new Date(data.dateOfBirth);
      const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      ageOk = age >= 18 && age <= 65;
    }

    const lastDateStr = user.donorInfo?.lastDonationDate || data.lastDonationDate;
    let donationGapOk = true;
    if (lastDateStr) {
      const lastDonation = new Date(lastDateStr);
      const monthsGap = (new Date() - lastDonation) / (30 * 24 * 60 * 60 * 1000);
      donationGapOk = monthsGap >= 3;
    }

    const reasons = {
      hasDisease,
      hasRecentCondition,
      weightOk,
      ageOk,
      donationGapOk
    };

    return {
      eligible: !hasDisease && !hasRecentCondition && weightOk && ageOk && donationGapOk,
      reasons
    };
  };

  const eligibility = calculateEligibility(donorData);

  // Create/Update DonorHealth record
  let healthForm = await DonorHealth.findOne({ donor: userId }).sort({ submittedAt: -1 });

  const mappingData = {
    donor: userId,
    fullName: user.name,
    weight: parseFloat(donorData.weight),
    phone: user.phone || donorData.emergencyContact?.phone || '',
    email: user.email,
    dateOfBirth: new Date(donorData.dateOfBirth),
    gender: donorData.gender,
    bloodGroup: user.bloodGroup || 'unknown',
    medicalConditions: {
      hivAids: donorData.diseases?.hiv || false,
      hepatitisBC: donorData.diseases?.hepatitisB || donorData.diseases?.hepatitisC || false,
      malaria: donorData.diseases?.malaria || false,
      tuberculosis: donorData.diseases?.tuberculosis || false,
      heartDisease: donorData.diseases?.heartDisease || false,
      cancer: donorData.diseases?.cancer || false,
      diabetes: donorData.diseases?.diabetes || false,
      epilepsy: donorData.diseases?.epilepsy || false,
    },
    recentActivities: {
      tattooOrPiercing: donorData.recentConditions?.tattooOrPiercing || false,
      surgeryOrTransfusion: donorData.recentConditions?.surgery || false,
      vaccination: donorData.recentConditions?.vaccination || false,
      pregnancyOrBreastfeeding: donorData.recentConditions?.pregnancy || false,
    },
    currentHealth: {
      recentFeverOrIllness: donorData.recentConditions?.fever || donorData.recentConditions?.coldOrFlu || false,
    },
    lifestyle: {
      alcohol: donorData.lifestyle?.alcohol || 'never',
      smoking: donorData.lifestyle?.smoking || 'never',
      drugUse: donorData.lifestyle?.drugUse || false,
    },
    donationHistory: {
      previouslyDonated: (user.donorInfo?.totalDonations || 0) > 0,
      lastDonationDate: user.donorInfo?.lastDonationDate || donorData.lastDonationDate,
      totalDonations: user.donorInfo?.totalDonations || 0,
    },
    consent: {
      informationAccurate: donorData.consent?.informationAccurate || donorData.accuracyDeclaration || false,
      consentToDonate: donorData.consent?.consentToDonate || donorData.consent || false,
      understandsProcess: donorData.consent?.understandsProcess || true
    },
    status: eligibility.eligible ? 'approved' : 'requires_review'
  };

  if (healthForm) {
    Object.assign(healthForm, mappingData);
    await healthForm.save();
  } else {
    healthForm = new DonorHealth(mappingData);
    await healthForm.save();
  }

  // Update summary stats in User model
  user.healthForm = healthForm._id;
  user.donorInfo = {
    totalDonations: user.donorInfo?.totalDonations || 0,
    totalDonatedVolume: user.donorInfo?.totalDonatedVolume || 0,
    lastDonationDate: healthForm.donationHistory.lastDonationDate,
    isEligible: eligibility.eligible,
    eligibilityReasons: eligibility.reasons,
    lastUpdated: new Date(),
    dateOfBirth: mappingData.dateOfBirth,
    gender: mappingData.gender,
    bloodGroup: user.bloodGroup
  };

  user.isDonor = true;
  if (location) user.location = location;

  await user.save();

  invalidateDashboardStatsCache(userId);

  return sanitizeUser(user.toObject());
};

// Get available donors by blood group
export const getAvailableDonors = async (query) => {
  const { bloodGroup, latitude, longitude, maxDistance } = query;

  let filterQuery = { isDonor: true, isAvailable: true };
  if (bloodGroup) {
    validationService.validateBloodGroup(bloodGroup);
    filterQuery.bloodGroup = bloodGroup;
  }

  let donors;
  if (latitude && longitude) {
    donors = await User.find({
      ...filterQuery,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: maxDistance ? parseInt(maxDistance) : 10000
        }
      }
    }).select(USER_DONOR_FIELDS).lean();
  } else {
    donors = await User.find(filterQuery).select(USER_DONOR_FIELDS).lean();
  }

  return donors.map((donor) => sanitizeUser(donor));
};

// Toggle between donor and patient mode
export const toggleMode = async (userId, mode) => {
  if (!['donor', 'patient'].includes(mode)) {
    throw new ApiError(400, 'Invalid mode. Must be donor or patient');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (!user.activeMode) {
    user.activeMode = 'patient';
  }

  // If switching to donor mode, ensure they have isDonor set
  if (mode === 'donor' && !user.isDonor) {
    throw new ApiError(400, 'Please complete donor registration first');
  }

  user.activeMode = mode;
  await user.save();

  invalidateDashboardStatsCache(userId);

  return {
    success: true,
    message: `Switched to ${mode} mode successfully`,
    activeMode: user.activeMode
  };
};

// Get dashboard statistics
export const getDashboardStats = async (userId) => {
  const cachedStats = getDashboardStatsFromCache(userId);
  if (cachedStats) {
    return cachedStats;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [requestFacetResult, eventFacetResult, donationFacetResult, donorCount, totalUsers, user] = await Promise.all([
    BloodRequest.aggregate([
      {
        $facet: {
          myRequests: [
            { $match: { requestedBy: userObjectId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          bloodGroups: [
            { $match: { status: 'pending' } },
            { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          urgency: [
            { $match: { status: 'pending' } },
            { $group: { _id: '$urgency', count: { $sum: 1 } } }
          ],
          monthlyTrend: [
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
          ]
        }
      }
    ]),
    Event.aggregate([
      {
        $facet: {
          upcoming: [
            { $match: { date: { $gte: now }, isActive: true } },
            { $count: 'count' }
          ],
          registered: [
            { $match: { registeredDonors: userObjectId, date: { $gte: now } } },
            { $count: 'count' }
          ]
        }
      }
    ]),
    Donation.aggregate([
      { $match: { donor: userObjectId, status: 'completed' } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalVolume: { $sum: '$volumeDonated' }
              }
            }
          ],
          latest: [
            { $sort: { donationDate: -1 } },
            { $limit: 1 },
            { $project: { _id: 0, donationDate: 1 } }
          ]
        }
      }
    ]),
    User.countDocuments({ isDonor: true, isAvailable: true }),
    User.countDocuments({}),
    User.findById(userId).select(USER_PROFILE_FIELDS).lean()
  ]);

  const requestFacet = requestFacetResult[0] || {};
  const eventFacet = eventFacetResult[0] || {};
  const donationFacet = donationFacetResult[0] || {};

  const realTotalDonations = donationFacet.summary?.[0]?.totalCount || user?.donorInfo?.totalDonations || 0;
  const realTotalVolume = donationFacet.summary?.[0]?.totalVolume || user?.donorInfo?.totalDonatedVolume || 0;
  const realLastDonationDate = donationFacet.latest?.[0]?.donationDate || user?.donorInfo?.lastDonationDate || user?.lastDonationDate;

  // Sync back to user model if there's a disconnect
  if (user.donorInfo && (
    user.donorInfo.totalDonations !== realTotalDonations ||
    user.donorInfo.totalDonatedVolume !== realTotalVolume ||
    (realLastDonationDate && user.donorInfo.lastDonationDate?.toString() !== realLastDonationDate.toString())
  )) {
    const updateData = { donorInfo: user.donorInfo };
    updateData.donorInfo.totalDonations = realTotalDonations;
    updateData.donorInfo.totalDonatedVolume = realTotalVolume;
    if (realLastDonationDate) {
      updateData.donorInfo.lastDonationDate = realLastDonationDate;
      updateData.lastDonationDate = realLastDonationDate;
    }
    await User.findByIdAndUpdate(userId, updateData);
  }

  const result = {
    stats: {
      myRequests: requestFacet.myRequests || [],
      bloodGroups: requestFacet.bloodGroups || [],
      urgency: requestFacet.urgency || [],
      monthlyTrend: requestFacet.monthlyTrend || [],
      overview: {
        totalDonors: donorCount,
        totalUsers,
        upcomingEvents: eventFacet.upcoming?.[0]?.count || 0,
        registeredEvents: eventFacet.registered?.[0]?.count || 0,
        personalStats: {
          totalDonations: realTotalDonations,
          totalDonatedVolume: realTotalVolume,
          lastDonationDate: realLastDonationDate
        }
      }
    }
  };

  setDashboardStatsCache(userId, result);
  return result;
};
