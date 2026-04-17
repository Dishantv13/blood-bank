import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.model.js';
import RegistrationOtp from '../models/BloodBankRegistrationOtp.model.js';
import { 
  sendPasswordResetEmail, 
  sendWelcomeEmail,
  sendUserRegistrationOtpEmail 
} from '../utils/emailService.js';
import { validateUserRegistration, validateEmail, validatePassword, validatePhone } from './validationService.js';
import { ApiError } from '../utils/apiError.js';
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
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from '../config/authConfig.js';
import { sanitizeUser, USER_SAFE_FIELDS } from '../utils/serializers.js';
import {
  createAuthSession,
  getAuthSessionForRefresh,
  logRefreshReuseDetected,
  revokeAllPrincipalSessions,
  revokeAuthSession,
  rotateAuthSession,
  updateCsrfToken,
} from './sessionService.js';

const toPublicUser = (user) => sanitizeUser(user);

const buildUserClaims = (user, sessionId) => ({
  userId: String(user.id),
  email: user.email,
  role: user.role,
  type: 'user',
  sid: sessionId,
  tokenVersion: Number(user.tokenVersion || 0),
});

const GOOGLE_OAUTH_STATE_COOKIE = 'bb_google_oauth_state';
const GOOGLE_OAUTH_NONCE_COOKIE = 'bb_google_oauth_nonce';
const GOOGLE_OAUTH_VERIFIER_COOKIE = 'bb_google_oauth_verifier';
const GOOGLE_OAUTH_MODE_COOKIE = 'bb_google_oauth_mode';
const GOOGLE_OAUTH_COOKIE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_OAUTH_SCOPES = 'openid email profile';
const GOOGLE_OAUTH_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_OAUTH_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const toBase64Url = (buffer) =>
  Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (base64url) => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString();
};

const createPkcePair = () => {
  const verifier = toBase64Url(crypto.randomBytes(32));
  const challenge = toBase64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
};

const USER_OTP_EXPIRY_MINUTES = 10;
const USER_OTP_MAX_VERIFY_ATTEMPTS = 5;
const USER_OTP_MAX_RESEND_ATTEMPTS = 5;
const USER_OTP_RESEND_COOLDOWN_SECONDS = 60;
const USER_PENDING_REGISTRATION_TTL_MINUTES = 60;

const getOtpHashSecret = () => {
  const secret = process.env.BLOODBANK_OTP_HASH_SECRET;
  if (!secret) throw new ApiError(500, 'BLOODBANK_OTP_HASH_SECRET is not configured');
  return secret;
};

const hashOtp = async (otp) => await bcrypt.hash(String(otp), 10);
const verifyOtp = async (otp, hashedOtp) => await bcrypt.compare(String(otp), hashedOtp);

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const maskEmail = (email = '') => {
  const [localPart, domain = ''] = String(email).split('@');
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
};

const buildOtpMeta = (record) => {
  const now = Date.now();
  const resendAvailableInSeconds = Math.max(
    0,
    Math.ceil(
      (new Date(record.lastOtpSentAt || now).getTime() + USER_OTP_RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000
    )
  );
  const otpExpiresInSeconds = Math.max(
    0,
    Math.ceil((new Date(record.otpExpiresAt).getTime() - now) / 1000)
  );

  return {
    verificationId: record.verificationId,
    maskedEmail: maskEmail(record.email),
    attemptsRemaining: Math.max(0, USER_OTP_MAX_VERIFY_ATTEMPTS - (record.verifyAttemptsUsed || 0)),
    resendAttemptsRemaining: Math.max(0, USER_OTP_MAX_RESEND_ATTEMPTS - (record.resendCount || 0)),
    resendAvailableInSeconds,
    otpExpiresInSeconds,
    maxVerifyAttempts: USER_OTP_MAX_VERIFY_ATTEMPTS,
    maxResendAttempts: USER_OTP_MAX_RESEND_ATTEMPTS,
  };
};

const timingSafeEqual = (left, right) => {
  if (!left || !right) return false;
  try {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  } catch (err) {
    return false;
  }
};

const getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new ApiError(500, 'Google OAuth is not configured on the server');
  }

  return { clientId, clientSecret };
};

