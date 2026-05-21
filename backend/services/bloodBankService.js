import mongoose from "mongoose";
import crypto from "crypto";
import bloodBankRepository from "../repositories/BloodBankRepository.js";
import inventoryRepository from "../repositories/InventoryRepository.js";
import cacheManager from "../utils/cacheManager.js";
import bloodBankRegistrationOtpRepository from "../repositories/BloodBankRegistrationOtpRepository.js";
import { enforceCsrfForRole } from "../middleware/csrf.js";
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from "../config/authConfig.js";
import { ApiError } from "../utils/apiError.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import { ensureValidObjectId } from "../utils/dbGuards.js";
import { BLOOD_GROUPS } from "../validations/validation.constants.js";
import * as emailService from "../utils/emailService.js";
import * as fileUploadService from "./fileUploadService.js";
import * as otpHelpers from "../utils/otpHelpers.js";
import * as validationService from "./validationService.js";
import * as authCookies from "../utils/authCookies.js";
import * as serializers from "../utils/serializers.js";
import * as sessionService from "./sessionService.js";
import * as bloodBankManager from "./bloodBankManagerService.js";
import * as pagination from "../utils/pagination.js";

const buildBloodBankClaims = (bloodBank) => ({
  bloodBankId: String(bloodBank.id || bloodBank._id),
  type: "bloodbank",
  role: "bloodbank",
  email: bloodBank.email,
  sid: bloodBank.sessionId,
  tokenVersion: Number(bloodBank.tokenVersion || 0),
});

const PUBLIC_BANKS_CACHE_TTL_SECONDS = 30; // Redis uses seconds for TTL in set options
const CACHE_KEYS = {
  PUBLIC_BANKS: "public_banks",
};

const BLOODBANK_OTP_EXPIRY_MINUTES = Math.max(
  1,
  Number(process.env.BLOODBANK_OTP_EXPIRY_MINUTES) || 10,
);
const BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS = Math.max(
  1,
  Number(process.env.BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS) || 5,
);
const BLOODBANK_OTP_MAX_RESEND_ATTEMPTS = Math.max(
  1,
  Number(process.env.BLOODBANK_OTP_MAX_RESEND_ATTEMPTS) || 5,
);
const BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS = Math.max(
  10,
  Number(process.env.BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS) || 60,
);
const BLOODBANK_PENDING_REGISTRATION_TTL_MINUTES = Math.max(
  5,
  Number(process.env.BLOODBANK_PENDING_REGISTRATION_TTL_MINUTES) || 60,
);

const normalizeRegistrationPayload = (rawData = {}) => {
  const normalized = { ...rawData };
  [
    "operatingHours",
    "location",
    "services",
    "contactPerson",
    "inventory",
    "address",
  ].forEach((field) => {
    if (typeof normalized[field] === "string") {
      try {
        normalized[field] = JSON.parse(normalized[field]);
      } catch (_e) {
        // Keep as-is when not a JSON string.
      }
    }
  });

  if (typeof normalized.email === "string") {
    normalized.email = normalized.email.trim().toLowerCase();
  }

  return normalized;
};

const validateRegistrationData = (data) => {
  const { name, email, password, phone, licenseNumber } = data;

  if (!name || !email || !password || !phone || !licenseNumber) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      "Please provide all required fields: name, email, password, phone, and license number",
    );
  }

  validationService.validateEmail(email);
  validationService.validatePassword(password);
  validationService.validatePhone(phone);
};

const buildOtpMeta = (record) => {
  return otpHelpers.buildOtpMeta(record, {
    maxVerifyAttempts: BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS,
    maxResendAttempts: BLOODBANK_OTP_MAX_RESEND_ATTEMPTS,
    resendCooldownSeconds: BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS,
  });
};

const getCachedPublicBanks = async (key) => {
  return cacheManager.get(`${CACHE_KEYS.PUBLIC_BANKS}:${key}`);
};

const setCachedPublicBanks = async (key, payload) => {
  return cacheManager.set(
    `${CACHE_KEYS.PUBLIC_BANKS}:${key}`,
    payload,
    PUBLIC_BANKS_CACHE_TTL_SECONDS,
  );
};

