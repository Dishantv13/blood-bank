import User from '../models/User.model.js';
import Event from '../models/Event.model.js';
import BloodRequest from '../models/BloodRequest.model.js';
import Donation from '../models/Donation.model.js';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';
import mongoose from 'mongoose';

// Get user profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Set default activeMode if not set
    if (!user.activeMode) {
      user.activeMode = 'patient';
      await user.save();
    }
    
    successResponse(res, user, 200, 'User profile fetched successfully');
});

// Update user profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, bloodGroup, isDonor, address, isAvailable, location } = req.body;
    
    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone) updateFields.phone = phone;
    if (bloodGroup) updateFields.bloodGroup = bloodGroup;
    if (isDonor !== undefined) updateFields.isDonor = isDonor;
    if (address) updateFields.address = address;
    if (isAvailable !== undefined) updateFields.isAvailable = isAvailable;
    if (location) updateFields.location = location;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully', user });
});

// Update donor information
const updateDonorInfo = asyncHandler(async (req, res) => {
  const { location, ...incomingDonorInfo } = req.body;
  const userId = req.user.userId;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Calculate Eligibility on backend
  const calculateBackendEligibility = (data) => {
    // Check diseases
    const hasDisease = data.diseases ? Object.values(data.diseases).some(v => v === true) : false;
    const hasRecentCondition = data.recentConditions ? Object.values(data.recentConditions).some(v => v === true) : false;
    
    // Check weight (min 50kg) - handle string/number
    const weight = parseFloat(data.weight);
    const weightOk = !isNaN(weight) && weight >= 50;
    
    // Check age (18-65)
    let ageOk = false;
    if (data.dateOfBirth) {
      const birthDate = new Date(data.dateOfBirth);
      const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      ageOk = age >= 18 && age <= 65;
    }
    
    // Check last donation (3 months gap)
    // Preference: System record > Form input
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

  const eligibility = calculateBackendEligibility(incomingDonorInfo);

  // Preserve stats fields while updating metadata
  const updatedDonorInfo = {
    ...user.donorInfo?.toObject?.() || user.donorInfo || {},
    ...incomingDonorInfo,
    isEligible: eligibility.eligible,
    eligibilityReasons: eligibility.reasons,
    lastUpdated: new Date()
  };

  // Ensure stats aren't accidentally cleared if they weren't in the request
  updatedDonorInfo.totalDonations = user.donorInfo?.totalDonations || 0;
  updatedDonorInfo.totalDonatedVolume = user.donorInfo?.totalDonatedVolume || 0;
  updatedDonorInfo.donationCount = user.donorInfo?.donationCount || 0;
  // Use system lastDonationDate if form one is older or missing
  if (user.donorInfo?.lastDonationDate && (!incomingDonorInfo.lastDonationDate || new Date(user.donorInfo.lastDonationDate) > new Date(incomingDonorInfo.lastDonationDate))) {
    updatedDonorInfo.lastDonationDate = user.donorInfo.lastDonationDate;
  }

  user.donorInfo = updatedDonorInfo;
  user.isDonor = true;
  if (location) user.location = location;
  
  await user.save();

  res.json({ message: 'Donor information saved successfully', user });
});

// Get available donors by blood group
const getDonors = asyncHandler(async (req, res) => {
  const { bloodGroup, latitude, longitude, maxDistance } = req.query;
    
    let query = { isDonor: true, isAvailable: true };
    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }

    let donors;
    if (latitude && longitude) {
      // Geospatial query for nearby donors
      donors = await User.find({
        ...query,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: maxDistance ? parseInt(maxDistance) : 10000 // 10km default
          }
        }
      }).select('-password').lean();
    } else {
      donors = await User.find(query).select('-password').lean();
    }

    successResponse(res, donors, 200, 'Donors fetched successfully');
});