const getFrontendOrigin = () => {
  const configured = process.env.FRONTEND_URL?.trim();
  if (!configured) return 'http://localhost:3000';
  try {
    const url = new URL(configured);
    return `${url.protocol}//${url.host}`;
  } catch (_error) {
    return 'http://localhost:3000';
  }
};

const getGoogleRedirectUri = (req) => {
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = req.get('host');
  return `${protocol}://${host}/api/v1/auth/google/callback`;
};

const getPrivateCookieOptions = () => ({
  ...getPublicCookieOptions(),
  httpOnly: true,
  maxAge: GOOGLE_OAUTH_COOKIE_TTL_MS,
});

export const clearGoogleOauthCookies = (res, clearMode = false) => {
  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, getPrivateCookieOptions());
  res.clearCookie(GOOGLE_OAUTH_NONCE_COOKIE, getPrivateCookieOptions());
  res.clearCookie(GOOGLE_OAUTH_VERIFIER_COOKIE, getPrivateCookieOptions());
  if (clearMode) {
    res.clearCookie(GOOGLE_OAUTH_MODE_COOKIE, getPrivateCookieOptions());
  }
};

const resolveGoogleMode = (rawMode) => {
  const mode = String(rawMode || '').toLowerCase();
  return mode === 'signup' ? 'signup' : 'login';
};

const buildFrontendRedirect = (mode, status, reason = '') => {
  const origin = getFrontendOrigin();
  if (status === 'success') {
    return `${origin}/dashboard`;
  }

  const targetPath = mode === 'signup' ? '/signup' : '/login';
  const query = reason ? `?authError=${encodeURIComponent(reason)}` : '';
  return `${origin}${targetPath}${query}`;
};

const createUserSession = async (req, res, user) => {
  const tokenVersion =
    typeof user?.tokenVersion === 'number'
      ? Number(user.tokenVersion)
      : Number((await User.findById(user.id).select('+tokenVersion').lean())?.tokenVersion || 0);
  const sessionId = crypto.randomUUID();
  const { refreshToken, refreshTokenExpiresAt, csrfToken, accessTokenExpiresAt } = setAuthCookies(
    res,
    'user',
    buildUserClaims({ ...user, tokenVersion }, sessionId)
  );

  await createAuthSession({
    sessionId,
    role: 'user',
    userId: user.id,
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenExpiresAt,
    csrfTokenHash: hashToken(csrfToken),
    tokenVersion,
    req,
  });

  return { csrfToken, accessTokenExpiresAt };
};

const incrementUserTokenVersion = async (userId, reason = 'security_event') => {
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $inc: { tokenVersion: 1 },
      $set: { passwordChangedAt: new Date() },
    },
    { returnDocument: 'after' }
  ).select('_id email role +tokenVersion').lean();
  
  if (!updatedUser) {
    throw new ApiError(401, 'User session is invalid');
  }

  await revokeAllPrincipalSessions({ role: 'user', userId, reason });
  return updatedUser;
};

export const issueUserCsrfToken = async (req, res) => {
  const { csrfCookie } = getCookieNamesForRole('user');
  const csrfToken = generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, getPublicCookieOptions());

  // If user has an active session, sync the new CSRF token so subsequent state-changing
  // requests are accepted without requiring a full session refresh.
  const accessToken = getAccessTokenFromRequest(req, 'user');
  if (accessToken) {
    try {
      const decoded = verifyAccessToken('user', accessToken);
      if (decoded.sid) {
        await updateCsrfToken({ 
          role: 'user', 
          sessionId: decoded.sid, 
          csrfTokenHash: hashToken(csrfToken) 
        });
      }
    } catch (_error) {
      // Ignore errors if token is invalid - client will handle 401 later
    }
  }

  return { csrfToken };
};

export const registerAndCreateSession = async (req, res) => {
  const result = await registerUser(req.body);
  const { csrfToken, accessTokenExpiresAt } = await createUserSession(req, res, result.user);
  return { user: result.user, csrfToken, accessTokenExpiresAt };
};

