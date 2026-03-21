import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User from '../models/User.model.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';
import { asyncHandler } from "../utils/asynchandler.js";
import { successResponse, errorResponse } from '../utils/response.js';

// Register a new user
const register = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, bloodGroup, isDonor, address } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      bloodGroup,
      isDonor: isDonor || false,
      address
    });

    await user.save();

    // Create JWT token
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bloodGroup: user.bloodGroup,
        role: user.role,
        isDonor: user.isDonor
      }
    });
});

// Login user
const login = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bloodGroup: user.bloodGroup,
        role: user.role,
        isDonor: user.isDonor
      }
    });
});

// Google OAuth login
const googleLogin = asyncHandler(async (req, res) => {
    const { email, name, googleId, photoURL } = req.body;

    if (!email || !name || !googleId) {
      return res.status(400).json({ message: 'Missing required Google user data' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user from Google data
      user = new User({
        name,
        email,
        googleId,
        photoURL,
        password: await bcrypt.hash(Math.random().toString(36), 10), // Random password
        phone: '', // Will need to be updated by user
        bloodGroup: 'O+', // Default, user can update
        isDonor: false,
        address: {
          street: '',
          city: '',
          state: '',
          pincode: ''
        }
      });

      await user.save();
    } else if (!user.googleId) {
      // Link Google account to existing user
      user.googleId = googleId;
      user.photoURL = photoURL;
      await user.save();
    }

    // Create JWT token
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bloodGroup: user.bloodGroup,
        role: user.role,
        isDonor: user.isDonor,
        photoURL: user.photoURL
      }
    });
});

// Send password reset email
const forgotPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({ 
        message: 'If an account exists with this email, you will receive a password reset link shortly' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiration (1 hour)
    user.passwordReset = {
      token: resetTokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    };

    await user.save();

    // Send email with reset token
    try {
      await sendPasswordResetEmail(email, resetToken, 'user');
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Still return success to user, but log the error
      return res.status(500).json({ 
        message: 'Failed to send reset email. Please try again later.' 
      });
    }

    res.status(200).json({ 
      message: 'Password reset email sent successfully. Please check your email.' 
    });
});

// Reset password using token
const resetPassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    // Hash the provided token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      'passwordReset.token': resetTokenHash,
      'passwordReset.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token' 
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordReset = undefined;

    await user.save();

    res.status(200).json({ 
      message: 'Password reset successful. You can now login with your new password.' 
    });
});

// Verify reset token
const verifyResetToken = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.body;

    // Hash the provided token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Check if token exists and is not expired
    const user = await User.findOne({
      'passwordReset.token': resetTokenHash,
      'passwordReset.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        valid: false,
        message: 'Invalid or expired reset token' 
      });
    }

    res.status(200).json({ 
      valid: true,
      message: 'Token is valid' 
    });
});

// Change password for authenticated user
const changePassword = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ 
      message: 'Password changed successfully' 
    });
});


export {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  changePassword
}