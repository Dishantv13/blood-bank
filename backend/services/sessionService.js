import crypto from 'crypto';
import AuthSession from '../models/AuthSession.model.js';

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

const getRequestIp = (req) => String(req.ip || req.headers['x-forwarded-for'] || '').split(',')[0].trim();
const getRequestUserAgent = (req) => String(req.get?.('user-agent') || req.headers['user-agent'] || '').trim().slice(0, 512);

export const createAuthSession = async ({
  sessionId: providedSessionId,
  role,
  refreshTokenHash,
  refreshTokenExpiresAt,
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
    tokenVersion,
    expiresAt: new Date(refreshTokenExpiresAt),
    lastUsedAt: new Date(),
    ip: getRequestIp(req),
    userAgent: getRequestUserAgent(req),
  });

  return sessionId;
};

export const getAuthSessionForRefresh = async ({ role, sessionId }) =>
  AuthSession.findOne({ role, sessionId }).select('+refreshTokenHash +previousRefreshTokenHash').lean();

export const rotateAuthSession = async ({
  role,
  sessionId,
  refreshTokenHash,
  refreshTokenExpiresAt,
  tokenVersion,
  req,
  isGraceUpdate = false,
}) => {
  const update = {
    refreshTokenHash,
    expiresAt: new Date(refreshTokenExpiresAt),
    tokenVersion,
    lastUsedAt: new Date(),
    rotatedAt: new Date(),
    ip: getRequestIp(req),
    userAgent: getRequestUserAgent(req),
  };

  // Only move current hash to previous if this isn't already a grace-period update.
  // This preserves the "original" old token for multiple concurrent tab refreshes.
  if (!isGraceUpdate) {
    const session = await AuthSession.findOne({ role, sessionId }).select('refreshTokenHash');
    update.previousRefreshTokenHash = session?.refreshTokenHash || null;
  }

  await AuthSession.updateOne(
    { role, sessionId, revokedAt: null },
    { $set: update }
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
};

export const revokeAllPrincipalSessions = async ({
  role,
  userId = null,
  bloodBankId = null,
  adminEmail = null,
  reason = 'revoked_all',
}) => {
  await AuthSession.updateMany(
    {
      ...buildPrincipalQuery({ role, userId, bloodBankId, adminEmail }),
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    }
  );
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
