import bcrypt from 'bcryptjs';
import { ApiError } from '../utils/apiError.js';
import {
  clearAuthCookies,
  generateCsrfToken,
  getCookieNamesForRole,
  getRefreshTokenFromRequest,
  setAuthCookies,
  verifyRefreshToken,
} from '../utils/authCookies.js';
import { enforceCsrfForRole } from '../middleware/csrf.js';

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

  return {
    admin: {
      id: 'super-admin',
      name: 'Super Admin',
      email: adminEmail,
      role: 'admin',
    },
    tokenClaims: {
      type: 'admin',
      role: 'admin',
      adminEmail,
    },
    tokenTtl: adminJwtExpiresIn,
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

export const issueAdminCsrfToken = (res) => {
  const { csrfCookie } = getCookieNamesForRole('admin');
  const csrfToken = generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
  });

  return { csrfToken };
};

export const loginAdminWithSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginAdmin(email, password);
  const { csrfToken } = setAuthCookies(res, 'admin', result.tokenClaims);
  return { admin: result.admin, csrfToken };
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
  const { csrfToken } = setAuthCookies(res, 'admin', {
    type: 'admin',
    role: 'admin',
    adminEmail: decoded.adminEmail,
  });

  const session = await getSessionAdmin();
  return { ...session, csrfToken };
};

export const logoutAdminSession = async (req, res) => {
  if (!enforceCsrfForRole(req, 'admin')) {
    throw new ApiError(403, 'Invalid or missing CSRF token');
  }
  clearAuthCookies(res, 'admin');
  return { success: true };
};
