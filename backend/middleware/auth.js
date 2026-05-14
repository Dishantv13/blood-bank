import { asyncHandler } from "../utils/asynchandler.js";
import User from "../models/User.model.js";
import BloodBank from "../models/BloodBank.model.js";
import AdminAuthState from "../models/AdminAuthState.model.js";
import {
  verifyAccessToken,
  getAccessTokenFromRequest,
  isStateChangingMethod,
  getCsrfTokenFromRequest,
} from "../utils/authCookies.js";
import {
  BLOOD_BANK_SAFE_FIELDS,
  sanitizeBloodBank,
  USER_SAFE_FIELDS,
  sanitizeUser,
} from "../utils/serializers.js";
import {
  isSessionValid,
  validateSessionCsrf,
} from "../services/sessionService.js";
import cacheManager from "../utils/cacheManager.js";

const unauthorized = (
  res,
  message = "No authentication token, access denied",
) => res.status(401).json({ success: false, message });

const forbidden = (res, message = "Not authorized") =>
  res.status(403).json({ success: false, message });

const applyCsrfGuard = async (req, res, role, sessionId) => {
  if (process.env.NODE_ENV === "test") return true;
  if (!isStateChangingMethod(req.method)) return true;

  const { headerToken } = getCsrfTokenFromRequest(req, role);

  if (await validateSessionCsrf({ role, sessionId, csrfToken: headerToken })) {
    return true;
  }

  forbidden(res, "Invalid or missing CSRF token");
  return false;
};

const matchesTokenVersion = (decoded, currentTokenVersion) =>
  Number(decoded?.tokenVersion) === Number(currentTokenVersion || 0);

const loadAuthenticatedUser = async (userId, bypassCache = false) => {
  if (!userId || userId === "undefined") return null;

  const cacheKey = `auth:user:state:${userId}`;
  if (!bypassCache) {
    const cached = await cacheManager.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const user = await User.findById(userId)
      .select(`${USER_SAFE_FIELDS} +tokenVersion`)
      .lean();

    if (!user) return null;

    const result = {
      ...sanitizeUser(user),
      userId: String(user._id),
      tokenVersion: Number(user.tokenVersion || 0),
    };

    await cacheManager.set(cacheKey, result, 300); // 5 minutes cache for better security
    return result;
  } catch (err) {
    return null;
  }
};

const loadAdminState = async (adminEmail) => {
  if (!adminEmail) return null;
  const cacheKey = `auth:admin:state:${String(adminEmail).toLowerCase()}`;
  const cached = await cacheManager.get(cacheKey);
  if (cached) return cached;

  const state = await AdminAuthState.findOne({
    email: String(adminEmail).toLowerCase(),
  }).lean();
  if (!state) return null;

  const result = {
    ...state,
    tokenVersion: Number(state.tokenVersion || 0),
  };

  await cacheManager.set(cacheKey, result, 3600);
  return result;
};

// General user authentication middleware
const auth = asyncHandler(async (req, res, next) => {
  const token = getAccessTokenFromRequest(req, "user");

  if (!token) {
    console.warn("[AUTH] Rejected: No token provided");
    return unauthorized(res);
  }

  try {
    const decoded = verifyAccessToken("user", token);

    if (decoded.tokenType !== "access") {
      return unauthorized(res, "Token is not a valid access token");
    }

    let user = await loadAuthenticatedUser(decoded.userId || decoded.id);
    if (!user) {
      console.warn("[AUTH] Rejected: User not found", { userId: decoded.userId });
      return unauthorized(res, "Authenticated user not found in database");
    }

    // SELF-HEALING: If cache is stale, try one fresh DB lookup before rejecting
    if (!matchesTokenVersion(decoded, user.tokenVersion)) {
      console.log("[AUTH] Potential stale cache detected, retrying with fresh DB lookup...");
      user = await loadAuthenticatedUser(decoded.userId || decoded.id, true); // true = bypass cache
      
      if (!user || !matchesTokenVersion(decoded, user.tokenVersion)) {
        console.warn("[AUTH] Rejected: tokenVersion mismatch (Confirmed against DB)", {
          userId: user?.id,
          decodedVersion: decoded.tokenVersion,
          currentVersion: user?.tokenVersion,
        });
        return unauthorized(res, "Session has been revoked due to security event");
      }
    }

    // SESSION ENFORCEMENT: Check if this specific session ID is still valid/active
    if (!(await isSessionValid("user", decoded.sid))) {
      console.warn("[AUTH] Rejected: Session revoked or inactive", { sid: decoded.sid });
      return unauthorized(
        res,
        "Session has been revoked or is no longer active",
      );
    }

    if (!(await applyCsrfGuard(req, res, "user", decoded.sid))) {
      return;
    }

    req.user = {
      ...decoded,
      id: user.userId,
      userId: user.userId,
    };
    next();
  } catch (error) {
    console.error("[AUTH ERROR] User authentication failed:", error.message);
    return unauthorized(res, `Token is not valid: ${error.message}`);
  }
});