export const invalidatePublicBloodBanksCache = async (bloodBankId = null) => {
  if (bloodBankId) {
    return cacheManager.invalidateTags(`bb:${bloodBankId}`);
  }
  return cacheManager.invalidatePattern(`${CACHE_KEYS.PUBLIC_BANKS}:*`);
};

const createBloodBankSession = async (req, res, bloodBank) => {
  const tokenVersion =
    typeof bloodBank?.tokenVersion === "number"
      ? Number(bloodBank.tokenVersion)
      : Number(
          (
            await bloodBankRepository.findById(bloodBank.id || bloodBank._id, {
              select: "+tokenVersion",
            })
          )?.tokenVersion || 0,
        );

  return sessionService.issuePrincipalSession({
    req,
    res,
    role: "bloodbank",
    principalId: bloodBank.id || bloodBank._id,
    tokenVersion,
    buildClaims: (sessionId, version) =>
      buildBloodBankClaims({ ...bloodBank, sessionId, tokenVersion: version }),
    metadata: { bloodBankId: bloodBank.id || bloodBank._id },
  });
};

const incrementBloodBankTokenVersion = async (
  bloodBankId,
  reason = "security_event",
) => {
  const updatedBank = await bloodBankRepository.updateOne(
    { _id: bloodBankId },
    {
      $inc: { tokenVersion: 1 },
      $set: { passwordChangedAt: new Date() },
    },
    { returnDocument: "after", select: "_id email +tokenVersion" },
  );

  if (!updatedBank) {
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Blood bank session is invalid");
  }

  await sessionService.revokeAllPrincipalSessions({
    role: "bloodbank",
    bloodBankId,
    reason,
  });
  return updatedBank;
};

export const issueBloodBankCsrfToken = async (req, res) => {
  const { csrfCookie } = authCookies.getCookieNamesForRole("bloodbank");
  const csrfToken = authCookies.generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, authCookies.getPublicCookieOptions());

  // Sync with active session if one exists
  const accessToken = authCookies.getAccessTokenFromRequest(req, "bloodbank");
  if (accessToken) {
    try {
      const decoded = authCookies.verifyAccessToken("bloodbank", accessToken);
      if (decoded.sid) {
        await sessionService.updateCsrfToken({
          role: "bloodbank",
          sessionId: decoded.sid,
          csrfTokenHash: authCookies.hashToken(csrfToken),
        });
      }
    } catch (_e) {}
  }

  return { csrfToken };
};

const buildInitialInventory = () =>
  BLOOD_GROUPS.map((group) => ({ bloodGroup: group, units: 0 }));

