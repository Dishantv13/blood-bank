import { getCsrfTokenFromRequest, isStateChangingMethod, validateCsrfToken } from '../utils/authCookies.js';

export const enforceCsrfForRole = (req, role) => {
  if (!isStateChangingMethod(req.method)) return true;

  const { cookieToken, headerToken } = getCsrfTokenFromRequest(req, role);

  // Both tokens must exist
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Tokens must match exactly
  if (cookieToken !== headerToken) {
    return false;
  }

  // Validate token format and age (max 1 hour)
  if (!validateCsrfToken(cookieToken, 3600000)) {
    return false;
  }

  return true;
};
