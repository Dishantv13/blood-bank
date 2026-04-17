import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ApiError } from '../utils/apiError.js';
import adminAuthStateRepository from '../repositories/AdminAuthStateRepository.js';
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
  getAccessTokenFromRequest,
  verifyAccessToken,
} from '../utils/authCookies.js';
import { enforceCsrfForRole } from '../middleware/csrf.js';
import {
  createAuthSession,
  getAuthSessionForRefresh,
  logRefreshReuseDetected,
  revokeAllPrincipalSessions,
  revokeAuthSession,
  rotateAuthSession,
  updateCsrfToken,
} from './sessionService.js';
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from '../config/authConfig.js';

const getAdminConfig = () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    throw new ApiError(503, 'Admin authentication is not configured');
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
          loginAttempts: { $add: ['$loginAttempts', 1] },
          lockUntil: {
            $cond: {
              if: { $gte: [{ $add: ['$loginAttempts', 1] }, MAX_LOGIN_ATTEMPTS] },
              then: new Date(Date.now() + LOCK_DURATION_MS),
              else: '$lockUntil',
            },
          },
          updatedAt: new Date(),
        },
      },
    ],
    { returnDocument: 'after', upsert: true }
  );
  return attempts;
};

const clearAdminLoginAttempts = async (adminEmail) => {
  await adminAuthStateRepository.updateOne(
    { email: adminEmail },
    { $set: { loginAttempts: 0, lockUntil: null, updatedAt: new Date() } }
  );
};

const createAdminSession = async (req, res, admin) => {
  const state = await getOrCreateAdminAuthState();
  const sessionId = crypto.randomUUID();
  const tokenClaims = {
    type: 'admin',
    role: 'admin',
    adminEmail: admin.email,
    sid: sessionId,
    tokenVersion: Number(state.tokenVersion || 0),
  };
  const { refreshToken, refreshTokenExpiresAt, csrfToken, accessTokenExpiresAt } = setAuthCookies(
    res,
    'admin',
    tokenClaims
  );

  await createAuthSession({
    sessionId,
    role: 'admin',
    adminEmail: admin.email,
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenExpiresAt,
    csrfTokenHash: hashToken(csrfToken),
    tokenVersion: Number(state.tokenVersion || 0),
    req,
  });

  return { csrfToken, accessTokenExpiresAt };
};

const incrementAdminTokenVersion = async (reason = 'security_event') => {
  const { adminEmail } = getAdminConfig();
  const state = await adminAuthStateRepository.updateOne(
    { email: adminEmail },
    {
      $inc: { tokenVersion: 1 },
      $set: { passwordChangedAt: new Date(), updatedAt: new Date() },
    },
    { returnDocument: 'after', upsert: true }
  );

  await revokeAllPrincipalSessions({ role: 'admin', adminEmail, reason });
  return state;
};

export const loginAdmin = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const { adminEmail, adminPasswordHash } = getAdminConfig();

  const normalizedEmail = email.trim().toLowerCase();
  const isEmailMatch = normalizedEmail === adminEmail;

  // Always load the auth state so we can check and update lockout fields,
  // regardless of whether the email matches (prevents user enumeration via timing).
  const state = await getOrCreateAdminAuthState();

  // Check lockout before verifying password (prevents timing oracle when locked).
  if (state.lockUntil && new Date(state.lockUntil) > new Date()) {
    throw new ApiError(401, 'Invalid admin credentials');
  }

  const isPasswordMatch = await bcrypt.compare(password, adminPasswordHash);

  if (!isEmailMatch || !isPasswordMatch) {
    // Only track attempts against the real admin email to avoid inflating counters
    // on random enumeration attempts.
    if (isEmailMatch) {
      await incrementAdminLoginAttempts(adminEmail);
    }
    throw new ApiError(401, 'Invalid admin credentials');
  }

  // Successful login – clear lockout state.
  if (state.loginAttempts > 0 || state.lockUntil) {
    await clearAdminLoginAttempts(adminEmail);
  }

  return {
    admin: {
      id: 'super-admin',
      name: 'Super Admin',
      email: adminEmail,
      role: 'admin',
    },
  };
};

export const getSessionAdmin = async () => {
  const { adminEmail } = getAdminConfig();
  return {
    admin: {
      id: 'super-admin',
      name: 'Super Admin',
      email: adminEmail,
      role: 'admin',
    }
  };
};

export const getSessionAdminWithExpiry = async (req) => {
  const session = await getSessionAdmin();
  return {
    ...session,
    accessTokenExpiresAt: getAccessTokenExpiryFromRequest(req, 'admin'),
  };
};

export const issueAdminCsrfToken = async (req, res) => {
  const { csrfCookie } = getCookieNamesForRole('admin');
  const csrfToken = generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, getPublicCookieOptions());

  // Sync with active session if one exists
  const accessToken = getAccessTokenFromRequest(req, 'admin');
  if (accessToken) {
    try {
      const decoded = verifyAccessToken('admin', accessToken);
      if (decoded.sid) {
        await updateCsrfToken({ 
          role: 'admin', 
          sessionId: decoded.sid, 
          csrfTokenHash: hashToken(csrfToken) 
        });
      }
    } catch (_e) {}
  }

  return { csrfToken };
};