export const loginAndCreateSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);
  const { csrfToken, accessTokenExpiresAt } = await createUserSession(req, res, result.user);
  return { user: result.user, csrfToken, accessTokenExpiresAt };
};

export const getGoogleOAuthStartUrl = async (req, res) => {
  const { clientId } = getGoogleOAuthConfig();
  const redirectUri = getGoogleRedirectUri(req);
  const mode = resolveGoogleMode(req.query?.mode);

  const statePayload = JSON.stringify({
    mode,
    nonce: crypto.randomBytes(16).toString('hex')
  });
  const stateRaw = toBase64Url(statePayload);
  const nonceRaw = toBase64Url(crypto.randomBytes(32));
  const { verifier, challenge } = createPkcePair();

  res.cookie(GOOGLE_OAUTH_STATE_COOKIE, hashToken(stateRaw), getPrivateCookieOptions());
  res.cookie(GOOGLE_OAUTH_NONCE_COOKIE, hashToken(nonceRaw), getPrivateCookieOptions());
  res.cookie(GOOGLE_OAUTH_VERIFIER_COOKIE, verifier, getPrivateCookieOptions());

  const authUrl = new URL(GOOGLE_OAUTH_AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_OAUTH_SCOPES);
  authUrl.searchParams.set('state', stateRaw);
  authUrl.searchParams.set('nonce', nonceRaw);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('access_type', 'online');
  authUrl.searchParams.set('include_granted_scopes', 'true');

  return { redirectUrl: authUrl.toString() };
};

