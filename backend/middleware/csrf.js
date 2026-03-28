import { getCsrfTokenFromRequest, isStateChangingMethod } from '../utils/authCookies.js';

const getTrustedOrigins = () => {
  const envOrigins = String(process.env.FRONTEND_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return [
    ...envOrigins,
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ''));
};

const isTrustedOrigin = (req) => {
  const origin = String(req.get('origin') || '').replace(/\/$/, '');
  if (!origin) return false;
  return getTrustedOrigins().includes(origin);
};

export const enforceCsrfForRole = (req, role, options = {}) => {
  if (!isStateChangingMethod(req.method)) return true;

  const { cookieToken, headerToken } = getCsrfTokenFromRequest(req, role);
  if (cookieToken && headerToken && cookieToken === headerToken) {
    return true;
  }

  if (options.allowTrustedOriginFallback && cookieToken && isTrustedOrigin(req)) {
    return true;
  }

  return false;
};