// Super-admin authentication middleware
const adminAuth = asyncHandler(async (req, res, next) => {
  const token = getAccessTokenFromRequest(req, "admin");

  if (!token) {
    if (
      getAccessTokenFromRequest(req, "user") ||
      getAccessTokenFromRequest(req, "bloodbank")
    ) {
      return forbidden(res, "Administrative access required");
    }
    return unauthorized(res);
  }

  try {
    const decoded = verifyAccessToken("admin", token);

    if (
      decoded.tokenType !== "access" ||
      decoded.type !== "admin" ||
      decoded.role !== "admin"
    ) {
      return forbidden(res, "Not authorized as admin");
    }

    const adminState = await loadAdminState(decoded.adminEmail);
    if (!adminState || !matchesTokenVersion(decoded, adminState.tokenVersion)) {
      return unauthorized(res, "Session has been revoked");
    }

    // SESSION ENFORCEMENT: Check if this specific session ID is still valid/active
    if (!(await isSessionValid("admin", decoded.sid))) {
      return unauthorized(
        res,
        "Session has been revoked or is no longer active",
      );
    }

    if (!(await applyCsrfGuard(req, res, "admin", decoded.sid))) {
      return;
    }

    req.admin = {
      ...decoded,
      id: "super-admin",
    };
    next();
  } catch (error) {
    console.error("[AUTH ERROR] Admin authentication failed:", error.message);
    return unauthorized(res, `Admin token is not valid: ${error.message}`);
  }
});

const loadApprovedBloodBank = async (bloodBankId, requestingUserId = null) => {
  if (!bloodBankId || bloodBankId === "undefined") {
    return { error: { status: 400, message: "Invalid request parameters" } };
  }

  try {
    const bloodBank = await BloodBank.findById(bloodBankId)
      .select(`${BLOOD_BANK_SAFE_FIELDS} +tokenVersion`)
      .lean();

    if (!bloodBank) {
      return { error: { status: 404, message: "Blood bank not found" } };
    }

    if (
      requestingUserId &&
      bloodBank.ownerId &&
      String(bloodBank.ownerId) !== String(requestingUserId)
    ) {
      return {
        error: {
          status: 403,
          message: "You do not have permission to access this blood bank",
        },
      };
    }

    // Verify blood bank approval status
    if (
      bloodBank.approvalStatus !== "approved" ||
      !bloodBank.isActive ||
      !bloodBank.isVerified
    ) {
      return {
        error: {
          status: 403,
          message: "Your blood bank account is not approved for access",
        },
      };
    }

    const payload = {
      bloodBank: {
        ...sanitizeBloodBank(bloodBank),
        bloodBankId: String(bloodBank._id),
        tokenVersion: Number(bloodBank.tokenVersion || 0),
      },
    };
    return payload;
  } catch (err) {
    return { error: { status: 400, message: "Invalid blood bank ID format" } };
  }
};

// Middleware for blood bank authentication
const bloodBankAuth = asyncHandler(async (req, res, next) => {
  const token = getAccessTokenFromRequest(req, "bloodbank");

  if (!token) {
    if (
      getAccessTokenFromRequest(req, "user") ||
      getAccessTokenFromRequest(req, "admin")
    ) {
      return unauthorized(res, "Blood bank portal access required");
    }
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
      return res
        .status(result.error.status)
        .json({ success: false, message: result.error.message });
    }

    if (!matchesTokenVersion(decoded, result.bloodBank.tokenVersion)) {
      return unauthorized(res, "Session has been revoked");
    }

    // SESSION ENFORCEMENT: Check if this specific session ID is still valid/active
    if (!(await isSessionValid("bloodbank", decoded.sid))) {
      return unauthorized(
        res,
        "Session has been revoked or is no longer active",
      );
    }

    if (!(await applyCsrfGuard(req, res, "bloodbank", decoded.sid))) {
      return;
    }

    req.bloodBank = {
      ...result.bloodBank,
      id: result.bloodBank.bloodBankId,
      type: decoded.type,
    };

    next();
  } catch (error) {
    console.error(
      "[AUTH ERROR] Blood bank authentication failed:",
      error.message,
    );
    return unauthorized(res, `Blood bank token is not valid: ${error.message}`);
  }
});

