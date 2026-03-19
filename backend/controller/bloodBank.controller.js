import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import BloodBank from '../models/BloodBank.model.js';
import Inventory from '../models/Inventory.model.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { asyncHandler } from "../utils/asynchandler.js";    
import { successResponse, errorResponse } from '../utils/response.js';

// Generate JWT Token for Blood Bank
const generateToken = (id) => {
  return jwt.sign({ bloodBankId: id, type: 'bloodbank' }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

// Register a new blood bank
const register = asyncHandler(async (req, res) => {
    console.log('Blood bank registration attempt:', { email: req.body.email, name: req.body.name });
    
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
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !phone || !licenseNumber) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ 
        message: 'Please provide all required fields: name, email, password, phone, and license number' 
      });
    }

    // Check if blood bank already exists
    const existingBloodBank = await BloodBank.findOne({ 
      $or: [{ email }, { licenseNumber }] 
    });
    
    if (existingBloodBank) {
      console.log('Blood bank already exists:', { email, licenseNumber });
      return res.status(400).json({ 
        message: 'Blood bank with this email or license number already exists' 
      });
    }

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
      password,
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

    // Create entry in Inventory collection as well
    const inventory = new Inventory({
        bloodBank: bloodBank._id,
        bloodBankName: bloodBank.name,
        items: initialInventory.map(item => ({ ...item, lastUpdated: new Date() }))
    });
    await inventory.save();

    console.log('Blood bank and inventory registered successfully:', bloodBank._id);
    
    res.status(201).json({
      message: 'Blood bank registered successfully',
      bloodBank: {
        id: bloodBank._id,
        name: bloodBank.name,
        email: bloodBank.email
      }
    });
});

// Login blood bank
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

    // Check for blood bank
    const bloodBank = await BloodBank.findOne({ email });
    if (!bloodBank) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bloodBank.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(bloodBank._id);

    res.json({
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
    });
});

// Get blood bank profile
const getProfile = asyncHandler(async (req, res) => {
  res.json(req.bloodBank);
});

// Update blood bank profile
const updateProfile = asyncHandler(async (req, res) => {
  const bloodBank = await BloodBank.findById(req.bloodBank._id);
    
    if (bloodBank) {
      bloodBank.name = req.body.name || bloodBank.name;
      bloodBank.phone = req.body.phone || bloodBank.phone;
      bloodBank.address = req.body.address || bloodBank.address;
      bloodBank.operatingHours = req.body.operatingHours || bloodBank.operatingHours;
      bloodBank.services = req.body.services || bloodBank.services;
      bloodBank.contactPerson = req.body.contactPerson || bloodBank.contactPerson;

      const updatedBloodBank = await bloodBank.save();
      res.json(updatedBloodBank);
    } else {
      res.status(404).json({ message: 'Blood bank not found' });
    }
});

// Get blood bank inventory
const getInventory = asyncHandler(async (req, res) => {
  const bloodBank = await BloodBank.findById(req.bloodBank._id);
    res.json(bloodBank.inventory);
});

// Update blood bank inventory
const updateInventory = asyncHandler(async (req, res) => {
    const { bloodGroup, units, operation } = req.body;
    
    const bloodBank = await BloodBank.findById(req.bloodBank._id);
    
    const inventoryItem = bloodBank.inventory.find(item => item.bloodGroup === bloodGroup);
    
    if (inventoryItem) {
      if (operation === 'add') {
        inventoryItem.units += units;
      } else if (operation === 'subtract') {
        inventoryItem.units = Math.max(0, inventoryItem.units - units);
      } else {
        inventoryItem.units = units;
      }
      inventoryItem.lastUpdated = Date.now();
      
      await bloodBank.save();
      res.json(bloodBank.inventory);
    } else {
      res.status(404).json({ message: 'Blood group not found in inventory' });
    }
});

