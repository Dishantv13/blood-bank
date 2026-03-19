import ExcelJS from 'exceljs';
import BloodCamp from '../models/BloodCamp.model.js';
import User from '../models/User.model.js';
import Donation from '../models/Donation.model.js';
import { asyncHandler } from '../utils/asynchandler.js';
import { successResponse } from '../utils/response.js';

// Get all blood camps
const getAllCamps = asyncHandler(async (req, res) => {
  const { city, status, upcoming } = req.query;
    
    // console.log('Fetching blood camps with query:', { city, status, upcoming });
    
    let query = {};
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    if (status) {
      query.status = status;
    }
    
    // Get only upcoming camps by default
    if (upcoming === 'true' || !status) {
      query.date = { $gte: new Date() };
      query.status = { $in: ['scheduled', 'upcoming'] };
    }
    
    // console.log('MongoDB query:', JSON.stringify(query));
    
    const camps = await BloodCamp.find(query)
      .populate('organizer', 'name email phone')
      .sort({ date: 1 })
      .lean();
    
    successResponse(res, camps, 200, 'Blood camps fetched successfully');
});

// Get blood camp by ID
const getCampById = asyncHandler(async (req, res) => {
  const camp = await BloodCamp.findById(req.params.id)
      .populate('organizer', 'name email phone address')
      .lean();
    
    if (!camp) {
      return res.status(404).json({ message: 'Blood camp not found' });
    }
    
    res.json(camp);
});

// Create a new blood camp
const createCamp = asyncHandler(async (req, res) => {
    console.log('📝 Creating blood camp...');
    console.log('Blood Bank:', req.bloodBank.name, req.bloodBank._id);
    console.log('Request body:', req.body);
    
    const {
      name,
      date,
      startTime,
      endTime,
      venue,
      address,
      city,
      state,
      pincode,
      targetUnits,
      description,
      contactPhone,
      contactEmail
    } = req.body;

    const camp = new BloodCamp({
      name,
      organizer: req.bloodBank._id,
      organizerName: req.bloodBank.name,
      date,
      startTime,
      endTime,
      venue,
      address,
      city,
      state,
      pincode,
      targetUnits,
      description,
      contactPhone: contactPhone || req.bloodBank.phone,
      contactEmail: contactEmail || req.bloodBank.email
    });

    console.log('Camp object before save:', camp);
    await camp.save();
    console.log('✅ Blood camp saved to database:', camp._id);
    
    res.status(201).json({
      message: 'Blood camp created successfully',
      camp
    });
});

// Update a blood camp
const updateCamp = asyncHandler(async (req, res) => {
  const camp = await BloodCamp.findById(req.params.id);
    
    if (!camp) {
      return res.status(404).json({ message: 'Blood camp not found' });
    }
    
    // Check if the blood bank owns this camp
    if (camp.organizer.toString() !== req.bloodBank._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this camp' });
    }
    
    const {
      name,
      date,
      startTime,
      endTime,
      venue,
      address,
      city,
      state,
      pincode,
      targetUnits,
      description,
      status
    } = req.body;
    
    camp.name = name || camp.name;
    camp.date = date || camp.date;
    camp.startTime = startTime || camp.startTime;
    camp.endTime = endTime || camp.endTime;
    camp.venue = venue || camp.venue;
    camp.address = address || camp.address;
    camp.city = city || camp.city;
    camp.state = state || camp.state;
    camp.pincode = pincode || camp.pincode;
    camp.targetUnits = targetUnits || camp.targetUnits;
    camp.description = description || camp.description;
    camp.status = status || camp.status;
    
    await camp.save();
    
    res.json({
      message: 'Blood camp updated successfully',
      camp
    });
});

// Delete a blood camp
const deleteCamp = asyncHandler(async (req, res) => {
  const camp = await BloodCamp.findById(req.params.id);
    
    if (!camp) {
      return res.status(404).json({ message: 'Blood camp not found' });
    }
    
    // Check if the blood bank owns this camp
    if (camp.organizer.toString() !== req.bloodBank._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this camp' });
    }
    
    await BloodCamp.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Blood camp deleted successfully' });
});

