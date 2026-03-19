import Donation from '../models/Donation.model.js';
import BloodCamp from '../models/BloodCamp.model.js';
import User from '../models/User.model.js';
import { asyncHandler } from '../utils/asynchandler.js';

// User requests to donate at a Blood Bank
export const createDonationRequest = asyncHandler(async (req, res) => {
  const { bloodBankId, date, notes } = req.body;
  const donorId = req.user.userId || req.user._id || req.user.id;

  const user = await User.findById(donorId);
  if (!user || !user.isDonor) {
    return res.status(403).json({ message: 'Only registered donors can request to donate.' });
  }

  // Check 3 months rule
  if (user.donorInfo?.lastDonationDate) {
    const lastDate = new Date(user.donorInfo.lastDonationDate);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    if (lastDate > threeMonthsAgo) {
      return res.status(400).json({ message: 'You must wait 3 months after your last donation to donate again.' });
    }
  }

  const newDonation = new Donation({
    donor: donorId,
    bloodBank: bloodBankId,
    type: 'request',
    bloodGroup: user.bloodGroup,
    donationDate: date || new Date(),
    notes: notes || '',
    status: 'pending'
  });

  await newDonation.save();
  res.status(201).json({ message: 'Donation request submitted successfully.', donation: newDonation });
});

// User gets their own donation history
export const getMyDonations = asyncHandler(async (req, res) => {
  const donorId = req.user.userId || req.user._id || req.user.id;
  const donations = await Donation.find({ donor: donorId })
    .populate('bloodBank', 'name phone')
    .populate('camp', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json(donations);
});

// Blood Bank gets all its donation requests and camp attendees implicitly linked
export const getBloodBankDonations = asyncHandler(async (req, res) => {
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;
  
  // We can fetch Donation records that belong to this bloodbank
  const donations = await Donation.find({ bloodBank: bloodBankId })
    .populate('donor', 'name phone email bloodGroup')
    .populate('camp', 'name date')
    .sort({ createdAt: -1 });

  res.status(200).json(donations);
});

// Blood Bank records/approves the donation
export const recordDonation = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const { volumeDonated } = req.body; // usually around 0.35 to 0.45 Liters
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;

  const donation = await Donation.findById(donationId);
  if (!donation) {
    return res.status(404).json({ message: 'Donation record not found.' });
  }

  if (donation.bloodBank.toString() !== bloodBankId.toString()) {
    return res.status(403).json({ message: 'Not authorized to record this donation.' });
  }

  if (donation.status === 'completed') {
    return res.status(400).json({ message: 'This donation has already been recorded.' });
  }

  donation.volumeDonated = volumeDonated || 0.45; // Default 0.45L if not provided
  donation.status = 'completed';
  donation.donationDate = new Date(); // set completed date
  await donation.save();

  // Update User stats
  const user = await User.findById(donation.donor);
  if (user) {
    if (!user.donorInfo) user.donorInfo = {};
    const currentVolume = user.donorInfo.totalDonatedVolume || 0;
    user.donorInfo.totalDonatedVolume = currentVolume + donation.volumeDonated;
    
    // update totalDonations (count)
    user.donorInfo.totalDonations = (user.donorInfo.totalDonations || 0) + 1;
    // update last donation date
    user.donorInfo.lastDonationDate = donation.donationDate;
    user.lastDonationDate = donation.donationDate;

    // IMPORTANT: Set eligibility to false for 3 months after donation
    user.donorInfo.isEligible = false;
    user.donorInfo.eligibilityReasons = {
      ...user.donorInfo.eligibilityReasons,
      donationGapOk: false,
      message: 'Waiting period of 3 months since last donation.'
    };

    await user.save();
  }

  // NOTE: In a real system we would also update BloodBank inventory here!
  // BUT the prompt just asks for dashboard stats update. Let's do it if inventory is accessible.
  
  res.status(200).json({ message: 'Donation recorded successfully.', donation });
});

// Reject/Cancel a donation request
export const updateDonationStatus = asyncHandler(async (req, res) => {
  const { donationId } = req.params;
  const { status } = req.body;
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;

  const donation = await Donation.findById(donationId);
  if (!donation) {
    return res.status(404).json({ message: 'Donation record not found.' });
  }

  if (donation.bloodBank.toString() !== bloodBankId.toString()) {
    return res.status(403).json({ message: 'Not authorized to update this donation.' });
  }

  donation.status = status;
  await donation.save();

  res.status(200).json({ message: 'Donation status updated.', donation });
});

export const createDonationByBank = asyncHandler(async (req, res) => {
  const { donorId, campId, bloodGroup } = req.body;
  const bloodBankId = req.bloodBank.bloodBankId || req.bloodBank._id;

  const user = await User.findById(donorId);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const newDonation = new Donation({
    donor: donorId,
    bloodBank: bloodBankId,
    camp: campId,
    type: campId ? 'camp' : 'request',
    bloodGroup: bloodGroup || user.bloodGroup || 'O+',
    donationDate: new Date(),
    status: 'pending'
  });

  await newDonation.save();
  res.status(201).json({ message: 'Donation record created successfully.', donation: newDonation });
});
