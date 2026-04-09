import BloodBank from '../models/BloodBank.model.js';
import BloodBankRegistrationOtp from '../models/BloodBankRegistrationOtp.model.js';
import Inventory from '../models/Inventory.model.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  sendPasswordResetEmail,
  sendBloodBankApprovalEmail,
  sendBloodBankRejectionEmail,
  sendBloodBankRegistrationOtpEmail
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
import {
  createAuthSession,
  getAuthSessionForRefresh,
  logRefreshReuseDetected,
  revokeAllPrincipalSessions,
  revokeAuthSession,
  rotateAuthSession,
} from './sessionService.js';

const buildBloodBankClaims = (bloodBank) => ({
  bloodBankId: String(bloodBank.id),
  type: 'bloodbank',
  role: 'bloodbank',
  email: bloodBank.email,
  sid: bloodBank.sessionId,
  tokenVersion: Number(bloodBank.tokenVersion || 0),
});

const PUBLIC_BANKS_CACHE_TTL_MS = 30 * 1000;
const publicBloodBanksCache = new Map();

const BLOODBANK_OTP_EXPIRY_MINUTES = Math.max(1, Number(process.env.BLOODBANK_OTP_EXPIRY_MINUTES) || 10);
const BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS = Math.max(1, Number(process.env.BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS) || 5);
const BLOODBANK_OTP_MAX_RESEND_ATTEMPTS = Math.max(1, Number(process.env.BLOODBANK_OTP_MAX_RESEND_ATTEMPTS) || 5);
const BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS = Math.max(10, Number(process.env.BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS) || 60);
const BLOODBANK_PENDING_REGISTRATION_TTL_MINUTES = Math.max(5, Number(process.env.BLOODBANK_PENDING_REGISTRATION_TTL_MINUTES) || 60);
const BLOODBANK_OTP_HASH_SECRET = process.env.BLOODBANK_OTP_HASH_SECRET;

const maskEmail = (email = '') => {
  const [localPart, domain = ''] = String(email).split('@');
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
};

const normalizeRegistrationPayload = (rawData = {}) => {
  const normalized = { ...rawData };
  ['operatingHours', 'location', 'services', 'contactPerson', 'inventory', 'address'].forEach((field) => {
    if (typeof normalized[field] === 'string') {
      try {
        normalized[field] = JSON.parse(normalized[field]);
      } catch (_e) {
        // Keep as-is when not a JSON string.
      }
    }
  });

  if (typeof normalized.email === 'string') {
    normalized.email = normalized.email.trim().toLowerCase();
  }

  return normalized;
};

const validateRegistrationData = (data) => {
  const {
    name,
    email,
    password,
    phone,
    licenseNumber,
  } = data;

  if (!name || !email || !password || !phone || !licenseNumber) {
    throw new ApiError(400, 'Please provide all required fields: name, email, password, phone, and license number');
  }

  validationService.validateEmail(email);
  validationService.validatePassword(password);
  validationService.validatePhone(phone);
};

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(`${String(otp)}:${BLOODBANK_OTP_HASH_SECRET}`).digest('hex');

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const buildOtpMeta = (record) => {
  const now = Date.now();
  const resendAvailableInSeconds = Math.max(
    0,
    Math.ceil(
      (new Date(record.lastOtpSentAt).getTime() + BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000
    )
  );
  const otpExpiresInSeconds = Math.max(
    0,
    Math.ceil((new Date(record.otpExpiresAt).getTime() - now) / 1000)
  );

  return {
    verificationId: record.verificationId,
    maskedEmail: maskEmail(record.email),
    attemptsRemaining: Math.max(0, BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS - (record.verifyAttemptsUsed || 0)),
    resendAttemptsRemaining: Math.max(0, BLOODBANK_OTP_MAX_RESEND_ATTEMPTS - (record.resendCount || 0)),
    resendAvailableInSeconds,
    otpExpiresInSeconds,
    maxVerifyAttempts: BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS,
    maxResendAttempts: BLOODBANK_OTP_MAX_RESEND_ATTEMPTS,
  };
};

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

const createBloodBankSession = async (req, res, bloodBank) => {
  const tokenVersion =
    typeof bloodBank?.tokenVersion === 'number'
      ? Number(bloodBank.tokenVersion)
      : Number((await BloodBank.findById(bloodBank.id).select('+tokenVersion').lean())?.tokenVersion || 0);
  const sessionId = crypto.randomUUID();
  const { refreshToken, refreshTokenExpiresAt, csrfToken, accessTokenExpiresAt } = setAuthCookies(
    res,
    'bloodbank',
    buildBloodBankClaims({ ...bloodBank, sessionId, tokenVersion })
  );

  await createAuthSession({
    sessionId,
    role: 'bloodbank',
    bloodBankId: bloodBank.id,
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenExpiresAt,
    tokenVersion,
    req,
  });

  return { csrfToken, accessTokenExpiresAt };
};

const incrementBloodBankTokenVersion = async (bloodBankId, reason = 'security_event') => {
  const updatedBank = await BloodBank.findByIdAndUpdate(
    bloodBankId,
    {
      $inc: { tokenVersion: 1 },
      $set: { passwordChangedAt: new Date() },
    },
    { new: true }
  ).select('_id email +tokenVersion').lean();

  if (!updatedBank) {
    throw new ApiError(401, 'Blood bank session is invalid');
  }

  await revokeAllPrincipalSessions({ role: 'bloodbank', bloodBankId, reason });
  return updatedBank;
};

export const issueBloodBankCsrfToken = (res) => {
  const { csrfCookie } = getCookieNamesForRole('bloodbank');
  const csrfToken = generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, getPublicCookieOptions());

  return { csrfToken };
};

