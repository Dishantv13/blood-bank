import BloodBank from '../models/BloodBank.model.js';
import Inventory from '../models/Inventory.model.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  sendPasswordResetEmail,
  sendBloodBankApprovalEmail,
  sendBloodBankRejectionEmail
} from '../utils/emailService.js';
import * as fileUploadService from './fileUploadService.js';
import * as validationService from './validationService.js';
import { ApiError } from '../utils/apiError.js';
import {
  clearAuthCookies,
  generateCsrfToken,
  getAccessTokenExpiryFromRequest,
  getCookieNamesForRole,
  getRefreshTokenFromRequest,
  hashToken,
  setAuthCookies,
  verifyRefreshToken,
  getPublicCookieOptions,
} from '../utils/authCookies.js';
import { enforceCsrfForRole } from '../middleware/csrf.js';
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from '../config/authConfig.js';
import { sanitizeBloodBank, BLOOD_BANK_LIST_FIELDS, BLOOD_BANK_SAFE_FIELDS } from '../utils/serializers.js';
import { ensureValidObjectId } from '../utils/dbGuards.js';

const buildBloodBankClaims = (bloodBank) => ({
  bloodBankId: String(bloodBank.id),
  type: 'bloodbank',
  role: 'bloodbank',
  email: bloodBank.email,
});

const PUBLIC_BANKS_CACHE_TTL_MS = 30 * 1000;
const publicBloodBanksCache = new Map();

const getCachedPublicBanks = (key) => {
  const cached = publicBloodBanksCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    publicBloodBanksCache.delete(key);
    return null;
  }
  return cached.payload;
};

const setCachedPublicBanks = (key, payload) => {
  publicBloodBanksCache.set(key, {
    payload,
    expiresAt: Date.now() + PUBLIC_BANKS_CACHE_TTL_MS,
  });
};

export const invalidatePublicBloodBanksCache = () => {
  publicBloodBanksCache.clear();
};

const persistBloodBankRefreshToken = async (bloodBankId, refreshToken) => {
  await BloodBank.updateOne(
    { _id: bloodBankId },
    {
      $set: {
        'authSession.refreshTokenHash': hashToken(refreshToken),
        'authSession.refreshTokenIssuedAt': new Date(),
      },
    }
  );
};

const clearBloodBankRefreshToken = async (bloodBankId) => {
  if (!bloodBankId) return;

  await BloodBank.updateOne(
    { _id: bloodBankId },
    {
      $set: {
        'authSession.refreshTokenHash': null,
        'authSession.refreshTokenIssuedAt': null,
      },
    }
  );
};

export const issueBloodBankCsrfToken = (res) => {
  const { csrfCookie } = getCookieNamesForRole('bloodbank');
  const csrfToken = generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, getPublicCookieOptions());

  return { csrfToken };
};

export const registerBloodBankFromRequest = async (req) => {
  ['address', 'operatingHours', 'location', 'services', 'contactPerson', 'inventory'].forEach((field) => {
    if (typeof req.body[field] === 'string') {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (_e) {
        // Keep as string if parsing fails
      }
    }
  });

  if (req.file) {
    const uploadResult = await fileUploadService.handleSingleUpload(req.file.path, 'blood-bank/profiles');
    req.body.logo = uploadResult.url;
    req.body.profileImagePublicId = uploadResult.publicId;
  }

  return registerBloodBank(req.body);
};

export const loginBloodBankWithSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginBloodBank(email, password);
  const { refreshToken, csrfToken, accessTokenExpiresAt } = setAuthCookies(res, 'bloodbank', buildBloodBankClaims(result.bloodBank));
  await persistBloodBankRefreshToken(result.bloodBank.id, refreshToken);
  return { bloodBank: result.bloodBank, csrfToken, accessTokenExpiresAt };
};

export const refreshBloodBankSession = async (req, res) => {
  if (!enforceCsrfForRole(req, 'bloodbank')) {
    throw new ApiError(403, 'Invalid or missing CSRF token');
  }

  const refreshToken = getRefreshTokenFromRequest(req, 'bloodbank');
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token missing');
  }

  const decoded = verifyRefreshToken('bloodbank', refreshToken);
  const bloodBankSession = await BloodBank.findById(decoded.bloodBankId)
    .select('_id +authSession.refreshTokenHash')
    .lean();

  if (!bloodBankSession?.authSession?.refreshTokenHash || bloodBankSession.authSession.refreshTokenHash !== hashToken(refreshToken)) {
    clearAuthCookies(res, 'bloodbank');
    throw new ApiError(401, 'Refresh token is invalid');
  }

  const result = await getSessionBloodBank(decoded.bloodBankId);
  const { refreshToken: nextRefreshToken, csrfToken, accessTokenExpiresAt } = setAuthCookies(res, 'bloodbank', buildBloodBankClaims(result.bloodBank));
  await persistBloodBankRefreshToken(decoded.bloodBankId, nextRefreshToken);
  return { bloodBank: result.bloodBank, csrfToken, accessTokenExpiresAt };
};

