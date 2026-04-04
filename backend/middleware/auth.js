import { asyncHandler } from "../utils/asynchandler.js";
import BloodBank from "../models/BloodBank.model.js";
import { verifyAccessToken, getAccessTokenFromRequest, isStateChangingMethod } from "../utils/authCookies.js";
import { enforceCsrfForRole } from "./csrf.js";
import { BLOOD_BANK_SAFE_FIELDS, sanitizeBloodBank } from "../utils/serializers.js";

const BLOOD_BANK_AUTH_CACHE_TTL_MS = 30 * 1000;
const bloodBankAuthCache = new Map();

const unauthorized = (res, message = "No authentication token, access denied") =>
  res.status(401).json({ success: false, message });

const forbidden = (res, message = "Not authorized") =>
  res.status(403).json({ success: false, message });

const getCachedBloodBankAuth = (cacheKey) => {
  const cached = bloodBankAuthCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    bloodBankAuthCache.delete(cacheKey);
    return null;
  }
  return cached.payload;
};

const setCachedBloodBankAuth = (cacheKey, payload) => {
  bloodBankAuthCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + BLOOD_BANK_AUTH_CACHE_TTL_MS,
  });
};

const applyCsrfGuard = (req, res, role) => {
  if (!isStateChangingMethod(req.method)) return true;
  if (enforceCsrfForRole(req, role)) return true;
  forbidden(res, "Invalid or missing CSRF token");
  return false;
};

// General user authentication middleware
const auth = asyncHandler((req, res, next) => {
  const token = getAccessTokenFromRequest(req, "user");

  if (!token) {
    return unauthorized(res);
  }

  try {
    const decoded = verifyAccessToken("user", token);

    if (decoded.tokenType !== "access") {
      return unauthorized(res, "Token is not valid");
    }

    if (!applyCsrfGuard(req, res, "user")) {
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    return unauthorized(res, "Token is not valid");
  }
});

// Super-admin authentication middleware
const adminAuth = asyncHandler((req, res, next) => {
  const token = getAccessTokenFromRequest(req, "admin");

  if (!token) {
    return unauthorized(res);
  }

  try {
    const decoded = verifyAccessToken("admin", token);

    if (decoded.tokenType !== "access" || decoded.type !== "admin" || decoded.role !== "admin") {
      return forbidden(res, "Not authorized as admin");
    }

    if (!applyCsrfGuard(req, res, "admin")) {
      return;
    }

    req.admin = decoded;
    next();
  } catch (error) {
    return unauthorized(res, "Token is not valid");
  }
});

const loadApprovedBloodBank = async (bloodBankId, requestingUserId = null) => {
  if (!bloodBankId) {
    return { error: { status: 400, message: "Invalid request parameters" } };
  }

  const cacheKey = requestingUserId ? `${bloodBankId}:${requestingUserId}` : `${bloodBankId}:self`;
  const cached = getCachedBloodBankAuth(cacheKey);
  if (cached) {
    return cached;
  }

  const bloodBank = await BloodBank.findById(bloodBankId).select(BLOOD_BANK_SAFE_FIELDS).lean();

  if (!bloodBank) {
    return { error: { status: 404, message: "Blood bank not found" } };
  }

  // Verify the requesting user is the owner of this blood bank
  // This prevents IDOR attacks where users access other blood banks
  if (requestingUserId && bloodBank.ownerId && String(bloodBank.ownerId) !== String(requestingUserId)) {
    return { error: { status: 403, message: "You do not have permission to access this blood bank" } };
  }

  // Verify blood bank approval status
  if (bloodBank.approvalStatus !== "approved" || !bloodBank.isActive || !bloodBank.isVerified) {
    return { error: { status: 403, message: "Your blood bank account is not approved for access" } };
  }

  const payload = {
    bloodBank: {
      ...sanitizeBloodBank(bloodBank),
      bloodBankId: String(bloodBank._id),
    },
  };

  setCachedBloodBankAuth(cacheKey, payload);
  return payload;
};

// Middleware for blood bank authentication
const bloodBankAuth = asyncHandler(async (req, res, next) => {
  const token = getAccessTokenFromRequest(req, "bloodbank");

  if (!token) {
    return unauthorized(res);
  }

  try {
    const decoded = verifyAccessToken("bloodbank", token);

    if (decoded.tokenType !== "access" || decoded.type !== "bloodbank") {
      return forbidden(res, "Not authorized as blood bank");
    }

    // Blood-bank tokens are scoped to a single blood bank ID.
    const result = await loadApprovedBloodBank(decoded.bloodBankId);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    if (!applyCsrfGuard(req, res, "bloodbank")) {
      return;
    }

    req.bloodBank = {
      ...result.bloodBank,
      type: decoded.type,
    };

    next();
  } catch (error) {
    return unauthorized(res, "Token is not valid");
  }
});

// Middleware to protect blood bank routes (with DB lookup for full bank data)
const protectBloodBank = bloodBankAuth;

const authOrBloodBank = asyncHandler(async (req, res, next) => {
  const userToken = getAccessTokenFromRequest(req, "user");
  if (userToken) {
    try {
      const decoded = verifyAccessToken("user", userToken);
      if (decoded.tokenType === "access") {
        if (!applyCsrfGuard(req, res, "user")) {
          return;
        }

        req.user = decoded;
        return next();
      }
    } catch (_error) {
      req.user = undefined;
    }
  }

  const bloodBankToken = getAccessTokenFromRequest(req, "bloodbank");
  if (!bloodBankToken) {
    return unauthorized(res);
  }

  try {
    const decoded = verifyAccessToken("bloodbank", bloodBankToken);

    if (decoded.tokenType !== "access" || decoded.type !== "bloodbank") {
      return forbidden(res, "Not authorized as blood bank");
    }

    const result = await loadApprovedBloodBank(decoded.bloodBankId);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    if (!applyCsrfGuard(req, res, "bloodbank")) {
      return;
    }

    req.bloodBank = {
      ...result.bloodBank,
      type: decoded.type,
    };

    return next();
  } catch (_error) {
    return unauthorized(res, "Token is not valid");
  }
});

export { auth, adminAuth, bloodBankAuth, protectBloodBank, authOrBloodBank };
