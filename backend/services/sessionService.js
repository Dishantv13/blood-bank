import crypto from 'crypto';
import AuthSession from '../models/AuthSession.model.js';
import redisClient from '../utils/redisClient.js';
import { hashToken } from '../utils/authCookies.js';

const buildPrincipalQuery = ({ role, userId = null, bloodBankId = null, adminEmail = null }) => {
  const query = { role };
  if (role === 'user') {
    query.userId = userId;
  } else if (role === 'bloodbank') {
    query.bloodBankId = bloodBankId;
  } else if (role === 'admin') {
    query.adminEmail = adminEmail;
  }
  return query;
};

const getRevocationKey = (sessionId) => `auth:revoked:${sessionId}`;

const getRequestIp = (req) => String(req.ip || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
const getRequestUserAgent = (req) => String(req.get?.('user-agent') || req.headers['user-agent'] || '').trim().slice(0, 512);

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
  AuthSession.findOne({ role, sessionId }).select('+refreshTokenHash +previousRefreshTokenHash +csrfTokenHash +previousCsrfTokenHash').lean();

export const isSessionValid = async (role, sessionId) => {
  if (!sessionId) {
    console.warn(`[AUTH] Session validation bypassed for role ${role} due to missing sessionId (migration transition).`);
    return true;
  }

  // 1. Check Redis blacklist first (Fast path)
  const isBlacklisted = await redisClient.get(getRevocationKey(sessionId));
  if (isBlacklisted) return false;

  // 2. Check DB status
  const session = await AuthSession.findOne({ role, sessionId })
    .select('revokedAt expiresAt')
    .lean();

  if (!session || session.revokedAt || new Date(session.expiresAt) < new Date()) {
    // Cache negative result to prevent DB hammering
    await redisClient.set(getRevocationKey(sessionId), 'true', 3600);
    return false;
  }

  return true;
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
  };

  // Rotate hashes if this isn't a grace update
  if (!isGraceUpdate) {
    const session = await AuthSession.findOne({ role, sessionId }).select('refreshTokenHash csrfTokenHash');
    update.previousRefreshTokenHash = session?.refreshTokenHash || null;
    update.previousCsrfTokenHash = session?.csrfTokenHash || null;
  }

  await AuthSession.updateOne(
    { role, sessionId, revokedAt: null },
    { $set: update }
  );
};

export const updateCsrfToken = async ({ role, sessionId, csrfTokenHash }) => {
  const session = await AuthSession.findOne({ role, sessionId }).select('csrfTokenHash');
  
  await AuthSession.updateOne(
    { role, sessionId, revokedAt: null },
    { 
      $set: { 
        csrfTokenHash,
        previousCsrfTokenHash: session?.csrfTokenHash || null,
        rotatedAt: new Date()
      } 
    }
  );
};

export const touchAuthSession = async ({ role, sessionId }) => {
  await AuthSession.updateOne(
    { role, sessionId, revokedAt: null },
    { $set: { lastUsedAt: new Date() } }
  );
};

export const revokeAuthSession = async ({ role, sessionId, reason = 'revoked' }) => {
  await AuthSession.updateOne(
    { role, sessionId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokeReason: reason } }
  );
  
  // Sync to Redis immediately to kill active Access Tokens
  await redisClient.set(getRevocationKey(sessionId), 'true', 3600);
};

export const revokeAllPrincipalSessions = async ({
  role,
  userId = null,
  bloodBankId = null,
  adminEmail = null,
  reason = 'revoked_all',
}) => {
  // 1. Find all active sessions for this principal
  const query = {
    ...buildPrincipalQuery({ role, userId, bloodBankId, adminEmail }),
    revokedAt: null,
  };
  
  const activeSessions = await AuthSession.find(query).select('sessionId').lean();
  
  // 2. Update DB
  await AuthSession.updateMany(query, {
    $set: {
      revokedAt: new Date(),
      revokeReason: reason,
    },
  });

  // 3. Sync to Redis for all sessions
  for (const session of activeSessions) {
    await redisClient.set(getRevocationKey(session.sessionId), 'true', 3600);
  }
};

export const logRefreshReuseDetected = ({ role, sessionId, principal, ip, userAgent }) => {
  console.error('[SECURITY] Refresh token reuse detected', {
    role,
    sessionId,
    principal,
    ip,
    userAgent,
    detectedAt: new Date().toISOString(),
  });
};

export const validateSessionCsrf = async ({ role, sessionId, csrfToken }) => {
  if (!sessionId) return true;
  if (!csrfToken) return false;

  const session = await AuthSession.findOne({ role, sessionId })
    .select('+csrfTokenHash +previousCsrfTokenHash rotatedAt')
    .lean();
  
  if (!session || session.revokedAt) return false;

  const incomingHash = hashToken(csrfToken);
  
  // 1. Check current hash
  if (session.csrfTokenHash === incomingHash) return true;

  // 2. Check previous hash (Grace period: 10 seconds)
  const isGraceWindow = session.rotatedAt && (Date.now() - new Date(session.rotatedAt).getTime() < 10000);
  if (isGraceWindow && session.previousCsrfTokenHash === incomingHash) {
    return true;
  }

  return false;
};
