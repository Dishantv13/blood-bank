/**
 * Auth Service
 * All authentication business logic moved from controllers
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.model.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { validateUserRegistration, validateEmail, validatePassword } from './validationService.js';
import { ApiError } from '../utils/apiError.js';
import {
  clearAuthCookies,
  generateCsrfToken,
  getCookieNamesForRole,
  getRefreshTokenFromRequest,
  setAuthCookies,
  verifyRefreshToken,
  getPublicCookieOptions,
} from '../utils/authCookies.js';
import { enforceCsrfForRole } from '../middleware/csrf.js';
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from '../config/authConfig.js';

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  bloodGroup: user.bloodGroup,
  phone: user.phone,
  role: user.role,
  isDonor: user.isDonor,
  photoURL: user.photoURL,
  activeMode: user.activeMode,
  donorInfo: user.donorInfo,
  address: user.address,
});

const buildUserClaims = (user) => ({
  userId: String(user.id),
  email: user.email,
  role: user.role,
  type: 'user',
});

export const issueUserCsrfToken = (res) => {
  const { csrfCookie } = getCookieNamesForRole('user');
  const csrfToken = generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, getPublicCookieOptions());

  return { csrfToken };
};

export const registerAndCreateSession = async (req, res) => {
  const result = await registerUser(req.body);
  const { csrfToken } = setAuthCookies(res, 'user', buildUserClaims(result.user));
  return { user: result.user, csrfToken };
};

export const loginAndCreateSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);
  const { csrfToken } = setAuthCookies(res, 'user', buildUserClaims(result.user));
  return { user: result.user, csrfToken };
};

export const googleLoginAndCreateSession = async (req, res) => {
  const { email, name, googleId, photoURL } = req.body;
  const result = await googleLogin(email, name, googleId, photoURL);
  const { csrfToken } = setAuthCookies(res, 'user', buildUserClaims(result.user));
  return { user: result.user, csrfToken };
};

export const refreshUserSession = async (req, res) => {
  if (!enforceCsrfForRole(req, 'user', { allowTrustedOriginFallback: true })) {
    throw new ApiError(403, 'Invalid or missing CSRF token');
  }

  const refreshToken = getRefreshTokenFromRequest(req, 'user');
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token missing');
  }

  const decoded = verifyRefreshToken('user', refreshToken);
  const { csrfToken } = setAuthCookies(res, 'user', {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    type: 'user',
  });

  const result = await getSessionUser(decoded.userId);
  return { user: result.user, csrfToken };
};

export const logoutUserSession = async (req, res) => {
  if (!enforceCsrfForRole(req, 'user', { allowTrustedOriginFallback: true })) {
    throw new ApiError(403, 'Invalid or missing CSRF token');
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
    .select('_id name email password bloodGroup phone role isDonor photoURL activeMode donorInfo address loginAttempts lockUntil');

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
export const googleLogin = async (email, name, googleId, photoURL) => {
  if (!email || !name || !googleId) {
    throw new ApiError(400, 'Missing required Google user data');
  }

  let user = await User.findOne({ email });

  if (!user) {
    const newUser = new User({
      name,
      email,
      googleId,
      photoURL,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      phone: '',
      bloodGroup: '',
      isDonor: false,
      address: { street: '', city: '', state: '', pincode: '' }
    });

    await newUser.save();
    user = newUser;
  } else if (!user.googleId) {
    user.googleId = googleId;
    user.photoURL = photoURL;
    await user.save();
  }

  return {
    user: toPublicUser(user)
  };
};

export const getSessionUser = async (userId) => {
  const user = await User.findById(userId)
    .select('_id name email bloodGroup phone role isDonor photoURL activeMode donorInfo address')
    .lean();

  if (!user) {
    throw new ApiError(401, 'User session is invalid');
  }

  return { user: toPublicUser(user) };
};

// Request password reset
export const requestPasswordReset = async (email) => {
  validateEmail(email);

  const user = await User.findOne({ email });
  if (!user) {
    return { success: true };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordReset = {
    token: resetTokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  };

  await user.save();

  try {
    await sendPasswordResetEmail(email, resetToken, 'user');
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new ApiError(500, 'Failed to send reset email. Please try again later.');
  }

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

  const user = await User.findById(userId).select('password');
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
  await user.save();

  return { success: true };
};