const assertBloodBankNotExists = async (email, licenseNumber) => {
  const existingBloodBank = await bloodBankRepository.findOne({
    $or: [{ email }, { licenseNumber }],
  });

  if (existingBloodBank) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      "Blood bank with this email or license number already exists",
    );
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
    logo,
  } = data;

  const initialInventory = buildInitialInventory();

  const bloodBankData = {
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
      pincode,
    },
    operatingHours: operatingHours || {
      open: "09:00",
      close: "18:00",
      days: [],
    },
    services: services || [],
    contactPerson: {
      name: contactPersonName,
      phone: contactPersonPhone,
      email: contactPersonEmail,
    },
    location: location || undefined,
    logo: logo || "",
    imageUrl: logo || "",
    profileImage: logo || "",
    profileImagePublicId: data.profileImagePublicId || "",
    isActive: false,
    isVerified: false,
    approvalStatus: "pending",
    rejectionReason: "",
  };

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [bloodBank] = await bloodBankRepository.model.create(
      [bloodBankData],
      { session },
    );

    await inventoryRepository.model.create(
      [
        {
          bloodBank: bloodBank._id,
          bloodBankName: bloodBank.name,
          items: initialInventory.map((item) => ({
            ...item,
            lastUpdated: new Date(),
          })),
        },
      ],
      { session },
    );

    await session.commitTransaction();

    return {
      bloodBank: serializers.sanitizeBloodBank(bloodBank),
      requiresApproval: true,
      emailVerified: true,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const buildRegistrationDataFromRequest = async (req) => {
  const body = normalizeRegistrationPayload(req.body || {});

  if (req.file) {
    const uploadResult = await fileUploadService.handleSingleUpload(
      req.file.path,
      "blood-bank/profiles",
    );
    body.logo = uploadResult.url;
    body.profileImagePublicId = uploadResult.publicId;
  }

  validateRegistrationData(body);

  return body;
};

export const initiateBloodBankRegistrationWithOtp = async (req) => {
  const registrationData = await buildRegistrationDataFromRequest(req);
  await assertBloodBankNotExists(
    registrationData.email,
    registrationData.licenseNumber,
  );

  const now = new Date();
  const otp = otpHelpers.generateOtp();
  const otpHash = await otpHelpers.hashOtp(otp);
  const verificationId = crypto.randomBytes(24).toString("hex");
  const otpExpiresAt = new Date(
    now.getTime() + BLOODBANK_OTP_EXPIRY_MINUTES * 60 * 1000,
  );
  const recordExpiresAt = new Date(
    now.getTime() + BLOODBANK_PENDING_REGISTRATION_TTL_MINUTES * 60 * 1000,
  );

  const existingPending =
    await bloodBankRegistrationOtpRepository.findPendingByEmail(
      registrationData.email,
      {
        select: "+otpHash",
      },
    );

  if (existingPending && existingPending.lastOtpSentAt) {
    const remainingSeconds = Math.ceil(
      (existingPending.lastOtpSentAt.getTime() +
        BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS * 1000 -
        Date.now()) /
        1000,
    );
    if (remainingSeconds > 0) {
      const error = new ApiError(
        HTTPS_CODE.TOO_MANY_REQUESTS,
        `Please wait ${remainingSeconds} seconds before requesting another OTP`,
      );
      error.data = buildOtpMeta(existingPending);
      throw error;
    }
  }

  const pendingData = {
    verificationId,
    email: registrationData.email,
    type: "bloodbank",
    otpHash,
    otpExpiresAt,
    status: "pending",
    verifyAttemptsUsed: 0,
    resendCount: 0,
    lastOtpSentAt: now,
    registrationData,
    clientMeta: {
      ip: String(req.ip || ""),
      userAgent: String(req.get("user-agent") || ""),
    },
    expiresAt: recordExpiresAt,
    verifiedAt: null,
  };

  if (existingPending) {
    await bloodBankRegistrationOtpRepository.updateOne(
      { _id: existingPending._id },
      pendingData,
    );
  } else {
    await bloodBankRegistrationOtpRepository.create(pendingData);
  }

  try {
    await emailService.sendBloodBankRegistrationOtpEmail(
      registrationData.email,
      otp,
      {
        expiresInMinutes: BLOODBANK_OTP_EXPIRY_MINUTES,
      },
    );
  } catch (_error) {
    await bloodBankRegistrationOtpRepository.deleteOne({ verificationId });
    throw new ApiError(
      HTTPS_CODE.INTERNAL_SERVER_ERROR,
      "Unable to send OTP email. Please try again later.",
    );
  }

  const record = await bloodBankRegistrationOtpRepository.findByVerificationId(
    verificationId,
    {
      lean: true,
    },
  );
  return {
    ...buildOtpMeta(record),
    nextStep: "verify_otp",
  };
};

export const verifyBloodBankRegistrationOtp = async (verificationId, otp) => {
  if (!verificationId || !otp) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "verificationId and otp are required");
  }

  const now = new Date();
  const pendingRegistration =
    await bloodBankRegistrationOtpRepository.findByVerificationId(
      verificationId,
      {
        select: "+otpHash",
        lean: false,
      },
    );

  if (!pendingRegistration) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Invalid or expired verification session");
  }

  if (pendingRegistration.status === "locked") {
    const error = new ApiError(
      HTTPS_CODE.TOO_MANY_REQUESTS,
      "Maximum OTP attempts reached. Please restart registration.",
    );
    error.data = buildOtpMeta(pendingRegistration);
    throw error;
  }

  if (
    pendingRegistration.status !== "pending" ||
    pendingRegistration.expiresAt <= now ||
    pendingRegistration.otpExpiresAt <= now
  ) {
    pendingRegistration.status = "expired";
    await pendingRegistration.save();
    const error = new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      "OTP is invalid or expired. Please restart registration.",
    );
    error.data = buildOtpMeta(pendingRegistration);
    throw error;
  }

  if (
    pendingRegistration.verifyAttemptsUsed >= BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS
  ) {
    pendingRegistration.status = "locked";
    await pendingRegistration.save();
    const error = new ApiError(
      HTTPS_CODE.TOO_MANY_REQUESTS,
      "Maximum OTP attempts reached. Please restart registration.",
    );
    error.data = buildOtpMeta(pendingRegistration);
    throw error;
  }

  const isOtpValid = await otpHelpers.verifyOtp(
    String(otp).trim(),
    pendingRegistration.otpHash,
  );
  if (!isOtpValid) {
    pendingRegistration.verifyAttemptsUsed += 1;
    if (
      pendingRegistration.verifyAttemptsUsed >=
      BLOODBANK_OTP_MAX_VERIFY_ATTEMPTS
    ) {
      pendingRegistration.status = "locked";
    }
    await pendingRegistration.save();

    const meta = buildOtpMeta(pendingRegistration);
    const error = new ApiError(
      pendingRegistration.status === "locked" ? HTTPS_CODE.TOO_MANY_REQUESTS : HTTPS_CODE.BAD_REQUEST,
      pendingRegistration.status === "locked"
        ? "Maximum OTP attempts reached. Please restart registration."
        : `Invalid OTP. ${meta.attemptsRemaining} attempts remaining.`,
    );
    error.data = meta;
    throw error;
  }

  const registrationData = normalizeRegistrationPayload(
    pendingRegistration.registrationData || {},
  );

  await assertBloodBankNotExists(
    registrationData.email,
    registrationData.licenseNumber,
  );

  const result = await createBloodBankAndInventory({
    ...registrationData,
    password: registrationData.password,
  });

  await bloodBankRegistrationOtpRepository.deleteOne({
    _id: pendingRegistration._id,
  });

  // NEW: Notify Admin about new Blood Bank registration
  const { notifyAdmins } = await import("./notificationService.js");
  notifyAdmins({
    title: "New Blood Bank Registered",
    message: `${registrationData.name} has registered and is awaiting approval.`,
    type: "system",
    actionUrl: `/admin/blood-banks`,
  }).catch((err) => console.error("Admin notification failed:", err));

  return {
    ...result,
    nextStep: "await_admin_approval",
  };
};

