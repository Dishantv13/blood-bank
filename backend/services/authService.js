/**
 * Auth Service
 * All authentication business logic moved from controllers
 * Handles: login, register, password reset, token verification
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.model.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { validateUserRegistration, validateEmail, validatePassword } from './validationService.js';
import { ApiError } from '../utils/apiError.js';

// Generate JWT token
export const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register new user
export const registerUser = async (data) => {
  validateUserRegistration(data);

  const { name, email, password, phone, bloodGroup, isDonor, address } = data;

  // Check if user already exists
  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new ApiError(409, 'User already exists with this email');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create new user
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

  // Generate token
  const token = generateToken(user._id, user.email, user.role);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      bloodGroup: user.bloodGroup,
      phone: user.phone,
      role: user.role,
      isDonor: user.isDonor
    }
  };
};

// Login user with email & password
export const loginUser = async (email, password) => {
  validateEmail(email);
  validatePassword(password);

  // Find user by email - optimized query
  const user = await User.findOne({ email })
    .select('_id name email password bloodGroup phone role isDonor')
    .lean();
  
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Generate token
  const token = generateToken(user._id, user.email, user.role);

  // Remove password before returning
  delete user.password;

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      bloodGroup: user.bloodGroup,
      phone: user.phone,
      role: user.role,
      isDonor: user.isDonor
    }
  };
};

// Google OAuth login/register
export const googleLogin = async (email, name, googleId, photoURL) => {
  if (!email || !name || !googleId) {
    throw new ApiError(400, 'Missing required Google user data');
  }

  let user = await User.findOne({ email }).lean();

  if (!user) {
    // Create new user from Google data
    const newUser = new User({
      name,
      email,
      googleId,
      photoURL,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      phone: '',
      bloodGroup: 'O+',
      isDonor: false,
      address: { street: '', city: '', state: '', pincode: '' }
    });

    await newUser.save();
    user = newUser.toObject();
  } else if (!user.googleId) {
    // Link Google account to existing user
    await User.updateOne({ _id: user._id }, { googleId, photoURL });
    user.googleId = googleId;
    user.photoURL = photoURL;
  }

  // Generate token
  const token = generateToken(user._id, user.email, user.role);

  delete user.password;

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      bloodGroup: user.bloodGroup,
      phone: user.phone,
      role: user.role,
      isDonor: user.isDonor,
      photoURL: user.photoURL
    }
  };
};

// Request password reset
export const requestPasswordReset = async (email) => {
  validateEmail(email);

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists (security)
    return { success: true };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set token expiration (1 hour)
  user.passwordReset = {
    token: resetTokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  };

  await user.save();

  // Send email
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

  // Hash the provided token
  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid reset token
  const user = await User.findOne({
    'passwordReset.token': resetTokenHash,
    'passwordReset.expiresAt': { $gt: new Date() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update password and clear reset token
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

  // Get user with password field
  const user = await User.findById(userId).select('password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  // Check if new password is same as current
  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new ApiError(400, 'New password must be different from current password');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // Update password
  user.password = hashedPassword;
  await user.save();

  return { success: true };
};
