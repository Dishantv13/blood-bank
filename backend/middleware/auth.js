import { asyncHandler } from "../utils/asynchandler.js";
import BloodBank from "../models/BloodBank.model.js";
import { verifyAccessToken, getAccessTokenFromRequest, isStateChangingMethod } from "../utils/authCookies.js";
import { enforceCsrfForRole } from "./csrf.js";

const unauthorized = (res, message = "No authentication token, access denied") =>
  res.status(401).json({ success: false, message });

const forbidden = (res, message = "Not authorized") =>
  res.status(403).json({ success: false, message });

const applyCsrfGuard = (req, res, role) => {
  if (!isStateChangingMethod(req.method)) return true;
  if (enforceCsrfForRole(req, role, { allowTrustedOriginFallback: true })) return true;
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

const loadApprovedBloodBank = async (bloodBankId) => {
  const bloodBank = await BloodBank.findById(bloodBankId).select("-password").lean();

  if (!bloodBank) {
    return { error: { status: 404, message: "Blood bank not found" } };
  }

  if (bloodBank.approvalStatus !== "approved" || !bloodBank.isActive || !bloodBank.isVerified) {
    return { error: { status: 403, message: "Your blood bank account is not approved for access" } };
  }

  return {
    bloodBank: {
      ...bloodBank,
      bloodBankId: String(bloodBank._id),
    },
  };
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

export { auth, adminAuth, bloodBankAuth, protectBloodBank };