export const completeGoogleOAuthAndCreateSession = async (req, res) => {
  const state = String(req.query?.state || '');
  let mode = 'login';
  
  try {
    const decodedState = JSON.parse(fromBase64Url(state));
    mode = resolveGoogleMode(decodedState.mode);
  } catch (e) {
    // If state is not our JSON format, it might be an old flow or invalid
  }

  const fail = (reason) => ({ redirectUrl: buildFrontendRedirect(mode, 'error', reason) });

  const code = String(req.query?.code || '');
  const oauthError = String(req.query?.error || '');

  if (oauthError) {
    clearGoogleOauthCookies(res);
    return fail('google_oauth_denied');
  }

  const expectedStateHash = req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE];
  const expectedNonceHash = req.cookies?.[GOOGLE_OAUTH_NONCE_COOKIE];
  const codeVerifier = req.cookies?.[GOOGLE_OAUTH_VERIFIER_COOKIE];

  if (!code || !state || !expectedStateHash || !expectedNonceHash || !codeVerifier) {
    clearGoogleOauthCookies(res);
    return fail('google_oauth_invalid_state');
  }

  const incomingStateHash = hashToken(state);
  if (!timingSafeEqual(incomingStateHash, expectedStateHash)) {
    clearGoogleOauthCookies(res);
    return fail('google_oauth_state_mismatch');
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const redirectUri = getGoogleRedirectUri(req);

  try {
    const tokenResponse = await axios.post(
      GOOGLE_OAUTH_TOKEN_ENDPOINT,
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    const idToken = tokenResponse?.data?.id_token;
    if (!idToken) {
      throw new ApiError(401, 'Google OAuth token response did not include id_token');
    }

    const googleClient = new OAuth2Client(clientId);
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    const nonce = payload?.nonce || '';
    if (!nonce || !timingSafeEqual(hashToken(nonce), expectedNonceHash)) {
      throw new ApiError(401, 'Google OAuth nonce validation failed');
    }

    const result = await googleLoginWithClaims({
      email: payload?.email,
      name: payload?.name,
      googleId: payload?.sub,
      photoURL: payload?.picture,
      emailVerified: payload?.email_verified === true,
    });

    await createUserSession(req, res, result.user);

    clearGoogleOauthCookies(res, true); // true to clear the now-deprecated mode cookie too
    return { redirectUrl: buildFrontendRedirect(mode, 'success') };
  } catch (error) {
    clearGoogleOauthCookies(res);
    return fail('google_oauth_failed');
  }
};

export const refreshUserSession = async (req, res) => {
  if (!enforceCsrfForRole(req, 'user')) {
    throw new ApiError(403, 'Invalid or missing CSRF token');
  }

  const refreshToken = getRefreshTokenFromRequest(req, 'user');
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token missing');
  }

  const decoded = verifyRefreshToken('user', refreshToken);
  const [sessionUser, sessionRecord] = await Promise.all([
    User.findById(decoded.userId)
      .select('_id email role +tokenVersion')
      .lean(),
    getAuthSessionForRefresh({ role: 'user', sessionId: decoded.sid }),
  ]);

  const incomingRefreshHash = hashToken(refreshToken);
  const isCurrentMatch = sessionRecord?.refreshTokenHash === incomingRefreshHash;
  const isGraceMatch = sessionRecord?.rotatedAt && 
                       (Date.now() - new Date(sessionRecord.rotatedAt).getTime() < 10000) &&
                       sessionRecord?.previousRefreshTokenHash === incomingRefreshHash;

  const isTokenValid = isCurrentMatch || isGraceMatch;

  const requiresSessionRevoke =
    !sessionUser ||
    !sessionRecord ||
    sessionRecord.revokedAt ||
    new Date(sessionRecord.expiresAt).getTime() <= Date.now() ||
    Number(decoded.tokenVersion) !== Number(sessionUser.tokenVersion || 0) ||
    Number(sessionRecord?.tokenVersion) !== Number(sessionUser.tokenVersion || 0) ||
    !isTokenValid;

  if (requiresSessionRevoke) {
    if (sessionRecord?.sessionId) {
      await revokeAuthSession({ 
        role: 'user', 
        sessionId: sessionRecord.sessionId, 
        reason: 'refresh_token_mismatch' 
      });
    }
    
    // Only perform a global revoke if we suspect a serious breach (e.g., tokenVersion mismatch)
    const suspectSeriousBreach = sessionUser && (
      Number(decoded.tokenVersion) !== Number(sessionUser.tokenVersion || 0) ||
      Number(sessionRecord?.tokenVersion) !== Number(sessionUser.tokenVersion || 0)
    );

    if (suspectSeriousBreach && sessionUser?._id) {
      await incrementUserTokenVersion(sessionUser._id, 'security_breach_detected');
    }

    logRefreshReuseDetected({
      role: 'user',
      sessionId: decoded.sid,
      principal: decoded.userId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    clearAuthCookies(res, 'user');
    throw new ApiError(401, 'Refresh token is invalid or has been reused');
  }

  const sessionId = decoded.sid || crypto.randomUUID();
  const isTransitioningFromLegacy = !decoded.sid || !sessionRecord;

  const { refreshToken: nextRefreshToken, refreshTokenExpiresAt, csrfToken, accessTokenExpiresAt } = setAuthCookies(
    res,
    'user',
    {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      type: 'user',
      sid: sessionId,
      tokenVersion: Number(sessionUser.tokenVersion || 0),
    }
  );

  if (isTransitioningFromLegacy) {
    await createAuthSession({
      sessionId: sessionId,
      role: 'user',
      userId: sessionUser._id,
      refreshTokenHash: hashToken(nextRefreshToken),
      refreshTokenExpiresAt,
      csrfTokenHash: hashToken(csrfToken),
      tokenVersion: Number(sessionUser.tokenVersion || 0),
      req,
    });
  } else {
    await rotateAuthSession({
      role: 'user',
      sessionId: sessionId,
      refreshTokenHash: hashToken(nextRefreshToken),
      refreshTokenExpiresAt,
      csrfTokenHash: hashToken(csrfToken),
      tokenVersion: Number(sessionUser.tokenVersion || 0),
      req,
      isGraceUpdate: isGraceMatch,
    });
  }

  const result = await getSessionUser(decoded.userId);
  return { user: result.user, csrfToken, accessTokenExpiresAt };
};

export const logoutUserSession = async (req, res) => {
  try {
    if (!enforceCsrfForRole(req, 'user')) {
      console.warn('[AUTH] CSRF validation failed during logout attempt');
    }
    const refreshToken = getRefreshTokenFromRequest(req, 'user');
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken('user', refreshToken);
        if (decoded?.sid) {
          await revokeAuthSession({ role: 'user', sessionId: decoded.sid, reason: 'logout' });
        }
      } catch (_error) {
      }
    }
  } finally {

    clearAuthCookies(res, 'user');
  }
  
  return { success: true };
};