// Middleware to protect blood bank routes (with DB lookup for full bank data)

const authenticateAny = asyncHandler(async (req, res, next) => {
  let authenticated = false;

  // Try User Auth
  const userToken = getAccessTokenFromRequest(req, "user");
  if (userToken) {
    try {
      const decoded = verifyAccessToken("user", userToken);
      if (decoded.tokenType === "access") {
        const user = await loadAuthenticatedUser(decoded.userId || decoded.id);
        if (user && matchesTokenVersion(decoded, user.tokenVersion)) {
          if (await isSessionValid("user", decoded.sid)) {
            let csrfValid = true;
            if (
              isStateChangingMethod(req.method) &&
              process.env.NODE_ENV !== "test"
            ) {
              const { headerToken } = getCsrfTokenFromRequest(req, "user");
              csrfValid = await validateSessionCsrf({
                role: "user",
                sessionId: decoded.sid,
                csrfToken: headerToken,
              });
            }

            if (csrfValid) {
              req.user = {
                ...decoded,
                id: user.userId,
                userId: user.userId,
              };
              authenticated = true;
            }
          }
        }
      }
    } catch (_error) {
      req.user = undefined;
    }
  }

  // Try Admin Auth (Super Admin)
  if (!authenticated) {
    const adminToken = getAccessTokenFromRequest(req, "admin");
    if (adminToken) {
      try {
        const decoded = verifyAccessToken("admin", adminToken);
        if (
          decoded.tokenType === "access" &&
          decoded.type === "admin" &&
          decoded.role === "admin"
        ) {
          const adminState = await loadAdminState(decoded.adminEmail);
          if (
            adminState &&
            matchesTokenVersion(decoded, adminState.tokenVersion)
          ) {
            if (await isSessionValid("admin", decoded.sid)) {
              let csrfValid = true;
              if (
                isStateChangingMethod(req.method) &&
                process.env.NODE_ENV !== "test"
              ) {
                const { headerToken } = getCsrfTokenFromRequest(req, "admin");
                csrfValid = await validateSessionCsrf({
                  role: "admin",
                  sessionId: decoded.sid,
                  csrfToken: headerToken,
                });
              }

              if (csrfValid) {
                req.admin = {
                  ...decoded,
                  id: "super-admin",
                };
                authenticated = true;
              }
            }
          }
        }
      } catch (_error) {
        req.admin = undefined;
      }
    }
  }

  // Try Blood Bank Auth
  if (!authenticated) {
    const bloodBankToken = getAccessTokenFromRequest(req, "bloodbank");
    if (bloodBankToken) {
      try {
        const decoded = verifyAccessToken("bloodbank", bloodBankToken);
        if (decoded.tokenType === "access" && decoded.type === "bloodbank") {
          const result = await loadApprovedBloodBank(decoded.bloodBankId);
          if (
            !result.error &&
            matchesTokenVersion(decoded, result.bloodBank.tokenVersion)
          ) {
            if (await isSessionValid("bloodbank", decoded.sid)) {
              let csrfValid = true;
              if (
                isStateChangingMethod(req.method) &&
                process.env.NODE_ENV !== "test"
              ) {
                const { headerToken } = getCsrfTokenFromRequest(
                  req,
                  "bloodbank",
                );
                csrfValid = await validateSessionCsrf({
                  role: "bloodbank",
                  sessionId: decoded.sid,
                  csrfToken: headerToken,
                });
              }

              if (csrfValid) {
                req.bloodBank = {
                  ...result.bloodBank,
                  id: result.bloodBank.bloodBankId,
                  type: decoded.type,
                };
                authenticated = true;
              }
            }
          }
        }
      } catch (_error) {
        req.bloodBank = undefined;
      }
    }
  }

  if (authenticated) {
    return next();
  }

  return unauthorized(res, "Authentication required");
});

export {
  auth,
  adminAuth,
  bloodBankAuth as protectBloodBank,
  bloodBankAuth,
  authenticateAny as authOrBloodBank,
  authenticateAny,
};
