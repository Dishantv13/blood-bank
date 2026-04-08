import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.model.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { validateUserRegistration, validateEmail, validatePassword } from './validationService.js';
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
} from '../utils/authCookies.js';
import { enforceCsrfForRole } from '../middleware/csrf.js';
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from '../config/authConfig.js';
import { sanitizeUser, USER_SAFE_FIELDS } from '../utils/serializers.js';

const toPublicUser = (user) => sanitizeUser(user);

const buildUserClaims = (user) => ({
  userId: String(user.id),
  email: user.email,
  role: user.role,
  type: 'user',
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

const createPkcePair = () => {
  const verifier = toBase64Url(crypto.randomBytes(32));
  const challenge = toBase64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
};

const timingSafeEqual = (left, right) => {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
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
  return `${protocol}://${host}/api/auth/google/callback`;
};

const getPrivateCookieOptions = () => ({
  ...getPublicCookieOptions(),
  httpOnly: true,
  maxAge: GOOGLE_OAUTH_COOKIE_TTL_MS,
});

const clearGoogleOauthCookies = (res) => {
  const clearOptions = {
    ...getPrivateCookieOptions(),
    maxAge: 0,
  };

  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, clearOptions);
  res.clearCookie(GOOGLE_OAUTH_NONCE_COOKIE, clearOptions);
  res.clearCookie(GOOGLE_OAUTH_VERIFIER_COOKIE, clearOptions);
  res.clearCookie(GOOGLE_OAUTH_MODE_COOKIE, clearOptions);
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

const persistUserRefreshToken = async (userId, refreshToken) => {
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        'authSession.refreshTokenHash': hashToken(refreshToken),
        'authSession.refreshTokenIssuedAt': new Date(),
      },
    }
  );
};

const clearUserRefreshToken = async (userId) => {
  if (!userId) return;

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        'authSession.refreshTokenHash': null,
        'authSession.refreshTokenIssuedAt': null,
      },
    }
  );
};

export const issueUserCsrfToken = (res) => {
  const { csrfCookie } = getCookieNamesForRole('user');
  const csrfToken = generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, getPublicCookieOptions());

  return { csrfToken };
};

export const registerAndCreateSession = async (req, res) => {
  const result = await registerUser(req.body);
  const { refreshToken, csrfToken, accessTokenExpiresAt } = setAuthCookies(res, 'user', buildUserClaims(result.user));
  await persistUserRefreshToken(result.user.id, refreshToken);
  return { user: result.user, csrfToken, accessTokenExpiresAt };
};

export const loginAndCreateSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);
  const { refreshToken, csrfToken, accessTokenExpiresAt } = setAuthCookies(res, 'user', buildUserClaims(result.user));
  await persistUserRefreshToken(result.user.id, refreshToken);
  return { user: result.user, csrfToken, accessTokenExpiresAt };
};

export const getGoogleOAuthStartUrl = async (req, res) => {
  const { clientId } = getGoogleOAuthConfig();
  const redirectUri = getGoogleRedirectUri(req);
  const mode = resolveGoogleMode(req.query?.mode);

  const stateRaw = toBase64Url(crypto.randomBytes(32));
  const nonceRaw = toBase64Url(crypto.randomBytes(32));
  const { verifier, challenge } = createPkcePair();

  res.cookie(GOOGLE_OAUTH_STATE_COOKIE, hashToken(stateRaw), getPrivateCookieOptions());
  res.cookie(GOOGLE_OAUTH_NONCE_COOKIE, hashToken(nonceRaw), getPrivateCookieOptions());
  res.cookie(GOOGLE_OAUTH_VERIFIER_COOKIE, verifier, getPrivateCookieOptions());
  res.cookie(GOOGLE_OAUTH_MODE_COOKIE, mode, getPrivateCookieOptions());

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
  const mode = resolveGoogleMode(req.cookies?.[GOOGLE_OAUTH_MODE_COOKIE]);
  const fail = (reason) => ({ redirectUrl: buildFrontendRedirect(mode, 'error', reason) });

  const code = String(req.query?.code || '');
  const state = String(req.query?.state || '');
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

    const { refreshToken } = setAuthCookies(res, 'user', buildUserClaims(result.user));
    await persistUserRefreshToken(result.user.id, refreshToken);

    clearGoogleOauthCookies(res);
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
  const sessionUser = await User.findById(decoded.userId)
    .select('_id +authSession.refreshTokenHash')
    .lean();

  if (!sessionUser?.authSession?.refreshTokenHash || sessionUser.authSession.refreshTokenHash !== hashToken(refreshToken)) {
    clearAuthCookies(res, 'user');
    throw new ApiError(401, 'Refresh token is invalid');
  }

  const { refreshToken: nextRefreshToken, csrfToken, accessTokenExpiresAt } = setAuthCookies(res, 'user', {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    type: 'user',
  });
  await persistUserRefreshToken(decoded.userId, nextRefreshToken);

  const result = await getSessionUser(decoded.userId);
  return { user: result.user, csrfToken, accessTokenExpiresAt };
};

export const logoutUserSession = async (req, res) => {
  if (!enforceCsrfForRole(req, 'user')) {
    throw new ApiError(403, 'Invalid or missing CSRF token');
  }

  const refreshToken = getRefreshTokenFromRequest(req, 'user');
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken('user', refreshToken);
      await clearUserRefreshToken(decoded.userId);
    } catch (_error) {
      // Still clear client cookies even if refresh token is already invalid.
    }
  }

  clearAuthCookies(res, 'user');
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

  return {
    user: toPublicUser(user)
  };
};

// Login user with email & password
export const loginUser = async (email, password) => {
  validateEmail(email);
  validatePassword(password);

  const user = await User.findOne({ email })
    .select('_id name email +password bloodGroup phone role isDonor photoURL activeMode donorInfo address +loginAttempts +lockUntil');

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

  if (!emailVerified) {
    throw new ApiError(403, 'Google account email must be verified');
  }

  if (!normalizedEmail || !normalizedGoogleId) {
    throw new ApiError(400, 'Missing required Google user data');
  }

  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const newUser = new User({
      name: displayName,
      email: normalizedEmail,
      googleId: normalizedGoogleId,
      photoURL: normalizedPhotoUrl,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      phone: '',
      isDonor: false,
      address: { street: '', city: '', state: '', pincode: '' }
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
  user.authSession = {
    refreshTokenHash: null,
    refreshTokenIssuedAt: null,
  };

  await user.save();

  return { success: true };
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
  user.authSession = {
    refreshTokenHash: null,
    refreshTokenIssuedAt: null,
  };
  await user.save();

  return { success: true };
};