// Register new user
export const registerUser = async (data) => {
  validateUserRegistration(data);

  const { name, email, password, phone, bloodGroup, isDonor, address } = data;

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new ApiError(409, 'User already exists with this email');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = new User({
    name,
    email,
    password: hashedPassword,
    phone,
    bloodGroup,
    isDonor: isDonor || false,
    address
  });

  await user.save();

  // Send welcome email (asynchronously, won't block response)
  sendWelcomeEmail(user.email, user.name).catch(err => console.error('Welcome email failed:', err));

  return {
    user: toPublicUser(user)
  };
};

// Login user with email & password
export const loginUser = async (email, password) => {
  validateEmail(email);
  validatePassword(password);

  const user = await User.findOne({ email })
    .select('_id name email +password bloodGroup phone role isDonor photoURL activeMode donorInfo address +loginAttempts +lockUntil +tokenVersion');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check if account is temporarily locked
  if (user.lockUntil && user.lockUntil > Date.now()) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const attempts = (user.loginAttempts || 0) + 1;
    user.loginAttempts = attempts;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    await user.save();
    throw new ApiError(401, 'Invalid email or password');
  }

  // Successful login – clear lockout state
  if (user.loginAttempts || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  return {
    user: toPublicUser(user)
  };
};

// Google OAuth login/register
export const googleLoginWithClaims = async ({ email, name, googleId, photoURL, emailVerified }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const displayName = String(name || '').trim() || normalizedEmail.split('@')[0] || 'Google User';
  const normalizedGoogleId = String(googleId || '').trim();
  const normalizedPhotoUrl = String(photoURL || '').trim();

  if (!normalizedEmail || !normalizedGoogleId) {
    throw new ApiError(400, 'Missing required Google user data');
  }

  let user = await User.findOne({ email: normalizedEmail }).select('+tokenVersion +role +activeMode');

  if (!user) {
    const newUser = new User({
      name: displayName,
      email: normalizedEmail,
      googleId: normalizedGoogleId,
      photoURL: normalizedPhotoUrl,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      phone: '',
      isDonor: false,
      address: { street: '', city: '', state: '', pincode: '' },
      tokenVersion: 0,
      isEmailVerified: true
    });

    await newUser.save();
    user = newUser;
  } else if (!user.googleId) {
    // Guard against legacy empty-string values that violate enum validation on save.
    if (user.bloodGroup === '') {
      user.bloodGroup = undefined;
    }
    user.googleId = normalizedGoogleId;
    user.photoURL = normalizedPhotoUrl;
    await user.save();
  }

  return {
    user: toPublicUser(user)
  };
};

export const getSessionUser = async (userId) => {
  const user = await User.findById(userId)
    .select(USER_SAFE_FIELDS)
    .lean();

  if (!user) {
    throw new ApiError(401, 'User session is invalid');
  }

  return { user: toPublicUser(user) };
};

export const getUserSessionWithExpiry = async (req, userId) => {
  const result = await getSessionUser(userId);
  return {
    ...result,
    accessTokenExpiresAt: getAccessTokenExpiryFromRequest(req, 'user'),
  };
};

// Request password reset
// Uses constant-time response to prevent account enumeration
export const requestPasswordReset = async (email) => {
  validateEmail(email);

  const user = await User.findOne({ email });

  // Always generate a token even if user doesn't exist (timing attack prevention)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  if (user) {
    user.passwordReset = {
      token: resetTokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiration
    };

    await user.save();

    try {
      await sendPasswordResetEmail(email, resetToken, 'user');
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new ApiError(500, 'Failed to send reset email. Please try again later.');
    }
  }

  // Always return success to prevent user enumeration
  // Attacker cannot determine if email exists in system
  return { success: true };
};

