import BloodBank from '../models/BloodBank.model.js';
import Inventory from '../models/Inventory.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import * as validationService from './validationService.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Blood Bank Service
 * All business logic for blood bank operations
 */

// Generate JWT Token for Blood Bank
const generateToken = (bloodBankId) => {
  const payload = {
    bloodBankId,
    type: 'bloodbank'
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Register a new blood bank
export const registerBloodBank = async (data) => {
  const {
    name,
    email,
    password,
    phone,
    licenseNumber,
    registrationNumber,
    establishedYear,
    address,
    city,
    state,
    pincode,
    operatingHours,
    services,
    contactPersonName,
    contactPersonPhone,
    contactPersonEmail,
    location,
    logo
  } = data;

  // Validation
  if (!name || !email || !password || !phone || !licenseNumber) {
    throw new ApiError(400, 'Please provide all required fields: name, email, password, phone, and license number');
  }

  validationService.validateEmail(email);
  validationService.validatePassword(password);
  validationService.validatePhone(phone);

  // Check if blood bank already exists
  const existingBloodBank = await BloodBank.findOne({
    $or: [{ email }, { licenseNumber }]
  }).lean();

  if (existingBloodBank) {
    throw new ApiError(400, 'Blood bank with this email or license number already exists');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Initialize inventory with all blood types
  const initialInventory = [
    { bloodGroup: 'A+', units: 0 },
    { bloodGroup: 'A-', units: 0 },
    { bloodGroup: 'B+', units: 0 },
    { bloodGroup: 'B-', units: 0 },
    { bloodGroup: 'AB+', units: 0 },
    { bloodGroup: 'AB-', units: 0 },
    { bloodGroup: 'O+', units: 0 },
    { bloodGroup: 'O-', units: 0 }
  ];

  // Create blood bank
  const bloodBank = new BloodBank({
    name,
    email,
    password: hashedPassword,
    phone,
    licenseNumber,
    registrationNumber,
    establishedYear,
    address: {
      street: address,
      city,
      state,
      pincode
    },
    operatingHours: operatingHours || { open: '09:00', close: '18:00', days: [] },
    services: services || [],
    contactPerson: {
      name: contactPersonName,
      phone: contactPersonPhone,
      email: contactPersonEmail
    },
    inventory: initialInventory,
    location: location || undefined,
    logo: logo || '',
    imageUrl: logo || ''
  });

  await bloodBank.save();

  // Create entry in Inventory collection
  const inventory = new Inventory({
    bloodBank: bloodBank._id,
    bloodBankName: bloodBank.name,
    items: initialInventory.map(item => ({ ...item, lastUpdated: new Date() }))
  });
  await inventory.save();

  // Generate token
  const token = generateToken(bloodBank._id);

  return {
    token,
    bloodBank: {
      id: bloodBank._id,
      name: bloodBank.name,
      email: bloodBank.email,
      phone: bloodBank.phone
    }
  };
};

// Login blood bank
export const loginBloodBank = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Find blood bank
  const bloodBank = await BloodBank.findOne({ email }).select('+password');
  if (!bloodBank) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check password
  const isMatch = await bloodBank.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Generate token
  const token = generateToken(bloodBank._id);

  return {
    token,
    bloodBank: {
      id: bloodBank._id,
      name: bloodBank.name,
      email: bloodBank.email,
      phone: bloodBank.phone,
      licenseNumber: bloodBank.licenseNumber,
      address: bloodBank.address,
      operatingHours: bloodBank.operatingHours,
      services: bloodBank.services,
      isVerified: bloodBank.isVerified,
      inventory: bloodBank.inventory || []
    }
  };
};

// Get all public blood banks or nearby ones
export const getAllBloodBanks = async (query) => {
  const { latitude, longitude, maxDistance, bloodGroup } = query;

  let bloodBanks;
  if (latitude && longitude) {
    // Geospatial query for nearby blood banks
    const geoQuery = {
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: maxDistance ? parseInt(maxDistance) : 50000 // 50km default
        }
      }
    };

    bloodBanks = await BloodBank.find(geoQuery).select('-password').lean();
  } else {
    bloodBanks = await BloodBank.find({ isActive: true }).select('-password').lean();
  }

  // Batch fetch inventories (avoid N+1)
  const bankIds = bloodBanks.map(bank => bank._id);
  const inventories = await Inventory.find({ bloodBank: { $in: bankIds } }).lean();
  const inventoryMap = new Map(inventories.map(inv => [inv.bloodBank.toString(), inv.items || []]));

  const bloodBanksWithInventory = bloodBanks.map(bank => ({
    ...bank,
    inventory: inventoryMap.get(bank._id.toString()) || bank.inventory || []
  }));

  // Filter by blood group availability if specified
  if (bloodGroup) {
    validationService.validateBloodGroup(bloodGroup);
    return bloodBanksWithInventory.filter(bank =>
      bank.inventory.some(item => item.bloodGroup === bloodGroup && item.units > 0)
    );
  }

  return bloodBanksWithInventory;
};

