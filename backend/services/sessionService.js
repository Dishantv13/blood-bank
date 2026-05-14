import crypto from "crypto";
import AuthSession from "../models/AuthSession.model.js";
import redisClient from "../utils/redisClient.js";
import { hashToken } from "../utils/authCookies.js";
import { ApiError } from "../utils/apiError.js";
import { enforceCsrfForRole } from "../middleware/csrf.js";
import * as authCookies from "../utils/authCookies.js";

const buildPrincipalQuery = ({
  role,
  userId = null,
  bloodBankId = null,
  adminEmail = null,
}) => {
  const query = { role };
  if (role === "user") {
    query.userId = userId;
  } else if (role === "bloodbank") {
    query.bloodBankId = bloodBankId;
  } else if (role === "admin") {
    query.adminEmail = adminEmail;
  }
  return query;
};

const getRevocationKey = (sessionId) => `auth:revoked:${sessionId}`;

const getRequestIp = (req) =>
  String(req.ip || req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
const getRequestUserAgent = (req) =>
  String(req.get?.("user-agent") || req.headers["user-agent"] || "")
    .trim()
    .slice(0, 512);

export const createAuthSession = async ({
  sessionId: providedSessionId,
  role,
  refreshTokenHash,
  refreshTokenExpiresAt,
  csrfTokenHash = null,
  tokenVersion,
  req,
  userId = null,
  bloodBankId = null,
  adminEmail = null,
}) => {
  const sessionId = providedSessionId || crypto.randomUUID();

  await AuthSession.create({
    sessionId,
    role,
    userId,
    bloodBankId,
    adminEmail,
    refreshTokenHash,
    csrfTokenHash,
    tokenVersion,
    expiresAt: new Date(refreshTokenExpiresAt),
    lastUsedAt: new Date(),
    ip: getRequestIp(req),
    userAgent: getRequestUserAgent(req),
  });

  return sessionId;
};

export const getAuthSessionForRefresh = async ({ role, sessionId }) =>
  AuthSession.findOne({ role, sessionId })
    .select(
      "+refreshTokenHash +previousRefreshTokenHash +csrfTokenHash +previousCsrfTokenHash",
    )
    .lean();

export const isSessionValid = async (role, sessionId) => {
  if (!sessionId) {
    console.warn(
      `[AUTH] Session validation bypassed for role ${role} due to missing sessionId (migration transition).`,
    );
    return true;
  }

  // 1. Check Redis blacklist first (Fast path)
  const isBlacklisted = await redisClient.get(getRevocationKey(sessionId));
  if (isBlacklisted) return false;

  // 2. Check DB status
  const session = await AuthSession.findOne({ role, sessionId })
    .select("revokedAt expiresAt")
    .lean();

  if (
    !session ||
    session.revokedAt ||
    new Date(session.expiresAt) < new Date()
  ) {
    // Cache negative result to prevent DB hammering
    await redisClient.set(getRevocationKey(sessionId), "true", 3600);
    return false;
  }

  return true;
};

export const validateSessionCsrf = async ({ role, sessionId, csrfToken }) => {
  if (!sessionId || !csrfToken) return false;

  const session = await AuthSession.findOne({ role, sessionId })
    .select("+csrfTokenHash +previousCsrfTokenHash +rotatedAt")
    .lean();

  if (!session || session.revokedAt) return false;

  const incomingHash = hashToken(csrfToken);

  // 1. Check current token
  if (session.csrfTokenHash === incomingHash) return true;

  // 2. Check previous token (Grace period for rotation)
  const isGracePeriod =
    session.rotatedAt &&
    Date.now() - new Date(session.rotatedAt).getTime() < 10000; // 10 second grace

  if (isGracePeriod && session.previousCsrfTokenHash === incomingHash) {
    return true;
  }

  return false;
};

export const rotateAuthSession = async ({
  role,
  sessionId,
  refreshTokenHash,
  refreshTokenExpiresAt,
  csrfTokenHash = null,
  tokenVersion,
  req,
  isGraceUpdate = false,
}) => {
  const update = {
    refreshTokenHash,
    csrfTokenHash,
    expiresAt: new Date(refreshTokenExpiresAt),
    tokenVersion,
    lastUsedAt: new Date(),
    rotatedAt: new Date(),
    ip: getRequestIp(req),
    userAgent: getRequestUserAgent(req),
    autoDeleteAt: new Date(Math.min(
      new Date(refreshTokenExpiresAt).getTime(),
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ))
  };

  // Rotate hashes if this isn't a grace update
  if (!isGraceUpdate) {
    const session = await AuthSession.findOne({ role, sessionId }).select(
      "refreshTokenHash csrfTokenHash",
    );
    update.previousRefreshTokenHash = session?.refreshTokenHash || null;
    update.previousCsrfTokenHash = session?.csrfTokenHash || null;
  }

  await AuthSession.updateOne(
    { role, sessionId, revokedAt: null },
    { $set: update },
  );
};

export const updateCsrfToken = async ({ role, sessionId, csrfTokenHash }) => {
  const session = await AuthSession.findOne({ role, sessionId }).select(
    "csrfTokenHash",
  );

  await AuthSession.updateOne(
    { role, sessionId, revokedAt: null },
    {
      $set: {
        csrfTokenHash,
        previousCsrfTokenHash: session?.csrfTokenHash || null,
        rotatedAt: new Date(),
      },
    },
  );
};



export const revokeAuthSession = async ({
  role,
  sessionId,
  reason = "revoked",
}) => {
  await AuthSession.updateOne(
    { role, sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason: reason } },
  );

  // Sync to Redis immediately to kill active Access Tokens
  await redisClient.set(getRevocationKey(sessionId), "true", 3600);
};