export const logoutBloodBankSession = async (req, res) => {
  if (!enforceCsrfForRole(req, 'bloodbank')) {
    throw new ApiError(403, 'Invalid or missing CSRF token');
  }

  const refreshToken = getRefreshTokenFromRequest(req, 'bloodbank');
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken('bloodbank', refreshToken);
      await clearBloodBankRefreshToken(decoded.bloodBankId);
    } catch (_error) {
      // Still clear client cookies even if refresh token is already invalid.
    }
  }

  clearAuthCookies(res, 'bloodbank');
  return { success: true };
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
    password, // Let the model's pre-save hook handle hashing
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
    imageUrl: logo || '',
    profileImage: logo || '', // Use the uploaded photo as profile image too
    profileImagePublicId: data.profileImagePublicId || '',
    isActive: false,
    isVerified: false,
    approvalStatus: 'pending',
    rejectionReason: ''
  });

  await bloodBank.save();

  // Create entry in Inventory collection
  const inventory = new Inventory({
    bloodBank: bloodBank._id,
    bloodBankName: bloodBank.name,
    items: initialInventory.map(item => ({ ...item, lastUpdated: new Date() }))
  });
  await inventory.save();

  return {
    bloodBank: sanitizeBloodBank(bloodBank),
    requiresApproval: true
  };
};

// Login blood bank
export const loginBloodBank = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Find blood bank (include lockout fields alongside password)
  const bloodBank = await BloodBank.findOne({ email }).select('+password +loginAttempts +lockUntil');
  if (!bloodBank) {
    throw new ApiError(401, 'Invalid credentials');
  }

  if (bloodBank.approvalStatus === 'pending') {
    throw new ApiError(403, 'Your registration request is still pending admin approval. Please wait for the approval email before logging in.');
  }

  if (bloodBank.approvalStatus === 'rejected') {
    const rejectionReason = bloodBank.rejectionReason
      ? ` Reason: ${bloodBank.rejectionReason}`
      : '';
    throw new ApiError(403, `Your registration request was rejected by the admin.${rejectionReason}`);
  }

  if (!bloodBank.isActive || !bloodBank.isVerified) {
    throw new ApiError(403, 'Your blood bank account is not active. Please contact the admin.');
  }

  // Check if account is temporarily locked
  if (bloodBank.lockUntil && bloodBank.lockUntil > Date.now()) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check password
  const isMatch = await bloodBank.comparePassword(password);
  if (!isMatch) {
    const attempts = (bloodBank.loginAttempts || 0) + 1;
    bloodBank.loginAttempts = attempts;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      bloodBank.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await bloodBank.save();
    throw new ApiError(401, 'Invalid credentials');
  }

  // Successful login – clear lockout state
  if (bloodBank.loginAttempts || bloodBank.lockUntil) {
    bloodBank.loginAttempts = 0;
    bloodBank.lockUntil = undefined;
    await bloodBank.save();
  }

  return {
    bloodBank: sanitizeBloodBank(bloodBank)
  };
};