// Toggle between donor and patient mode
const toggleMode = asyncHandler(async (req, res) => {
  const { mode } = req.body;
    
    console.log('Toggle mode request received:', { userId: req.user.userId, mode, body: req.body });
    
    if (!mode) {
      return res.status(400).json({ message: 'Mode parameter is required' });
    }
    
    if (!['donor', 'patient'].includes(mode)) {
      return res.status(400).json({ message: 'Invalid mode. Must be donor or patient' });
    }

    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set default activeMode if not set
    if (!user.activeMode) {
      user.activeMode = 'patient';
    }

    // If switching to donor mode, ensure they have isDonor set
    if (mode === 'donor' && !user.isDonor) {
      return res.status(400).json({ 
        message: 'Please complete donor registration first',
        requiresRegistration: true
      });
    }

    // Update mode
    user.activeMode = mode;
    await user.save();

    res.json({ 
      success: true,
      message: `Switched to ${mode} mode successfully`, 
      user,
      activeMode: user.activeMode
    });
});

// Get dashboard statistics for charts
const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get user's requests statistics
    const myRequestsStats = await BloodRequest.aggregate([
      { $match: { requestedBy: userObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get blood group distribution of active requests
    const bloodGroupStats = await BloodRequest.aggregate([
      { $match: { status: 'pending' } },
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get urgency distribution
    const urgencyStats = await BloodRequest.aggregate([
      { $match: { status: 'pending' } },
      {
        $group: {
          _id: '$urgency',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly requests trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await BloodRequest.aggregate([
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
    ]);

    // Get total donors and patients
    const donorCount = await User.countDocuments({ isDonor: true, isAvailable: true });
    const totalUsers = await User.countDocuments({});

    // Get upcoming events count
    const upcomingEvents = await Event.countDocuments({
      date: { $gte: new Date() },
      isActive: true
    });

    // Get registered events count
    const registeredEventsCount = await Event.countDocuments({
      registeredDonors: userObjectId,
      date: { $gte: new Date() }
    });

    // OPTIONAL: Ensure donor stats are totally up to date by summing their actual completed donations
    // This fixed the issue where the cached stats in the User document might be zero
    const donationStats = await Donation.aggregate([
      { $match: { donor: userObjectId, status: 'completed' } },
      { 
        $group: { 
          _id: null, 
          totalCount: { $sum: 1 }, 
          totalVolume: { $sum: '$volumeDonated' } 
        } 
      }
    ]);

    const user = await User.findById(userId); // Fetch user to get donorInfo
    const realTotalDonations = donationStats[0]?.totalCount || user?.donorInfo?.totalDonations || 0;
    const realTotalVolume = donationStats[0]?.totalVolume || user?.donorInfo?.totalDonatedVolume || 0;

    // Get the actual latest donation date from history
    const latestDonation = await Donation.findOne({ donor: userObjectId, status: 'completed' })
      .sort({ donationDate: -1 });
    const realLastDonationDate = latestDonation?.donationDate || user?.donorInfo?.lastDonationDate || user?.lastDonationDate;

    // IMPORTANT: Sync back to user model if there's a disconnect
    if (user.donorInfo && (
      user.donorInfo.totalDonations !== realTotalDonations || 
      user.donorInfo.totalDonatedVolume !== realTotalVolume ||
      (realLastDonationDate && user.donorInfo.lastDonationDate?.toString() !== realLastDonationDate.toString())
    )) {
      user.donorInfo.totalDonations = realTotalDonations;
      user.donorInfo.totalDonatedVolume = realTotalVolume;
      if (realLastDonationDate) {
        user.donorInfo.lastDonationDate = realLastDonationDate;
        user.lastDonationDate = realLastDonationDate;
      }
      await user.save();
    }

    successResponse(res, {
        stats: {
          myRequests: myRequestsStats,
          bloodGroups: bloodGroupStats,
          urgency: urgencyStats,
          monthlyTrend,
          overview: {
            totalDonors: donorCount,
            totalUsers,
            upcomingEvents,
            registeredEvents: registeredEventsCount,
            personalStats: {
              totalDonations: realTotalDonations,
              totalDonatedVolume: realTotalVolume,
              lastDonationDate: realLastDonationDate
            }
          }
        }
      }, 200, 'Dashboard statistics fetched successfully');
});

export {
  getProfile,
  updateProfile,
  updateDonorInfo,
  getDonors,
  toggleMode,
  getDashboardStats
}