const buildInitialInventory = () => ([
  { bloodGroup: 'A+', units: 0 },
  { bloodGroup: 'A-', units: 0 },
  { bloodGroup: 'B+', units: 0 },
  { bloodGroup: 'B-', units: 0 },
  { bloodGroup: 'AB+', units: 0 },
  { bloodGroup: 'AB-', units: 0 },
  { bloodGroup: 'O+', units: 0 },
  { bloodGroup: 'O-', units: 0 }
]);

const assertBloodBankNotExists = async (email, licenseNumber) => {
  const existingBloodBank = await BloodBank.findOne({
    $or: [{ email }, { licenseNumber }]
  }).lean();

  if (existingBloodBank) {
    throw new ApiError(400, 'Blood bank with this email or license number already exists');
  }
};

const createBloodBankAndInventory = async (data) => {
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

  const initialInventory = buildInitialInventory();

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
    imageUrl: logo || '',
    profileImage: logo || '',
    profileImagePublicId: data.profileImagePublicId || '',
    isActive: false,
    isVerified: true,
    approvalStatus: 'pending',
    rejectionReason: ''
  });

  await bloodBank.save();

  const inventory = new Inventory({
    bloodBank: bloodBank._id,
    bloodBankName: bloodBank.name,
    items: initialInventory.map((item) => ({ ...item, lastUpdated: new Date() }))
  });
  await inventory.save();

  return {
    bloodBank: sanitizeBloodBank(bloodBank),
    requiresApproval: true,
    emailVerified: true,
  };
};

const buildRegistrationDataFromRequest = async (req) => {
  const body = normalizeRegistrationPayload(req.body || {});

  if (req.file) {
    const uploadResult = await fileUploadService.handleSingleUpload(req.file.path, 'blood-bank/profiles');
    body.logo = uploadResult.url;
    body.profileImagePublicId = uploadResult.publicId;
  }

  validateRegistrationData(body);

  return body;
};

