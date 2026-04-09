import { asyncHandler } from "../utils/asynchandler.js";
import User from "../models/User.model.js";
import BloodBank from "../models/BloodBank.model.js";
import AdminAuthState from "../models/AdminAuthState.model.js";
import { verifyAccessToken, getAccessTokenFromRequest, isStateChangingMethod } from "../utils/authCookies.js";
import { enforceCsrfForRole } from "./csrf.js";
import { BLOOD_BANK_SAFE_FIELDS, sanitizeBloodBank, USER_SAFE_FIELDS, sanitizeUser } from "../utils/serializers.js";

const unauthorized = (res, message = "No authentication token, access denied") =>
  res.status(401).json({ success: false, message });

const forbidden = (res, message = "Not authorized") =>
  res.status(403).json({ success: false, message });

const applyCsrfGuard = (req, res, role) => {
  if (!isStateChangingMethod(req.method)) return true;
  if (enforceCsrfForRole(req, role)) return true;
  forbidden(res, "Invalid or missing CSRF token");
  return false;
};

const matchesTokenVersion = (decoded, currentTokenVersion) =>
  Number(decoded?.tokenVersion) === Number(currentTokenVersion || 0);

const loadAuthenticatedUser = async (userId) => {
  const user = await User.findById(userId)
    .select(`${USER_SAFE_FIELDS} +tokenVersion`)
    .lean();

  if (!user) {
    return null;
  }

  return {
    ...sanitizeUser(user),
    userId: String(user._id),
    tokenVersion: Number(user.tokenVersion || 0),
  };
};

const loadAdminState = async (adminEmail) => {
  if (!adminEmail) return null;
  const state = await AdminAuthState.findOne({ email: String(adminEmail).toLowerCase() }).lean();
  if (!state) return null;
  return {
    ...state,
    tokenVersion: Number(state.tokenVersion || 0),
  };
};

// General user authentication middleware
const auth = asyncHandler(async (req, res, next) => {
  const token = getAccessTokenFromRequest(req, "user");

  if (!token) {
    return unauthorized(res);
  }

  try {
    const decoded = verifyAccessToken("user", token);

    if (decoded.tokenType !== "access") {
      return unauthorized(res, "Token is not valid");
    }

    const user = await loadAuthenticatedUser(decoded.userId || decoded.id);
    if (!user || !matchesTokenVersion(decoded, user.tokenVersion)) {
      return unauthorized(res, "Session has been revoked");
    }

    if (!applyCsrfGuard(req, res, "user")) {
      return;
    }

    req.user = {
      ...decoded,
      id: user.userId,
      userId: user.userId,
    };
    next();
  } catch (error) {
    return unauthorized(res, "Token is not valid");
  }
});

// Super-admin authentication middleware
const adminAuth = asyncHandler(async (req, res, next) => {
  const token = getAccessTokenFromRequest(req, "admin");

  if (!token) {
    return unauthorized(res);
  }

  try {
    const decoded = verifyAccessToken("admin", token);

    if (decoded.tokenType !== "access" || decoded.type !== "admin" || decoded.role !== "admin") {
      return forbidden(res, "Not authorized as admin");
    }

    const adminState = await loadAdminState(decoded.adminEmail);
    if (!adminState || !matchesTokenVersion(decoded, adminState.tokenVersion)) {
      return unauthorized(res, "Session has been revoked");
    }

    if (!applyCsrfGuard(req, res, "admin")) {
      return;
    }

    req.admin = {
      ...decoded,
      id: 'super-admin',
    };
    next();
  } catch (error) {
    return unauthorized(res, "Token is not valid");
  }
});

const loadApprovedBloodBank = async (bloodBankId, requestingUserId = null) => {
  if (!bloodBankId) {
    return { error: { status: 400, message: "Invalid request parameters" } };
  }

  const bloodBank = await BloodBank.findById(bloodBankId).select(`${BLOOD_BANK_SAFE_FIELDS} +tokenVersion`).lean();

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
      tokenVersion: Number(bloodBank.tokenVersion || 0),
    },
  };
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

    if (!matchesTokenVersion(decoded, result.bloodBank.tokenVersion)) {
      return unauthorized(res, "Session has been revoked");
    }

    if (!applyCsrfGuard(req, res, "bloodbank")) {
      return;
    }

    req.bloodBank = {
      ...result.bloodBank,
      id: result.bloodBank.bloodBankId,
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
        const user = await loadAuthenticatedUser(decoded.userId || decoded.id);
        if (!user || !matchesTokenVersion(decoded, user.tokenVersion)) {
          return unauthorized(res, "Session has been revoked");
        }

        if (!applyCsrfGuard(req, res, "user")) {
          return;
        }

        req.user = {
          ...decoded,
          id: user.userId,
          userId: user.userId,
        };
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

    if (!matchesTokenVersion(decoded, result.bloodBank.tokenVersion)) {
      return unauthorized(res, "Session has been revoked");
    }

    if (!applyCsrfGuard(req, res, "bloodbank")) {
      return;
    }

    req.bloodBank = {
      ...result.bloodBank,
      id: result.bloodBank.bloodBankId,
      type: decoded.type,
    };

    return next();
  } catch (_error) {
    return unauthorized(res, "Token is not valid");
  }
});

export { auth, adminAuth, bloodBankAuth, protectBloodBank, authOrBloodBank };
