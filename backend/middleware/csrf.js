import { getCsrfTokenFromRequest, isStateChangingMethod } from '../utils/authCookies.js';

export const enforceCsrfForRole = (req, role) => {
  if (!isStateChangingMethod(req.method)) return true;

  const { cookieToken, headerToken } = getCsrfTokenFromRequest(req, role);
  if (cookieToken && headerToken && cookieToken === headerToken) {
    return true;
  }

  return false;
};