export const resendBloodBankRegistrationOtp = async (verificationId) => {
  if (!verificationId) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "verificationId is required");
  }

  const now = new Date();
  const pendingRegistration =
    await bloodBankRegistrationOtpRepository.findByVerificationId(
      verificationId,
      {
        select: "+otpHash",
        lean: false,
      },
    );

  if (!pendingRegistration || pendingRegistration.expiresAt <= now) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Invalid or expired verification session");
  }

  if (pendingRegistration.resendCount >= BLOODBANK_OTP_MAX_RESEND_ATTEMPTS) {
    pendingRegistration.status = "locked";
    await pendingRegistration.save();
    const error = new ApiError(
      HTTPS_CODE.TOO_MANY_REQUESTS,
      "Maximum OTP resend attempts reached. Please restart registration.",
    );
    error.data = buildOtpMeta(pendingRegistration);
    throw error;
  }

  const remainingSeconds = Math.ceil(
    (pendingRegistration.lastOtpSentAt.getTime() +
      BLOODBANK_OTP_RESEND_COOLDOWN_SECONDS * 1000 -
      Date.now()) /
      1000,
  );
  if (remainingSeconds > 0) {
    const error = new ApiError(
      HTTPS_CODE.TOO_MANY_REQUESTS,
      `Please wait ${remainingSeconds} seconds before resending OTP`,
    );
    error.data = buildOtpMeta(pendingRegistration);
    throw error;
  }

  const otp = otpHelpers.generateOtp();
  pendingRegistration.otpHash = await otpHelpers.hashOtp(otp);
  pendingRegistration.otpExpiresAt = new Date(
    Date.now() + BLOODBANK_OTP_EXPIRY_MINUTES * 60 * 1000,
  );
  pendingRegistration.resendCount += 1;
  pendingRegistration.lastOtpSentAt = new Date();

  await pendingRegistration.save();

  try {
    await emailService.sendBloodBankRegistrationOtpEmail(
      pendingRegistration.email,
      otp,
      {
        expiresInMinutes: BLOODBANK_OTP_EXPIRY_MINUTES,
      },
    );
  } catch (_error) {
    throw new ApiError(
      HTTPS_CODE.INTERNAL_SERVER_ERROR,
      "Unable to send OTP email. Please try again later.",
    );
  }

  return {
    ...buildOtpMeta(pendingRegistration),
    nextStep: "verify_otp",
  };
};