export const initiateBloodBankRegistrationWithOtp = async (req) => {
  const registrationData = await buildRegistrationDataFromRequest(req);
  await assertBloodBankNotExists(registrationData.email, registrationData.licenseNumber);

  const now = new Date();
  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const verificationId = crypto.randomBytes(24).toString('hex');
  const otpExpiresAt = new Date(now.getTime() + BLOODBANK_OTP_EXPIRY_MINUTES * 60 * 1000);
  const recordExpiresAt = new Date(now.getTime() + BLOODBANK_PENDING_REGISTRATION_TTL_MINUTES * 60 * 1000);
  const hashedPassword = await bcrypt.hash(registrationData.password, 12);

  const existingPending = await BloodBankRegistrationOtp.findOne({
    email: registrationData.email,
    status: 'pending',
    expiresAt: { $gt: now },
  }).select('+otpHash');

  if (existingPending && existingPending.lastOtpSentAt) {
    const remainingSeconds = Math.ceil(
      (existingPending.lastOtpSentAt.getTime() + BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000
    );
    if (remainingSeconds > 0) {
      const error = new ApiError(429, `Please wait ${remainingSeconds} seconds before requesting another OTP`);
      error.data = buildOtpMeta(existingPending.toObject());
      throw error;
    }
  }

  const pendingData = {
    verificationId,
    email: registrationData.email,
    otpHash,
    otpExpiresAt,
    status: 'pending',
    verifyAttemptsUsed: 0,
    resendCount: 0,
    lastOtpSentAt: now,
    registrationData: {
      ...registrationData,
      password: hashedPassword,
      passwordIsHashed: true,
    },
    clientMeta: {
      ip: String(req.ip || ''),
      userAgent: String(req.get('user-agent') || ''),
    },
    expiresAt: recordExpiresAt,
    verifiedAt: null,
  };

  if (existingPending) {
    Object.assign(existingPending, pendingData);
    await existingPending.save();
  } else {
    await BloodBankRegistrationOtp.create(pendingData);
  }

  try {
    await sendBloodBankRegistrationOtpEmail(registrationData.email, otp, {
      expiresInMinutes: BLOODBANK_OTP_EXPIRY_MINUTES,
    });
  } catch (_error) {
    await BloodBankRegistrationOtp.deleteOne({ verificationId });
    throw new ApiError(500, 'Unable to send OTP email. Please try again later.');
  }

  const record = await BloodBankRegistrationOtp.findOne({ verificationId }).lean();
  return {
    ...buildOtpMeta(record),
    nextStep: 'verify_otp',
  };
};

export const verifyBloodBankRegistrationOtp = async (verificationId, otp) => {
  if (!verificationId || !otp) {
    throw new ApiError(400, 'verificationId and otp are required');
  }

  const now = new Date();
  const pendingRegistration = await BloodBankRegistrationOtp.findOne({
    verificationId: String(verificationId),
  }).select('+otpHash');

  if (!pendingRegistration) {
    throw new ApiError(400, 'Invalid or expired verification session');
  }

  if (pendingRegistration.status === 'locked') {
    const error = new ApiError(429, 'Maximum OTP attempts reached. Please restart registration.');
    error.data = buildOtpMeta(pendingRegistration.toObject());
    throw error;
  }

  if (pendingRegistration.status !== 'pending' || pendingRegistration.expiresAt <= now || pendingRegistration.otpExpiresAt <= now) {
    pendingRegistration.status = 'expired';
    await pendingRegistration.save();
    const error = new ApiError(400, 'OTP is invalid or expired. Please restart registration.');
    error.data = buildOtpMeta(pendingRegistration.toObject());
    throw error;
  }

  if (pendingRegistration.verifyAttemptsUsed >= BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS) {
    pendingRegistration.status = 'locked';
    await pendingRegistration.save();
    const error = new ApiError(429, 'Maximum OTP attempts reached. Please restart registration.');
    error.data = buildOtpMeta(pendingRegistration.toObject());
    throw error;
  }

  const isOtpValid = pendingRegistration.otpHash === hashOtp(String(otp).trim());
  if (!isOtpValid) {
    pendingRegistration.verifyAttemptsUsed += 1;
    if (pendingRegistration.verifyAttemptsUsed >= BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS) {
      pendingRegistration.status = 'locked';
    }
    await pendingRegistration.save();

    const meta = buildOtpMeta(pendingRegistration.toObject());
    const error = new ApiError(
      pendingRegistration.status === 'locked' ? 429 : 400,
      pendingRegistration.status === 'locked'
        ? 'Maximum OTP attempts reached. Please restart registration.'
        : `Invalid OTP. ${meta.attemptsRemaining} attempts remaining.`
    );
    error.data = meta;
    throw error;
  }

  const registrationData = normalizeRegistrationPayload(pendingRegistration.registrationData || {});
  if (registrationData.passwordIsHashed !== true) {
    throw new ApiError(400, 'Registration payload is invalid. Please restart registration.');
  }

  await assertBloodBankNotExists(registrationData.email, registrationData.licenseNumber);

  const result = await createBloodBankAndInventory({
    ...registrationData,
    password: registrationData.password,
  });

  await BloodBankRegistrationOtp.deleteOne({ _id: pendingRegistration._id });

  return {
    ...result,
    nextStep: 'await_admin_approval',
  };
};

export const resendBloodBankRegistrationOtp = async (verificationId) => {
  if (!verificationId) {
    throw new ApiError(400, 'verificationId is required');
  }

  const now = new Date();
  const pendingRegistration = await BloodBankRegistrationOtp.findOne({
    verificationId: String(verificationId),
    status: 'pending',
  }).select('+otpHash');

  if (!pendingRegistration || pendingRegistration.expiresAt <= now) {
    throw new ApiError(400, 'Invalid or expired verification session');
  }

  if (pendingRegistration.resendCount >= BLOODBANK_OTP_MAX_RESEND_ATTEMPTS) {
    pendingRegistration.status = 'locked';
    await pendingRegistration.save();
    const error = new ApiError(429, 'Maximum OTP resend attempts reached. Please restart registration.');
    error.data = buildOtpMeta(pendingRegistration.toObject());
    throw error;
  }

  const remainingSeconds = Math.ceil(
    (pendingRegistration.lastOtpSentAt.getTime() + BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000
  );
  if (remainingSeconds > 0) {
    const error = new ApiError(429, `Please wait ${remainingSeconds} seconds before resending OTP`);
    error.data = buildOtpMeta(pendingRegistration.toObject());
    throw error;
  }

  const otp = generateOtp();
  pendingRegistration.otpHash = hashOtp(otp);
  pendingRegistration.otpExpiresAt = new Date(Date.now() + BLOODBANK_OTP_EXPIRY_MINUTES * 60 * 1000);
  pendingRegistration.resendCount += 1;
  pendingRegistration.lastOtpSentAt = new Date();

  await pendingRegistration.save();

  try {
    await sendBloodBankRegistrationOtpEmail(pendingRegistration.email, otp, {
      expiresInMinutes: BLOODBANK_OTP_EXPIRY_MINUTES,
    });
  } catch (_error) {
    throw new ApiError(500, 'Unable to send OTP email. Please try again later.');
  }

  return {
    ...buildOtpMeta(pendingRegistration.toObject()),
    nextStep: 'verify_otp',
  };
};

export const registerBloodBankFromRequest = async (req) => initiateBloodBankRegistrationWithOtp(req);

export const loginBloodBankWithSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginBloodBank(email, password);
  const { csrfToken, accessTokenExpiresAt } = await createBloodBankSession(req, res, result.bloodBank);
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
  const [bloodBankSession, sessionRecord] = await Promise.all([
    BloodBank.findById(decoded.bloodBankId)
      .select('_id email +tokenVersion')
      .lean(),
    getAuthSessionForRefresh({ role: 'bloodbank', sessionId: decoded.sid }),
  ]);

  const incomingRefreshHash = hashToken(refreshToken);
  const requiresGlobalRevoke =
    !bloodBankSession ||
    !sessionRecord ||
    sessionRecord.revokedAt ||
    new Date(sessionRecord.expiresAt).getTime() <= Date.now() ||
    Number(decoded.tokenVersion) !== Number(bloodBankSession.tokenVersion || 0) ||
    Number(sessionRecord.tokenVersion) !== Number(bloodBankSession.tokenVersion || 0) ||
    sessionRecord.refreshTokenHash !== incomingRefreshHash;

  if (requiresGlobalRevoke) {
    if (bloodBankSession?._id) {
      await incrementBloodBankTokenVersion(bloodBankSession._id, 'refresh_reuse_detected');
    }
    logRefreshReuseDetected({
      role: 'bloodbank',
      sessionId: decoded.sid,
      principal: decoded.bloodBankId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    clearAuthCookies(res, 'bloodbank');
    throw new ApiError(401, 'Refresh token is invalid or has been reused');
  }

  const result = await getSessionBloodBank(decoded.bloodBankId);
  const { refreshToken: nextRefreshToken, refreshTokenExpiresAt, csrfToken, accessTokenExpiresAt } = setAuthCookies(
    res,
    'bloodbank',
    buildBloodBankClaims({
      ...result.bloodBank,
      sessionId: decoded.sid,
      tokenVersion: Number(bloodBankSession.tokenVersion || 0),
    })
  );
  await rotateAuthSession({
    role: 'bloodbank',
    sessionId: decoded.sid,
    refreshTokenHash: hashToken(nextRefreshToken),
    refreshTokenExpiresAt,
    tokenVersion: Number(bloodBankSession.tokenVersion || 0),
    req,
  });
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
      await revokeAuthSession({ role: 'bloodbank', sessionId: decoded.sid, reason: 'logout' });
    } catch (_error) {
      // Still clear client cookies even if refresh token is already invalid.
    }
  }

  clearAuthCookies(res, 'bloodbank');
  return { success: true };
};

export const registerBloodBank = async (data) => {
  const registrationData = normalizeRegistrationPayload(data);
  validateRegistrationData(registrationData);
  await assertBloodBankNotExists(registrationData.email, registrationData.licenseNumber);
  return createBloodBankAndInventory(registrationData);
};

// Login blood bank
export const loginBloodBank = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Find blood bank (include lockout fields alongside password)
  const bloodBank = await BloodBank.findOne({ email }).select('+password +loginAttempts +lockUntil +tokenVersion');
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
  bloodBank.tokenVersion = Number(bloodBank.tokenVersion || 0) + 1;
  bloodBank.passwordChangedAt = new Date();

  await bloodBank.save();
  await revokeAllPrincipalSessions({ role: 'bloodbank', bloodBankId: bloodBank._id, reason: 'password_reset' });

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