export const loginAdminWithSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginAdmin(email, password);
  const { csrfToken, accessTokenExpiresAt } = await createAdminSession(req, res, result.admin);
  return { admin: result.admin, csrfToken, accessTokenExpiresAt };
};

export const refreshAdminSession = async (req, res) => {
  if (!enforceCsrfForRole(req, 'admin')) {
    throw new ApiError(403, 'Invalid or missing CSRF token');
  }

  const refreshToken = getRefreshTokenFromRequest(req, 'admin');
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token missing');
  }

  const decoded = verifyRefreshToken('admin', refreshToken);
  const [sessionRecord, state] = await Promise.all([
    getAuthSessionForRefresh({ role: 'admin', sessionId: decoded.sid }),
    getOrCreateAdminAuthState(),
  ]);

  const incomingRefreshHash = hashToken(refreshToken);
  const isCurrentMatch = sessionRecord?.refreshTokenHash === incomingRefreshHash;
  const isGraceMatch = sessionRecord?.rotatedAt && 
                       (Date.now() - new Date(sessionRecord.rotatedAt).getTime() < 10000) &&
                       sessionRecord?.previousRefreshTokenHash === incomingRefreshHash;

  const isTokenValid = isCurrentMatch || isGraceMatch;

  const requiresSessionRevoke =
    !sessionRecord ||
    sessionRecord.revokedAt ||
    new Date(sessionRecord.expiresAt).getTime() <= Date.now() ||
    String(decoded.adminEmail || '').toLowerCase() !== String(state.email || '').toLowerCase() ||
    Number(decoded.tokenVersion) !== Number(state.tokenVersion || 0) ||
    Number(sessionRecord.tokenVersion) !== Number(state.tokenVersion || 0) ||
    !isTokenValid;

  if (requiresSessionRevoke) {
    if (sessionRecord?.sessionId) {
      await revokeAuthSession({ 
        role: 'admin', 
        sessionId: sessionRecord.sessionId, 
        reason: 'refresh_token_mismatch' 
      });
    }

    const suspectSeriousBreach = state && (
      Number(decoded.tokenVersion) !== Number(state.tokenVersion || 0) ||
      Number(sessionRecord?.tokenVersion) !== Number(state.tokenVersion || 0)
    );

    if (suspectSeriousBreach) {
      await incrementAdminTokenVersion('security_breach_detected');
    }

    logRefreshReuseDetected({
      role: 'admin',
      sessionId: decoded.sid,
      principal: decoded.adminEmail,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    clearAuthCookies(res, 'admin');
    throw new ApiError(401, 'Refresh token is invalid or has been reused');
  }

  const sessionId = decoded.sid || crypto.randomUUID();
  const isTransitioningFromLegacy = !decoded.sid || !sessionRecord;

  const { refreshToken: nextRefreshToken, refreshTokenExpiresAt, csrfToken, accessTokenExpiresAt } = setAuthCookies(res, 'admin', {
    type: 'admin',
    role: 'admin',
    adminEmail: decoded.adminEmail,
    sid: sessionId,
    tokenVersion: Number(state.tokenVersion || 0),
  });

  if (isTransitioningFromLegacy) {
    await createAuthSession({
      sessionId: sessionId,
      role: 'admin',
      adminEmail: decoded.adminEmail,
      refreshTokenHash: hashToken(nextRefreshToken),
      refreshTokenExpiresAt,
      csrfTokenHash: hashToken(csrfToken),
      tokenVersion: Number(state.tokenVersion || 0),
      req,
    });
  } else {
    await rotateAuthSession({
      role: 'admin',
      sessionId: sessionId,
      refreshTokenHash: hashToken(nextRefreshToken),
      refreshTokenExpiresAt,
      csrfTokenHash: hashToken(csrfToken),
      tokenVersion: Number(state.tokenVersion || 0),
      req,
      isGraceUpdate: isGraceMatch,
    });
  }

  const session = await getSessionAdmin();
  return { ...session, csrfToken, accessTokenExpiresAt };
};

export const logoutAdminSession = async (req, res) => {
  try {
    if (!enforceCsrfForRole(req, 'admin')) {
      console.warn('[AUTH] CSRF validation failed during admin logout attempt');
    }

    const refreshToken = getRefreshTokenFromRequest(req, 'admin');
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken('admin', refreshToken);
        if (decoded?.sid) {
          await revokeAuthSession({ role: 'admin', sessionId: decoded.sid, reason: 'logout' });
        }
      } catch (_error) {
        // Ignore revocation errors
      }
    }
  } finally {
    clearAuthCookies(res, 'admin');
  }

  return { success: true };
};