// Get blood bank by ID
export const getBloodBankById = async (bloodBankId) => {
  const bloodBank = await BloodBank.findById(bloodBankId).select('-password').lean();
  if (!bloodBank) {
    throw new ApiError(404, 'Blood bank not found');
  }

  // Fetch inventory from Inventory collection
  const inventory = await Inventory.findOne({ bloodBank: bloodBankId }).lean();
  bloodBank.inventory = inventory?.items || [];

  return bloodBank;
};

// Get blood bank profile (for authenticated blood bank)
export const getBloodBankProfile = async (bloodBankId) => {
  const bloodBank = await BloodBank.findById(bloodBankId).select('-password').lean();
  if (!bloodBank) {
    throw new ApiError(404, 'Blood bank not found');
  }

  const inventory = await Inventory.findOne({ bloodBank: bloodBankId }).lean();
  bloodBank.inventory = inventory?.items || [];

  return bloodBank;
};

// Update blood bank profile
export const updateBloodBankProfile = async (bloodBankId, updateData) => {
  const { name, phone, address, city, state, pincode, operatingHours, services, logo } = updateData;

  const bloodBank = await BloodBank.findByIdAndUpdate(
    bloodBankId,
    {
      name,
      phone,
      address: { street: address, city, state, pincode },
      operatingHours,
      services,
      logo,
      imageUrl: logo
    },
    { new: true, runValidators: true }
  ).select('-password').lean();

  if (!bloodBank) {
    throw new ApiError(404, 'Blood bank not found');
  }

  const inventory = await Inventory.findOne({ bloodBank: bloodBankId }).lean();
  bloodBank.inventory = inventory?.items || [];

  return bloodBank;
};

// Create a new blood bank (Admin only)
export const createBloodBank = async (data) => {
  const { name, email, phone, address, location, inventory, operatingHours } = data;

  if (!name || !email) {
    throw new ApiError(400, 'Name and email are required');
  }

  validationService.validateEmail(email);
  validationService.validatePhone(phone);

  const existingBloodBank = await BloodBank.findOne({ email }).lean();
  if (existingBloodBank) {
    throw new ApiError(400, 'Blood bank with this email already exists');
  }

  const bloodBank = new BloodBank({
    name,
    email,
    phone,
    address,
    location,
    inventory: inventory || [],
    operatingHours
  });

  await bloodBank.save();
  return bloodBank;
};

// Update blood bank inventory by blood group
export const updateBloodBankInventory = async (bloodBankId, bloodGroup, units) => {
  validationService.validateBloodGroup(bloodGroup);
  validationService.validateUnits(units);

  const inventory = await Inventory.findOneAndUpdate(
    { bloodBank: bloodBankId, 'items.bloodGroup': bloodGroup },
    {
      $set: {
        'items.$.units': units,
        'items.$.lastUpdated': new Date()
      }
    },
    { new: true }
  );

  if (!inventory) {
    throw new ApiError(404, 'Blood bank inventory not found');
  }

  await BloodBank.findOneAndUpdate(
    { _id: bloodBankId, 'inventory.bloodGroup': bloodGroup },
    {
      $set: {
        'inventory.$.units': units,
        'inventory.$.lastUpdated': new Date()
      }
    }
  );

  return inventory.items;
};

// Request password reset
export const requestPasswordReset = async (email) => {
  const bloodBank = await BloodBank.findOne({ email });
  if (!bloodBank) {
    // Don't reveal if email exists or not for security
    return { success: true };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set token and expiration (1 hour)
  bloodBank.passwordReset = {
    token: resetTokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  };

  await bloodBank.save();

  // Send email with reset token
  try {
    await sendPasswordResetEmail(email, resetToken, 'bloodbank');
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
    throw new ApiError(500, 'Failed to send reset email. Please try again later.');
  }

  return { success: true };
};

// Reset password with token
export const resetPassword = async (token, password) => {
  if (!token || !password) {
    throw new ApiError(400, 'Token and password are required');
  }

  validationService.validatePassword(password);

  // Hash the provided token
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find blood bank with valid reset token
  const bloodBank = await BloodBank.findOne({
    'passwordReset.token': resetTokenHash,
    'passwordReset.expiresAt': { $gt: new Date() }
  });

  if (!bloodBank) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Update password and clear reset token
  bloodBank.password = hashedPassword;
  bloodBank.passwordReset = undefined;

  await bloodBank.save();

  return { success: true };
};

// Verify reset token
export const verifyResetToken = async (token) => {
  if (!token) {
    throw new ApiError(400, 'Reset token is required');
  }

  // Hash the provided token
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Check if token exists and is not expired
  const bloodBank = await BloodBank.findOne({
    'passwordReset.token': resetTokenHash,
    'passwordReset.expiresAt': { $gt: new Date() }
  });

  if (!bloodBank) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  return { valid: true };
};