import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ApiError } from '../utils/apiError.js';

const getAdminConfig = () => {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    throw new ApiError(503, 'Admin authentication is not configured');
  }

  return {
    adminEmail,
    adminPasswordHash,
    adminJwtSecret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
    adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '12h',
  };
};

export const loginAdmin = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const { adminEmail, adminPasswordHash, adminJwtSecret, adminJwtExpiresIn } = getAdminConfig();

  const normalizedEmail = email.trim().toLowerCase();
  const isEmailMatch = normalizedEmail === adminEmail;
  const isPasswordMatch = await bcrypt.compare(password, adminPasswordHash);

  if (!isEmailMatch || !isPasswordMatch) {
    throw new ApiError(401, 'Invalid admin credentials');
  }

  if (!adminJwtSecret) {
    throw new ApiError(500, 'Admin token secret is not configured');
  }

  const token = jwt.sign(
    {
      type: 'admin',
      role: 'admin',
      adminEmail,
    },
    adminJwtSecret,
    { expiresIn: adminJwtExpiresIn }
  );

  return {
    token,
    admin: {
      id: 'super-admin',
      name: 'Super Admin',
      email: adminEmail,
      role: 'admin',
    },
  };
};
