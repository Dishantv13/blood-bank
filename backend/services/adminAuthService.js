import bcrypt from "bcryptjs";
import adminAuthStateRepository from "../repositories/AdminAuthStateRepository.js";
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from "../config/authConfig.js";
import { enforceCsrfForRole } from "../middleware/csrf.js";
import { ApiError } from "../utils/apiError.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import * as authCookies from "../utils/authCookies.js";
import * as sessionService from "./sessionService.js";


const getAdminConfig = () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    throw new ApiError(HTTPS_CODE.SERVICE_UNAVAILABLE, "Admin authentication is not configured");
  }

  return {
    adminEmail,
    adminPasswordHash,
  };
};

const getOrCreateAdminAuthState = async () => {
  const { adminEmail } = getAdminConfig();
  let state = await adminAuthStateRepository.findOne({ email: adminEmail });
  if (!state) {
    state = await adminAuthStateRepository.create({ email: adminEmail });
  }
  return state;
};

const incrementAdminLoginAttempts = async (adminEmail) => {
  const attempts = await adminAuthStateRepository.updateOne(
    { email: adminEmail },
    [
      {
        $set: {
          loginAttempts: { $add: ["$loginAttempts", 1] },
          lockUntil: {
            $cond: {
              if: {
                $gte: [{ $add: ["$loginAttempts", 1] }, MAX_LOGIN_ATTEMPTS],
              },
              then: new Date(Date.now() + LOCK_DURATION_MS),
              else: "$lockUntil",
            },
          },
          updatedAt: new Date(),
        },
      },
    ],
    { returnDocument: "after", upsert: true },
  );
  return attempts;
};

const clearAdminLoginAttempts = async (adminEmail) => {
  await adminAuthStateRepository.updateOne(
    { email: adminEmail },
    { $set: { loginAttempts: 0, lockUntil: null, updatedAt: new Date() } },
  );
};

const createAdminSession = async (req, res, admin) => {
  const state = await getOrCreateAdminAuthState();
  const tokenVersion = Number(state.tokenVersion || 0);

  return sessionService.issuePrincipalSession({
    req,
    res,
    role: "admin",
    principalId: admin.email,
    tokenVersion,
    buildClaims: (sessionId, version) => ({
      type: "admin",
      role: "admin",
      adminEmail: admin.email,
      sid: sessionId,
      tokenVersion: version,
    }),
    metadata: { adminEmail: admin.email },
  });
};

const incrementAdminTokenVersion = async (reason = "security_event") => {
  const { adminEmail } = getAdminConfig();
  const state = await adminAuthStateRepository.updateOne(
    { email: adminEmail },
    {
      $inc: { tokenVersion: 1 },
      $set: { passwordChangedAt: new Date(), updatedAt: new Date() },
    },
    { returnDocument: "after", upsert: true },
  );

  await sessionService.revokeAllPrincipalSessions({ role: "admin", adminEmail, reason });
  return state;
};

export const loginAdmin = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Email and password are required");
  }

  const { adminEmail, adminPasswordHash } = getAdminConfig();

  const normalizedEmail = email.trim().toLowerCase();
  const isEmailMatch = normalizedEmail === adminEmail;

  // Always load the auth state so we can check and update lockout fields,
  // regardless of whether the email matches (prevents user enumeration via timing).
  const state = await getOrCreateAdminAuthState();

  // Check lockout before verifying password (prevents timing oracle when locked).
  if (state.lockUntil && new Date(state.lockUntil) > new Date()) {
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Invalid admin credentials");
  }

  const isPasswordMatch = await bcrypt.compare(password, adminPasswordHash);

  if (!isEmailMatch || !isPasswordMatch) {
    // Only track attempts against the real admin email to avoid inflating counters
    // on random enumeration attempts.
    if (isEmailMatch) {
      await incrementAdminLoginAttempts(adminEmail);
    }
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Invalid admin credentials");
  }

  // Successful login – clear lockout state.
  if (state.loginAttempts > 0 || state.lockUntil) {
    await clearAdminLoginAttempts(adminEmail);
  }

  return {
    admin: {
      id: "super-admin",
      name: "Super Admin",
      email: adminEmail,
      role: "admin",
    },
  };
};

export const getSessionAdmin = async () => {
  const { adminEmail } = getAdminConfig();
  return {
    admin: {
      id: "super-admin",
      name: "Super Admin",
      email: adminEmail,
      role: "admin",
    },
  };
};

export const getSessionAdminWithExpiry = async (req) => {
  const session = await getSessionAdmin();
  return {
    ...session,
    accessTokenExpiresAt: authCookies.getAccessTokenExpiryFromRequest(req, "admin"),
  };
};

export const issueAdminCsrfToken = async (req, res) => {
  const { csrfCookie } = authCookies.getCookieNamesForRole("admin");
  const csrfToken = authCookies.generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, authCookies.getPublicCookieOptions());

  // Sync with active session if one exists
  const accessToken = authCookies.getAccessTokenFromRequest(req, "admin");
  if (accessToken) {
    try {
      const decoded = authCookies.verifyAccessToken("admin", accessToken);
      if (decoded.sid) {
        await sessionService.updateCsrfToken({
          role: "admin",
          sessionId: decoded.sid,
          csrfTokenHash: authCookies.hashToken(csrfToken),
        });
      }
    } catch (_e) {}
  }

  return { csrfToken };
};

export const loginAdminWithSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginAdmin(email, password);
  const { csrfToken, accessTokenExpiresAt } = await createAdminSession(
    req,
    res,
    result.admin,
  );
  return { admin: result.admin, csrfToken, accessTokenExpiresAt };
};

export const refreshAdminSession = async (req, res) => {
  await sessionService.refreshPrincipalSession({
    req,
    res,
    role: "admin",
    getPrincipal: async () => getOrCreateAdminAuthState(),
    buildClaims: (state, sessionId, version) => ({
      type: "admin",
      role: "admin",
      adminEmail: state.email,
      sid: sessionId,
      tokenVersion: version,
    }),
    onBreach: () => incrementAdminTokenVersion("security_breach_detected"),
  });

  const session = await getSessionAdmin();
  const csrfToken = req.cookies[authCookies.getCookieNamesForRole("admin").csrfCookie];
  const accessTokenExpiresAt = authCookies.getAccessTokenExpiryFromRequest(req, "admin");
  return { ...session, csrfToken, accessTokenExpiresAt };
};

export const logoutAdminSession = async (req, res) => {
  try {
    if (!enforceCsrfForRole(req, "admin")) {
      console.warn("[AUTH] CSRF validation failed during admin logout attempt");
    }

    const refreshToken = authCookies.getRefreshTokenFromRequest(req, "admin");
    if (refreshToken) {
      try {
        const decoded = authCookies.verifyRefreshToken("admin", refreshToken);
        if (decoded?.sid) {
          await sessionService.revokeAuthSession({
            role: "admin",
            sessionId: decoded.sid,
            reason: "logout",
          });
        }
      } catch (_error) {
        // Ignore revocation errors
      }
    }
  } finally {
    authCookies.clearAuthCookies(res, "admin");
  }

  return { success: true };
};