// Get all blood banks or nearby ones
const getAllBloodBanks = asyncHandler(async (req, res) => {
    const { latitude, longitude, maxDistance, bloodGroup } = req.query;

    let bloodBanks;
    if (latitude && longitude) {
      // Geospatial query for nearby blood banks
      const query = {
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

      bloodBanks = await BloodBank.find(query).select('-password').lean();
    } else {
      bloodBanks = await BloodBank.find({ isActive: true }).select('-password').lean();
    }

    // Fetch inventory for each blood bank from Inventory collection
    // Batch fetch inventories in a single query instead of N+1 queries
    const bankIds = bloodBanks.map(bank => bank._id);
    const inventories = await Inventory.find({ bloodBank: { $in: bankIds } }).lean();
    const inventoryMap = new Map(inventories.map(inv => [inv.bloodBank.toString(), inv.items || []]));

    const bloodBanksWithInventory = bloodBanks.map(bank => ({
      ...bank,
      inventory: inventoryMap.get(bank._id.toString()) || bank.inventory || []
    }));

    // Filter by blood group availability if specified
    let filteredBanks = bloodBanksWithInventory;
    if (bloodGroup) {
      filteredBanks = bloodBanksWithInventory.filter(bank => 
        bank.inventory.some(item => item.bloodGroup === bloodGroup && item.units > 0)
      );
    }

    successResponse(res, filteredBanks, 200, 'Blood banks fetched successfully');
});

// Get blood bank by ID
const getBloodBankById = asyncHandler(async (req, res) => {
  const bloodBank = await BloodBank.findById(req.params.id).select('-password').lean();
    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }
    
    // Fetch inventory from Inventory collection
    const inventory = await Inventory.findOne({ bloodBank: bloodBank._id }).lean();
    bloodBank.inventory = inventory?.items || [];
    
    successResponse(res, bloodBank, 200, 'Blood bank details fetched successfully');
});

// Create a new blood bank (Admin only)
const createBloodBank = asyncHandler(async (req, res) => {
  const { name, email, phone, address, location, inventory, operatingHours } = req.body;

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
    res.status(201).json({ message: 'Blood bank created successfully', bloodBank });
});

// Update blood bank inventory by blood group
const updateBloodBankInventory = asyncHandler(async (req, res) => {
  const { bloodGroup, units } = req.body;

    const bloodBank = await BloodBank.findById(req.params.id);
    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    // Find and update or add inventory item
    const inventoryIndex = bloodBank.inventory.findIndex(
      item => item.bloodGroup === bloodGroup
    );

    if (inventoryIndex > -1) {
      bloodBank.inventory[inventoryIndex].units = units;
      bloodBank.inventory[inventoryIndex].lastUpdated = Date.now();
    } else {
      bloodBank.inventory.push({ bloodGroup, units, lastUpdated: Date.now() });
    }

    await bloodBank.save();
    res.json({ message: 'Inventory updated successfully', bloodBank });
});

// Send password reset email
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find blood bank by email
    const bloodBank = await BloodBank.findOne({ email });
    if (!bloodBank) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({ 
        message: 'If an account exists with this email, you will receive a password reset link shortly' 
      });
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
      return res.status(500).json({ 
        message: 'Failed to send reset email. Please try again later.' 
      });
    }

    res.status(200).json({ 
      message: 'Password reset email sent successfully. Please check your email.' 
    });
});

// Reset password
const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash the provided token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find blood bank with valid reset token
    const bloodBank = await BloodBank.findOne({
      'passwordReset.token': resetTokenHash,
      'passwordReset.expiresAt': { $gt: new Date() }
    });

    if (!bloodBank) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    bloodBank.password = hashedPassword;
    bloodBank.passwordReset = undefined;

    await bloodBank.save();

    res.status(200).json({ 
      message: 'Password reset successful. You can now login with your new password.' 
    });
});

// Verify reset token
const verifyResetToken = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Reset token is required' });
    }

    // Hash the provided token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token exists and is not expired
    const bloodBank = await BloodBank.findOne({
      'passwordReset.token': resetTokenHash,
      'passwordReset.expiresAt': { $gt: new Date() }
    });

    if (!bloodBank) {
      return res.status(400).json({ 
        valid: false,
        message: 'Invalid or expired reset token' 
      });
    }

    res.status(200).json({ 
      valid: true,
      message: 'Token is valid' 
    });
});

// Change password for authenticated blood bank
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Get blood bank with password field
    const bloodBank = await BloodBank.findById(req.bloodBank._id);
    if (!bloodBank) {
      return res.status(404).json({ message: 'Blood bank not found' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, bloodBank.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, bloodBank.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    bloodBank.password = hashedPassword;
    await bloodBank.save();

    res.status(200).json({ 
      message: 'Password changed successfully' 
    });
});

// Export generateToken for use in other controllers
export { 
  generateToken,
  register,
  login,
  getProfile,
  updateProfile,
  getInventory,
  updateInventory,
  getAllBloodBanks,
  getBloodBankById,
  createBloodBank,
  updateBloodBankInventory,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  changePassword
 };