// Reset password with token
export const resetPassword = async (token, newPassword) => {
  validatePassword(newPassword);

  if (!token) {
    throw new ApiError(400, 'Reset token is required');
  }

  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    'passwordReset.token': resetTokenHash,
    'passwordReset.expiresAt': { $gt: new Date() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.password = hashedPassword;
  user.passwordReset = undefined;
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  user.passwordChangedAt = new Date();

  await user.save();
  await revokeAllPrincipalSessions({ role: 'user', userId: user._id, reason: 'password_reset' });

  return { success: true };
};

export const initiateUserRegistration = async (req, registrationData) => {
  const { name, email, password, bloodGroup, phone } = registrationData;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Please provide name, email, and password');
  }

  validateEmail(email);
  validatePassword(password);
  if (phone) validatePhone(phone);

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists');
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const now = new Date();
  const otpExpiresAt = new Date(now.getTime() + USER_OTP_EXPIRY_MINUTES * 60 * 1000);
  const recordExpiresAt = new Date(now.getTime() + USER_PENDING_REGISTRATION_TTL_MINUTES * 60 * 1000);
  const verificationId = crypto.randomUUID();

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const existingPending = await RegistrationOtp.findOne({ 
    email: email.toLowerCase(), 
    type: 'user',
    status: { $in: ['pending', 'expired'] }
  });

  const pendingData = {
    verificationId,
    email: email.toLowerCase(),
    type: 'user',
    otpHash,
    otpExpiresAt,
    status: 'pending',
    verifyAttemptsUsed: 0,
    resendCount: 0,
    lastOtpSentAt: now,
    registrationData: {
      ...registrationData,
      password: hashedPassword,
    },
    clientMeta: {
      ip: String(req.ip || ''),
      userAgent: String(req.get('user-agent') || ''),
    },
    expiresAt: recordExpiresAt,
    verifiedAt: null,
  };

  if (existingPending) {
    Object.assign(existingPending, pendingData);
    await existingPending.save();
  } else {
    await RegistrationOtp.create(pendingData);
  }

  try {
    await sendUserRegistrationOtpEmail(email, otp, {
      expiresInMinutes: USER_OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error('User OTP send failed:', error);
    await RegistrationOtp.deleteOne({ verificationId });
    throw new ApiError(500, 'Unable to send OTP email. Please try again later.');
  }

  const record = await RegistrationOtp.findOne({ verificationId }).lean();
  return {
    ...buildOtpMeta(record),
    nextStep: 'verify_otp',
  };
};

export const verifyUserRegistrationOtp = async (req, res, verificationId, otp) => {
  if (!verificationId || !otp) {
    throw new ApiError(400, 'verificationId and otp are required');
  }

  const now = new Date();
  const pendingRegistration = await RegistrationOtp.findOne({
    verificationId: String(verificationId),
    type: 'user'
  }).select('+otpHash');

  if (!pendingRegistration) {
    throw new ApiError(400, 'Invalid or expired verification session');
  }

  if (pendingRegistration.status === 'locked') {
    throw new ApiError(429, 'Maximum OTP attempts reached. Please restart registration.');
  }

  if (pendingRegistration.status !== 'pending' || pendingRegistration.expiresAt <= now || pendingRegistration.otpExpiresAt <= now) {
    pendingRegistration.status = 'expired';
    await pendingRegistration.save();
    throw new ApiError(400, 'OTP is invalid or expired. Please restart registration.');
  }

  if (pendingRegistration.verifyAttemptsUsed >= USER_OTP_MAX_VERIFY_ATTEMPTS) {
    pendingRegistration.status = 'locked';
    await pendingRegistration.save();
    throw new ApiError(429, 'Maximum OTP attempts reached. Please restart registration.');
  }

  const isOtpValid = await verifyOtp(String(otp).trim(), pendingRegistration.otpHash);
  if (!isOtpValid) {
    pendingRegistration.verifyAttemptsUsed += 1;
    if (pendingRegistration.verifyAttemptsUsed >= USER_OTP_MAX_VERIFY_ATTEMPTS) {
      pendingRegistration.status = 'locked';
    }
    await pendingRegistration.save();

    const meta = buildOtpMeta(pendingRegistration.toObject());
    throw new ApiError(
      pendingRegistration.status === 'locked' ? 429 : 400,
      pendingRegistration.status === 'locked'
        ? 'Maximum OTP attempts reached. Please restart registration.'
        : `Invalid OTP. ${meta.attemptsRemaining} attempts remaining.`
    );
  }

  // OTP is valid - create the user
  const regData = pendingRegistration.registrationData;
  const user = new User({
    name: regData.name,
    email: regData.email.toLowerCase(),
    password: regData.password, // Already hashed during initiation
    bloodGroup: regData.bloodGroup,
    phone: regData.phone || '',
    isDonor: false,
    address: regData.address || { street: '', city: '', state: '', pincode: '' },
    role: 'user',
    isEmailVerified: true,
  });

  await user.save();
  await RegistrationOtp.deleteOne({ _id: pendingRegistration._id });

  // Create session for the new user
  const sessionId = crypto.randomUUID();
  const { refreshToken, refreshTokenExpiresAt, csrfToken, accessTokenExpiresAt } = setAuthCookies(
    res,
    'user',
    buildUserClaims(user, sessionId)
  );

  await createAuthSession({
    sessionId,
    role: 'user',
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenExpiresAt,
    tokenVersion: user.tokenVersion || 0,
    req,
  });

  await sendWelcomeEmail(user.email, user.name);

  return {
    user: toPublicUser(user),
    csrfToken,
    accessTokenExpiresAt,
  };
};

export const resendUserRegistrationOtp = async (req, verificationId) => {
  if (!verificationId) {
    throw new ApiError(400, 'verificationId is required');
  }

  const now = new Date();
  const pendingRegistration = await RegistrationOtp.findOne({
    verificationId: String(verificationId),
    type: 'user'
  }).select('+otpHash');

  if (!pendingRegistration) {
    throw new ApiError(400, 'Invalid or expired verification session');
  }

  if (pendingRegistration.status === 'locked') {
    throw new ApiError(429, 'Maximum attempts reached. Please restart registration.');
  }

  if (pendingRegistration.resendCount >= USER_OTP_MAX_RESEND_ATTEMPTS) {
    throw new ApiError(429, 'Maximum resend attempts reached. Please restart registration.');
  }

  const cooldownExpiry = new Date(pendingRegistration.lastOtpSentAt.getTime() + USER_OTP_RESEND_COOLDOWN_SECONDS * 1000);
  if (now < cooldownExpiry) {
    const remaining = Math.ceil((cooldownExpiry - now) / 1000);
    throw new ApiError(429, `Please wait ${remaining} seconds before requesting a new OTP.`);
  }

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  
  pendingRegistration.otpHash = otpHash;
  pendingRegistration.otpExpiresAt = new Date(now.getTime() + USER_OTP_EXPIRY_MINUTES * 60 * 1000);
  pendingRegistration.lastOtpSentAt = now;
  pendingRegistration.resendCount += 1;
  pendingRegistration.status = 'pending';
  await pendingRegistration.save();

  try {
    await sendUserRegistrationOtpEmail(pendingRegistration.email, otp, {
      expiresInMinutes: USER_OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    throw new ApiError(500, 'Unable to send OTP email. Please try again later.');
  }

  return buildOtpMeta(pendingRegistration.toObject());
};

// Verify reset token
export const verifyResetToken = async (token) => {
  if (!token) {
    throw new ApiError(400, 'Reset token is required');
  }

  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    'passwordReset.token': resetTokenHash,
    'passwordReset.expiresAt': { $gt: new Date() }
  }).select('_id').lean();

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  return { valid: true };
};

// Change password for authenticated user
export const changePassword = async (userId, currentPassword, newPassword) => {
  validatePassword(newPassword);

  if (!currentPassword) {
    throw new ApiError(400, 'Current password is required');
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new ApiError(400, 'New password must be different from current password');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.password = hashedPassword;
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  user.passwordChangedAt = new Date();
  await user.save();
  await revokeAllPrincipalSessions({ role: 'user', userId: user._id, reason: 'password_change' });

  return { success: true };
};