export const loginBloodBankWithSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginBloodBank(email, password);
  const { csrfToken, accessTokenExpiresAt } = await createBloodBankSession(
    req,
    res,
    result.bloodBank,
  );
  return { bloodBank: result.bloodBank, csrfToken, accessTokenExpiresAt };
};

export const refreshBloodBankSession = async (req, res) => {
  const { principal, csrfToken, accessTokenExpiresAt } =
    await sessionService.refreshPrincipalSession({
      req,
      res,
      role: "bloodbank",
      getPrincipal: (decoded) =>
        bloodBankRepository.findById(decoded.bloodBankId, {
          select: "_id email +tokenVersion",
        }),
      buildClaims: (bloodBank, sessionId, version) =>
        buildBloodBankClaims({
          ...bloodBank,
          sessionId,
          tokenVersion: version,
        }),
      onBreach: (bloodBankId) =>
        incrementBloodBankTokenVersion(bloodBankId, "security_breach_detected"),
    });

  const bloodBank = serializers.sanitizeBloodBank(principal);
  return { bloodBank, csrfToken, accessTokenExpiresAt };
};

export const logoutBloodBankSession = async (req, res) => {
  try {
    if (!enforceCsrfForRole(req, "bloodbank")) {
      console.warn(
        "[AUTH] CSRF validation failed during bloodbank logout attempt",
      );
    }

    const refreshToken = authCookies.getRefreshTokenFromRequest(
      req,
      "bloodbank",
    );
    if (refreshToken) {
      try {
        const decoded = authCookies.verifyRefreshToken(
          "bloodbank",
          refreshToken,
        );
        if (decoded?.sid) {
          await sessionService.revokeAuthSession({
            role: "bloodbank",
            sessionId: decoded.sid,
            reason: "logout",
          });
        }
      } catch (_error) {
        // Ignore revocation errors
      }
    }
  } finally {
    authCookies.clearAuthCookies(res, "bloodbank");
  }

  return { success: true };
};