// Get all public blood banks or nearby ones
export const getAllBloodBanks = async (query) => {
  const { latitude, longitude, maxDistance, bloodGroup } = query;
  const cacheKey = JSON.stringify({
    latitude: latitude || null,
    longitude: longitude || null,
    maxDistance: maxDistance || null,
    bloodGroup: bloodGroup || null,
  });
  const cached = getCachedPublicBanks(cacheKey);
  if (cached) {
    return cached;
  }

  let bloodBanks;
  if (latitude && longitude) {
    // Geospatial query for nearby blood banks
    const geoQuery = {
      isActive: true,
      approvalStatus: 'approved',
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

    bloodBanks = await BloodBank.find(geoQuery).select(BLOOD_BANK_LIST_FIELDS).lean();
  } else {
    bloodBanks = await BloodBank.find({ isActive: true, approvalStatus: 'approved' }).select(BLOOD_BANK_LIST_FIELDS).lean();
  }

  // Batch fetch inventories (avoid N+1)
  const bankIds = bloodBanks.map(bank => bank._id);
  const inventories = bankIds.length
    ? await Inventory.find({ bloodBank: { $in: bankIds } })
      .select('bloodBank items.bloodGroup items.units')
      .lean()
    : [];
  const inventoryMap = new Map(inventories.map(inv => [inv.bloodBank.toString(), inv.items || []]));

  const resolveLightweightLogo = (bank) => {
    const imageCandidate = typeof bank.imageUrl === 'string' ? bank.imageUrl.trim() : '';
    if (imageCandidate && !imageCandidate.startsWith('data:')) {
      return imageCandidate;
    }

    const logoCandidate = typeof bank.logo === 'string' ? bank.logo.trim() : '';
    if (!logoCandidate || logoCandidate.startsWith('data:')) {
      return '';
    }

    return logoCandidate;
  };

  const bloodBanksWithInventory = bloodBanks.map(bank => ({
    ...sanitizeBloodBank(bank),
    logo: resolveLightweightLogo(bank),
    inventory: inventoryMap.get(bank._id.toString()) || bank.inventory || []
  }));

  // Filter by blood group availability if specified
  if (bloodGroup) {
    validationService.validateBloodGroup(bloodGroup);
    const filteredBanks = bloodBanksWithInventory.filter(bank =>
      bank.inventory.some(item => item.bloodGroup === bloodGroup && item.units > 0)
    );
    setCachedPublicBanks(cacheKey, filteredBanks);
    return filteredBanks;
  }

  setCachedPublicBanks(cacheKey, bloodBanksWithInventory);
  return bloodBanksWithInventory;
};

// Get blood bank by ID
export const getBloodBankById = async (bloodBankId) => {
  ensureValidObjectId(bloodBankId, 'blood bank id');
  const [bloodBank, inventory] = await Promise.all([
    BloodBank.findById(bloodBankId).select(BLOOD_BANK_SAFE_FIELDS).lean(),
    Inventory.findOne({ bloodBank: bloodBankId }).lean()
  ]);

  if (!bloodBank || bloodBank.approvalStatus !== 'approved' || !bloodBank.isActive) {
    throw new ApiError(404, 'Blood bank not found');
  }

  return sanitizeBloodBank({
    ...bloodBank,
    inventory: inventory?.items || []
  });
};

// Get blood bank profile (for authenticated blood bank)
export const getBloodBankProfile = async (bloodBankId) => {
  ensureValidObjectId(bloodBankId, 'blood bank id');
  const [bloodBank, inventory] = await Promise.all([
    BloodBank.findById(bloodBankId).select(BLOOD_BANK_SAFE_FIELDS).lean(),
    Inventory.findOne({ bloodBank: bloodBankId }).lean()
  ]);

  if (!bloodBank) {
    throw new ApiError(404, 'Blood bank not found');
  }

  return sanitizeBloodBank({
    ...bloodBank,
    inventory: inventory?.items || []
  });
};

export const getSessionBloodBank = async (bloodBankId) => {
  ensureValidObjectId(bloodBankId, 'blood bank id');
  const bloodBank = await BloodBank.findById(bloodBankId).select(BLOOD_BANK_SAFE_FIELDS).lean();
  if (!bloodBank) {
    throw new ApiError(401, 'Blood bank session is invalid');
  }

  return {
    bloodBank: sanitizeBloodBank(bloodBank)
  };
};

export const getSessionBloodBankWithExpiry = async (req, bloodBankId) => {
  const result = await getSessionBloodBank(bloodBankId);
  return {
    ...result,
    accessTokenExpiresAt: getAccessTokenExpiryFromRequest(req, 'bloodbank'),
  };
};

// Update blood bank profile
export const updateBloodBankProfile = async (bloodBankId, updateData) => {
  const { name, phone, address, city, state, pincode, operatingHours, services, logo } = updateData;

  const [bloodBank, inventory] = await Promise.all([
    BloodBank.findByIdAndUpdate(
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
    ).select(BLOOD_BANK_SAFE_FIELDS).lean(),
    Inventory.findOne({ bloodBank: bloodBankId }).lean()
  ]);

  if (!bloodBank) {
    throw new ApiError(404, 'Blood bank not found');
  }

  invalidatePublicBloodBanksCache();

  return sanitizeBloodBank({
    ...bloodBank,
    inventory: inventory?.items || []
  });
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
    operatingHours,
    isActive: true,
    isVerified: true,
    approvalStatus: 'approved',
    reviewedAt: new Date(),
    reviewedBy: 'admin'
  });

  await bloodBank.save();
  invalidatePublicBloodBanksCache();
  return sanitizeBloodBank(bloodBank);
};

// Update blood bank inventory by blood group
export const updateBloodBankInventory = async (bloodBankId, bloodGroup, units) => {
  ensureValidObjectId(bloodBankId, 'blood bank id');
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

  invalidatePublicBloodBanksCache();
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
  bloodBank.authSession = {
    refreshTokenHash: null,
    refreshTokenIssuedAt: null,
  };

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

export const sendBloodBankRegistrationApprovedEmail = async (bloodBank) => {
  await sendBloodBankApprovalEmail(bloodBank.email, bloodBank.name);
};

export const sendBloodBankRegistrationRejectedEmail = async (bloodBank, rejectionReason) => {
  await sendBloodBankRejectionEmail(bloodBank.email, bloodBank.name, rejectionReason);
};