export const revokeAllPrincipalSessions = async ({
  role,
  userId = null,
  bloodBankId = null,
  adminEmail = null,
  reason = "revoked_all",
}) => {
  // 1. Find all active sessions for this principal
  const query = {
    ...buildPrincipalQuery({ role, userId, bloodBankId, adminEmail }),
    revokedAt: null,
  };

  const activeSessions = await AuthSession.find(query)
    .select("sessionId")
    .lean();

  // 2. Update DB
  await AuthSession.updateMany(query, {
    $set: {
      revokedAt: new Date(),
      revokeReason: reason,
    },
  });

  // 3. Sync to Redis for all sessions
  for (const session of activeSessions) {
    await redisClient.set(getRevocationKey(session.sessionId), "true", 3600);
  }
};

export const logRefreshReuseDetected = ({
  role,
  sessionId,
  principal,
  ip,
  userAgent,
}) => {
  console.error("[SECURITY] Refresh token reuse detected", {
    role,
    sessionId,
    principal,
    ip,
    userAgent,
    detectedAt: new Date().toISOString(),
  });
};

export const validateRefreshSessionOrThrow = async ({
  role,
  refreshToken,
  decoded,
  sessionRecord,
  principal,
  principalTokenVersion,
  principalMatches = true,
  principalId,
  req,
  onSeriousBreach,
  onInvalid,
}) => {
  const incomingRefreshHash = hashToken(refreshToken);
  const isCurrentMatch =
    sessionRecord?.refreshTokenHash === incomingRefreshHash;
  const isGraceMatch =
    sessionRecord?.rotatedAt &&
    Date.now() - new Date(sessionRecord.rotatedAt).getTime() < 30000 &&
    sessionRecord?.previousRefreshTokenHash === incomingRefreshHash;
  const isTokenValid = isCurrentMatch || isGraceMatch;

  const tokenVersion = Number(principalTokenVersion || 0);
  const hasTokenVersionMismatch =
    principal &&
    (Number(decoded?.tokenVersion) !== tokenVersion ||
      Number(sessionRecord?.tokenVersion) !== tokenVersion);

  const requiresSessionRevoke =
    !principal ||
    !sessionRecord ||
    sessionRecord.revokedAt ||
    new Date(sessionRecord.expiresAt).getTime() <= Date.now() ||
    !principalMatches ||
    hasTokenVersionMismatch ||
    !isTokenValid;

  if (!requiresSessionRevoke) {
    return {
      isGraceMatch,
      sessionId: decoded.sid || crypto.randomUUID(),
      isTransitioningFromLegacy: !decoded.sid || !sessionRecord,
    };
  }

  if (sessionRecord?.sessionId) {
    await revokeAuthSession({
      role,
      sessionId: sessionRecord.sessionId,
      reason: "refresh_token_mismatch",
    });
  }

  if (hasTokenVersionMismatch && onSeriousBreach) {
    await onSeriousBreach();
  }

  logRefreshReuseDetected({
    role,
    sessionId: decoded.sid,
    principal: principalId,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  if (onInvalid) {
    await onInvalid();
  }

  throw new ApiError(401, "Refresh token is invalid or has been reused");
};



export const issuePrincipalSession = async ({
  req,
  res,
  role,
  principalId,
  tokenVersion,
  buildClaims,
  metadata = {},
}) => {
  const sessionId = crypto.randomUUID();
  const claims = buildClaims(sessionId, tokenVersion);

  const {
    refreshToken,
    refreshTokenExpiresAt,
    csrfToken,
    accessTokenExpiresAt,
  } = authCookies.setAuthCookies(res, role, claims);

  await createAuthSession({
    sessionId,
    role,
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenExpiresAt,
    csrfTokenHash: hashToken(csrfToken),
    tokenVersion,
    req,
    ...metadata,
  });

  return { csrfToken, accessTokenExpiresAt };
};

export const refreshPrincipalSession = async ({
  req,
  res,
  role,
  getPrincipal,
  buildClaims,
  onBreach,
}) => {
  // 1. Common Security Checks (duplicates removed from individual services)
  if (!enforceCsrfForRole(req, role)) {
    throw new ApiError(403, "Invalid or missing CSRF token");
  }

  const refreshToken = authCookies.getRefreshTokenFromRequest(req, role);
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  const decoded = authCookies.verifyRefreshToken(role, refreshToken);

  // 2. Fetch State in Parallel
  const [principal, sessionRecord] = await Promise.all([
    getPrincipal(decoded),
    getAuthSessionForRefresh({ role, sessionId: decoded.sid }),
  ]);

  // 3. Centralized Validation (Rotation/Breach/Grace/Legacy)
  const { isGraceMatch, sessionId, isTransitioningFromLegacy } =
    await validateRefreshSessionOrThrow({
      role,
      refreshToken,
      decoded,
      sessionRecord,
      principal,
      principalTokenVersion: principal?.tokenVersion,
      principalId: decoded.userId || decoded.bloodBankId || decoded.adminEmail,
      req,
      onSeriousBreach: () => onBreach(principal?._id || principal?.email),
      onInvalid: () => authCookies.clearAuthCookies(res, role),
    });

  const nextTokenVersion = Number(principal?.tokenVersion || 0);

  // 4. Issue New Tokens & Cookies
  const {
    refreshToken: nextRefreshToken,
    refreshTokenExpiresAt,
    csrfToken,
    accessTokenExpiresAt,
  } = authCookies.setAuthCookies(
    res,
    role,
    buildClaims(principal, sessionId, nextTokenVersion),
  );

  // 5. Update/Rotate Session Record
  if (isTransitioningFromLegacy) {
    await createAuthSession({
      sessionId,
      role,
      refreshTokenHash: hashToken(nextRefreshToken),
      refreshTokenExpiresAt,
      csrfTokenHash: hashToken(csrfToken),
      tokenVersion: nextTokenVersion,
      req,
      userId: principal?.id && role === "user" ? principal.id : null,
      bloodBankId: principal?.id && role === "bloodbank" ? principal.id : null,
      adminEmail: role === "admin" ? principal.email : null,
    });
  } else {
    await rotateAuthSession({
      role,
      sessionId,
      refreshTokenHash: hashToken(nextRefreshToken),
      refreshTokenExpiresAt,
      csrfTokenHash: hashToken(csrfToken),
      tokenVersion: nextTokenVersion,
      req,
      isGraceUpdate: isGraceMatch,
    });
  }

  return { principal, csrfToken, accessTokenExpiresAt };
};