// Register for a blood camp
const registerCamp = asyncHandler(async (req, res) => {
  const camp = await BloodCamp.findById(req.params.id);
    
    if (!camp) {
      return res.status(404).json({ message: 'Blood camp not found' });
    }
    
    // Get user ID from token with multiple possible field names
    const userId = req.user.userId || req.user._id || req.user.id;
    console.log('Registering user ID:', userId);
    console.log('Token content for debugging:', req.user);
    
    if (!userId) {
      console.error('No user ID found in token:', req.user);
      return res.status(401).json({ message: 'Authentication failed: No user identity found' });
    }
    
    // Fetch full user details from database
    const user = await User.findById(userId).select('name email phone bloodGroup');
    
    console.log('Fetched user from DB:', user);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if already registered
    const alreadyRegistered = camp.registeredDonors.some(
      donor => donor.donor && donor.donor.toString() === userId.toString()
    );
    
    if (alreadyRegistered) {
      return res.status(400).json({ message: 'You have already registered for this camp' });
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
    
    // Add donor with full details from database
    const donorData = {
      donor: userId,
      name: user.name || 'Unknown',
      phone: user.phone || 'Not provided',
      bloodGroup: user.bloodGroup || 'Not specified',
      registeredAt: new Date()
    };
    
    console.log('Adding donor data:', donorData);
    
    camp.registeredDonors.push(donorData);
    await camp.save();

    // Also create a Donation record so it appears in Blood Bank Donations tab
    try {
      const newDonation = new Donation({
        donor: userId,
        bloodBank: camp.organizer,
        camp: camp._id,
        type: 'camp',
        bloodGroup: user.bloodGroup || 'O+',
        donationDate: camp.date, // The event date
        notes: `Registered for camp: ${camp.name}`,
        status: 'pending' // pending until they actually put blood and the bank records it
      });
      await newDonation.save();
    } catch (err) {
      console.error('Failed to create donation record for camp:', err);
    }
    
    console.log('Camp saved successfully. Total registrations:', camp.registeredDonors.length);
    
    res.json({ 
      success: true,
      message: 'Successfully registered for blood camp',
      registration: {
        name: user.name,
        bloodGroup: user.bloodGroup,
        phone: user.phone
      }
    });
});

// Export registered users for a blood camp to Excel
const exportRegistrations = asyncHandler(async (req, res) => {
    const camp = await BloodCamp.findById(req.params.id)
      .populate('registeredUsers', 'name email phone bloodGroup city state age gender address')
      .lean();
    
    if (!camp) {
      return res.status(404).json({ message: 'Blood camp not found' });
    }
    
    if (camp.organizer.toString() !== req.bloodBank._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to export this camp\'s data' });
    }
    
    if (!camp.registeredUsers || camp.registeredUsers.length === 0) {
      return res.status(400).json({ message: 'No registered users to export' });
    }
    
    const data = camp.registeredUsers.map((user, index) => ({
      'S.No': index + 1,
      'Name': user.name || 'N/A',
      'Email': user.email || 'N/A',
      'Phone': user.phone || 'N/A',
      'Blood Group': user.bloodGroup || 'N/A',
      'Age': user.age || 'N/A',
      'Gender': user.gender || 'N/A',
      'City': user.city || 'N/A',
      'State': user.state || 'N/A',
      'Address': user.address || 'N/A',
    }));

    const worksheet = ExcelJS.utils.json_to_sheet(data);
    const workbook = ExcelJS.utils.book_new();
    ExcelJS.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    // Add camp info sheet
    const campInfo = [{
      'Camp Name': camp.name,
      'Date': new Date(camp.date).toLocaleDateString(),
      'Time': camp.time,
      'Location': camp.location,
      'Total Registrations': camp.registeredUsers.length,
      'Expected Donors': camp.expectedDonors,
      'Blood Collected': camp.collectedUnits || 0,
      'Status': camp.status,
    }];
    const infoSheet = ExcelJS.utils.json_to_sheet(campInfo);
    ExcelJS.utils.book_append_sheet(workbook, infoSheet, 'Camp Info');

    const buffer = ExcelJS.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `${camp.name.replace(/[^a-z0-9]/gi, '_')}_registrations.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// Get camps organized by the logged in blood bank
const getMyCamps = asyncHandler(async (req, res) => {
  const camps = await BloodCamp.find({ organizer: req.bloodBank._id })
    .sort({ date: -1 })
    .lean();
    
    res.json(camps);
});

// Update collected units for a camp
const updateCollectedUnits = asyncHandler(async (req, res) => {
  const { collectedUnits } = req.body;
    
    const camp = await BloodCamp.findById(req.params.id);
    
    if (!camp) {
      return res.status(404).json({ message: 'Blood camp not found' });
    }
    
    if (camp.organizer.toString() !== req.bloodBank._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    camp.collectedUnits = collectedUnits;
    await camp.save();
    
    res.json({ message: 'Collected units updated', camp });
});

// Remove invalid registrations
const cleanupRegistrations = asyncHandler(async (req, res) => {
    console.log('🧹 Starting cleanup of invalid registrations...');
    
    const camps = await BloodCamp.find({ 'registeredDonors.0': { $exists: true } });
    
    console.log(`Found ${camps.length} camps with registrations`);
    
    let removedCount = 0;
    
    for (const camp of camps) {
      const originalLength = camp.registeredDonors.length;
      
      // Remove registrations without valid donor reference or with placeholder data
      camp.registeredDonors = camp.registeredDonors.filter(donor => {
        // Check if donor has valid data
        const hasValidName = donor.name && donor.name !== 'Unknown' && donor.name.trim() !== '';
        const hasValidDonor = donor.donor && donor.donor.toString().length === 24; // Valid MongoDB ObjectId
        
        if (!hasValidName || !hasValidDonor) {
          console.log(`❌ Removing invalid registration: ${donor.name || 'No name'}`);
          removedCount++;
          return false;
        }
        return true;
      });
      
      // Save if any registrations were removed
      if (originalLength !== camp.registeredDonors.length) {
        await camp.save();
        console.log(`💾 Updated camp: ${camp.name} (removed ${originalLength - camp.registeredDonors.length} invalid)`);
      }
    }
    
    res.json({
      success: true,
      message: 'Cleanup completed',
      removed: removedCount,
      campsProcessed: camps.length
    });
});

// Fix empty registration data by populating from User collection
const fixRegistrations = asyncHandler(async (req, res) => {
    console.log('🔧 Starting registration data fix...');
    
    // Find all camps with registrations
    const camps = await BloodCamp.find({ 'registeredDonors.0': { $exists: true } });
    
    console.log(`Found ${camps.length} camps with registrations`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const camp of camps) {
      let campUpdated = false;
      
      for (let i = 0; i < camp.registeredDonors.length; i++) {
        const donor = camp.registeredDonors[i];
        
        // Check if donor data is missing
        if (!donor.name || !donor.phone || !donor.bloodGroup || 
            donor.name === 'Unknown' || donor.phone === 'Not provided') {
          
          console.log(`Fixing registration for donor ${donor.donor}`);
          
          try {
            // Fetch user data
            const user = await User.findById(donor.donor).select('name phone bloodGroup');
            
            if (user) {
              camp.registeredDonors[i].name = user.name || 'Unknown';
              camp.registeredDonors[i].phone = user.phone || 'Not provided';
              camp.registeredDonors[i].bloodGroup = user.bloodGroup || 'Not specified';
              campUpdated = true;
              fixedCount++;
              console.log(`✅ Fixed: ${user.name}`);
            } else {
              console.log(`❌ User not found: ${donor.donor}`);
              errorCount++;
            }
          } catch (err) {
            console.error(`Error fixing donor ${donor.donor}:`, err.message);
            errorCount++;
          }
        }
      }
      
      if (campUpdated) {
        await camp.save();
        console.log(`💾 Saved camp: ${camp.name}`);
      }
    }
    
    res.json({
      success: true,
      message: 'Registration data fix completed',
      fixed: fixedCount,
      errors: errorCount,
      campsProcessed: camps.length
    });
});


export {
  getAllCamps,
  getCampById,
  createCamp,
  updateCamp,
  deleteCamp,
  registerCamp,
  exportRegistrations,
  getMyCamps,
  updateCollectedUnits,
  cleanupRegistrations,
  fixRegistrations
}