// Login blood bank
export const loginBloodBank = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Email and password are required");
  }

  // Find blood bank (include lockout fields alongside password)
  const bloodBank = await bloodBankRepository.findOne(
    { email },
    {
      select: "+password +loginAttempts +lockUntil +tokenVersion",
      lean: false,
    },
  );
  if (!bloodBank) {
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Invalid credentials");
  }

  if (bloodBank.approvalStatus === "pending") {
    throw new ApiError(
      HTTPS_CODE.FORBIDDEN,
      "Your registration request is still pending admin approval. Please wait for the approval email before logging in.",
    );
  }

  if (bloodBank.approvalStatus === "rejected") {
    const rejectionReason = bloodBank.rejectionReason
      ? ` Reason: ${bloodBank.rejectionReason}`
      : "";
    throw new ApiError(
      HTTPS_CODE.FORBIDDEN,
      `Your registration request was rejected by the admin.${rejectionReason}`,
    );
  }

  if (!bloodBank.isActive || !bloodBank.isVerified) {
    throw new ApiError(
      HTTPS_CODE.FORBIDDEN,
      "Your blood bank account is not active. Please contact the admin.",
    );
  }

  // Check if account is temporarily locked
  if (bloodBank.lockUntil && bloodBank.lockUntil > Date.now()) {
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Invalid credentials");
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
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Invalid credentials");
  }

  // Successful login – clear lockout state
  if (bloodBank.loginAttempts || bloodBank.lockUntil) {
    bloodBank.loginAttempts = 0;
    bloodBank.lockUntil = undefined;
    await bloodBank.save();
  }

  return {
    bloodBank: serializers.sanitizeBloodBank(bloodBank),
  };
};
// Get all public blood banks or nearby ones
export const getAllBloodBanks = async (query) => {
  const { latitude, longitude, maxDistance, bloodGroup, search, excludeId } =
    query;
  const { page, limit, skip } = pagination.getPaginationParams({ query });

  const cacheParams = {
    latitude: latitude || null,
    longitude: longitude || null,
    maxDistance: maxDistance || null,
    bloodGroup: bloodGroup || null,
    search: search || null,
    excludeId: excludeId || null,
    page,
    limit,
  };
  const cacheKey = JSON.stringify(cacheParams);

  const cached = await getCachedPublicBanks(cacheKey);
  if (cached) {
    return cached;
  }

  // Use the optimized aggregation pipeline
  const { data: rawBanks, total: rawTotal } =
    await bloodBankRepository.findApprovedBanksWithInventory({
      page,
      limit,
      skip,
      bloodGroup,
      latitude,
      longitude,
      maxDistance,
      search,
      excludeId,
    });

  const resolveLightweightLogo = (bank) => {
    const imageCandidate =
      typeof bank.imageUrl === "string" ? bank.imageUrl.trim() : "";
    if (imageCandidate && !imageCandidate.startsWith("data:")) {
      return imageCandidate;
    }

    const logoCandidate = typeof bank.logo === "string" ? bank.logo.trim() : "";
    if (!logoCandidate || logoCandidate.startsWith("data:")) {
      return "";
    }

    return logoCandidate;
  };

  const processedBanks = rawBanks.map((bank) => ({
    ...serializers.sanitizeBloodBankSummary(bank),
    logo: resolveLightweightLogo(bank),
    inventory: bank.inventory || [],
    distance: bank.distance,
  }));

  const response = pagination.buildPaginatedResponse(
    processedBanks,
    rawTotal,
    page,
    limit,
  );

  // Store in cache
  await setCachedPublicBanks(cacheKey, response);

  return response;
};

// Get blood bank by ID
export const getBloodBankById = async (bloodBankId) => {
  ensureValidObjectId(bloodBankId, "blood bank id");

  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(bloodBankId) } },
    {
      $lookup: {
        from: "inventories",
        localField: "_id",
        foreignField: "bloodBank",
        as: "inventoryData",
      },
    },
    {
      $project: {
        ...serializers.BLOOD_BANK_SAFE_FIELDS.split(" ").reduce(
          (acc, field) => {
            acc[field] = 1;
            return acc;
          },
          {},
        ),
        inventory: { $arrayElemAt: ["$inventoryData.items", 0] },
      },
    },
  ];

  const [bloodBank] = await bloodBankRepository.aggregate(pipeline);

  if (
    !bloodBank ||
    bloodBank.approvalStatus !== "approved" ||
    !bloodBank.isActive
  ) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood bank not found");
  }

  return serializers.sanitizeBloodBank({
    ...bloodBank,
    inventory: bloodBank.inventory || [],
  });
};

export const getBloodBankProfile = (bloodBankId) =>
  bloodBankManager.getProfile(bloodBankId);

export const getSessionBloodBank = async (bloodBankId) => {
  ensureValidObjectId(bloodBankId, "blood bank id");
  const bloodBank = await bloodBankRepository.findById(bloodBankId, {
    select: serializers.BLOOD_BANK_SAFE_FIELDS,
    lean: true,
  });
  if (!bloodBank) {
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Blood bank session is invalid");
  }

  return {
    bloodBank: serializers.sanitizeBloodBank(bloodBank),
  };
};

export const getSessionBloodBankWithExpiry = async (req, bloodBankId) => {
  const result = await getSessionBloodBank(bloodBankId);
  return {
    ...result,
    accessTokenExpiresAt: authCookies.getAccessTokenExpiryFromRequest(
      req,
      "bloodbank",
    ),
  };
};

export const updateBloodBankProfile = async (bloodBankId, payload) => {
  const result = await bloodBankManager.updateProfile(bloodBankId, payload);
  invalidatePublicBloodBanksCache(bloodBankId);
  return result;
};

export const changePassword = (bloodBankId, currentPassword, newPassword) =>
  bloodBankManager.changePassword(bloodBankId, currentPassword, newPassword);

// Update blood bank inventory by blood group
export const updateBloodBankInventory = async (
  bloodBankId,
  bloodGroup,
  units,
) => {
  ensureValidObjectId(bloodBankId, "blood bank id");
  validationService.validateBloodGroup(bloodGroup);
  validationService.validateUnits(units);

  const inventory = await inventoryRepository.updateOne(
    { bloodBank: bloodBankId, "items.bloodGroup": bloodGroup },
    {
      $set: {
        "items.$.units": units,
        "items.$.lastUpdated": new Date(),
      },
    },
    { new: true, lean: true },
  );

  if (!inventory) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "Blood bank inventory not found");
  }

  await bloodBankRepository.updateOne(
    { _id: bloodBankId, "inventory.bloodGroup": bloodGroup },
    {
      $set: {
        "inventory.$.units": units,
        "inventory.$.lastUpdated": new Date(),
      },
    },
  );

  invalidatePublicBloodBanksCache(bloodBankId);
  return inventory.items;
};

// Request password reset
export const requestPasswordReset = async (email) => {
  const bloodBank = await bloodBankRepository.findOne(
    { email },
    { lean: false },
  );
  if (!bloodBank) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "No blood bank found with this email address");
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set token and expiration (1 hour)
  bloodBank.passwordReset = {
    token: resetTokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };

  await bloodBank.save();

  // Send email with reset token
  try {
    await emailService.sendPasswordResetEmail(email, resetToken, "bloodbank");
  } catch (emailError) {
    console.error("Email sending failed:", emailError);
    throw new ApiError(
      HTTPS_CODE.INTERNAL_SERVER_ERROR,
      "Failed to send reset email. Please try again later.",
    );
  }

  return { success: true };
};

// Reset password with token
export const resetPassword = async (token, password) => {
  if (!token || !password) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Token and password are required");
  }

  validationService.validatePassword(password);

  // Hash the provided token
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Find blood bank with valid reset token
  const bloodBank = await bloodBankRepository.findOne(
    {
      "passwordReset.token": resetTokenHash,
      "passwordReset.expiresAt": { $gt: new Date() },
    },
    { lean: false },
  );

  if (!bloodBank) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Invalid or expired reset token");
  }

  // Update password and clear reset token
  bloodBank.password = password;
  bloodBank.passwordReset = undefined;
  bloodBank.tokenVersion = Number(bloodBank.tokenVersion || 0) + 1;
  bloodBank.passwordChangedAt = new Date();

  await bloodBank.save();
  await sessionService.revokeAllPrincipalSessions({
    role: "bloodbank",
    bloodBankId: bloodBank._id,
    reason: "password_reset",
  });

  return { success: true };
};

// Verify reset token
export const verifyResetToken = async (token) => {
  if (!token) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Reset token is required");
  }

  // Hash the provided token
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Check if token exists and is not expired
  const bloodBank = await bloodBankRepository.findOne(
    {
      "passwordReset.token": resetTokenHash,
      "passwordReset.expiresAt": { $gt: new Date() },
    },
    { lean: true },
  );

  if (!bloodBank) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Invalid or expired reset token");
  }

  return { valid: true };
};

export const sendBloodBankRegistrationApprovedEmail = async (bloodBank) => {
  await emailService.sendBloodBankApprovalEmail(
    bloodBank.email,
    bloodBank.name,
  );
};

export const sendBloodBankRegistrationRejectedEmail = async (
  bloodBank,
  rejectionReason,
) => {
  await emailService.sendBloodBankRejectionEmail(
    bloodBank.email,
    bloodBank.name,
    rejectionReason,
  );
};
