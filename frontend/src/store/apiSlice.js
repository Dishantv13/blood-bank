import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { TAGS } from '../enum/tagType';
import { AUTH_API_URLS, BLOODBANK_API_URLS, DONATION_API_URLS } from '../enum/apiUrl';
import { ROUTE_PATH } from '../enum/routePath';

// Enforce HTTPS in production - prevent insecure connections
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

if (!API_URL) {
  throw new Error('❌ VITE_API_URL environment variable is not configured. Please set it in your .env file.');
}

// SECURITY: Enforce HTTPS in production builds
if (import.meta.env.PROD && !API_URL.startsWith('https://')) {
  throw new Error('❌ SECURITY VIOLATION: Production API must use HTTPS. Current API_URL: ' + API_URL);
}

console.info('🔗 API URL configured:', API_URL);

const getUrlFromArgs = (args) => {
  if (typeof args === 'string') return args;
  if (args && typeof args === 'object' && typeof args.url === 'string') return args.url;
  return '';
};

const getMethodFromArgs = (args) => {
  if (typeof args === 'object' && args?.method) return String(args.method).toUpperCase();
  return 'GET';
};

const isStateChangingMethod = (method) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

const parseCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const isBloodBankPath = (url = '') => {
  const cleanUrl = String(url).split('?')[0].toLowerCase();
  const bloodBankDashboardPrefix = BLOODBANK_API_URLS.GET_DASHBOARD.toLowerCase().split('/dashboard')[0];
  return (
    cleanUrl.startsWith(bloodBankDashboardPrefix) ||
    cleanUrl.startsWith(BLOODBANK_API_URLS.LOGIN_BLOOD_BANK.toLowerCase().split('/login')[0]) ||
    cleanUrl.startsWith(DONATION_API_URLS.GET_BLOOD_BANK_DONATIONS.toLowerCase())
  );
};

const isAdminPath = (url = '') => {
  const cleanUrl = String(url).split('?')[0].toLowerCase();
  return cleanUrl.startsWith('/admin');
};

const isAdminAuthPath = (url = '') => {
  const cleanUrl = String(url).split('?')[0].toLowerCase();
  return cleanUrl.startsWith('/admin-auth');
};

const getRoleFromUrl = (url = '') => {
  if (isBloodBankPath(url)) return 'bloodbank';
  if (isAdminPath(url) || isAdminAuthPath(url)) return 'admin';
  return 'user';
};

const getCsrfCookieName = (role) => {
  if (role === 'admin') return 'bb_admin_csrf';
  if (role === 'bloodbank') return 'bb_bank_csrf';
  return 'bb_user_csrf';
};

const getCsrfEndpoint = (role) => {
  if (role === 'admin') return AUTH_API_URLS.ADMIN_CSRF_TOKEN;
  if (role === 'bloodbank') return BLOODBANK_API_URLS.CSRF_TOKEN_BLOOD_BANK;
  return AUTH_API_URLS.CSRF_TOKEN;
};

const getRefreshEndpoint = (role) => {
  if (role === 'admin') return AUTH_API_URLS.ADMIN_REFRESH;
  if (role === 'bloodbank') return BLOODBANK_API_URLS.REFRESH_BLOOD_BANK;
  return AUTH_API_URLS.REFRESH;
};

const getLoginPath = (role) => {
  if (role === 'admin') return ROUTE_PATH.ADMIN_LOGIN;
  if (role === 'bloodbank') return ROUTE_PATH.BLOOD_BANK_LOGIN;
  return ROUTE_PATH.LOGIN;
};

const isAuthBootstrapOrLoginPath = (url = '') => {
  const cleanUrl = String(url).split('?')[0].toLowerCase();
  return (
    cleanUrl === AUTH_API_URLS.LOGIN.toLowerCase() ||
    cleanUrl === AUTH_API_URLS.REGISTER.toLowerCase() ||
    cleanUrl === AUTH_API_URLS.GOOGLE_LOGIN.toLowerCase() ||
    cleanUrl === AUTH_API_URLS.ADMIN_LOGIN.toLowerCase() ||
    cleanUrl === BLOODBANK_API_URLS.LOGIN_BLOOD_BANK.toLowerCase() ||
    cleanUrl.endsWith('/session')
  );
};

const normalizeApiPayload = (rawResponse) => {
  const isObject = rawResponse && typeof rawResponse === 'object' && !Array.isArray(rawResponse);
  const isWrappedSuccess =
    isObject &&
    Object.prototype.hasOwnProperty.call(rawResponse, 'success') &&
    Object.prototype.hasOwnProperty.call(rawResponse, 'data');

  const payload = isWrappedSuccess ? rawResponse.data : rawResponse;
  const meta = isWrappedSuccess
    ? { success: rawResponse.success, message: rawResponse.message }
    : {};

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    let normalizedData;
    if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
      normalizedData = payload.data;
    } else if (Array.isArray(payload.requests)) {
      normalizedData = payload.requests;
    } else if (Array.isArray(payload.events)) {
      normalizedData = payload.events;
    } else if (Array.isArray(payload.camps)) {
      normalizedData = payload.camps;
    } else {
      normalizedData = payload;
    }

    const { pagination, ...payloadWithoutPagination } = payload;

    return {
      ...meta,
      ...payloadWithoutPagination,
      data: normalizedData,
    };
  }

  return {
    ...meta,
    data: payload,
  };
};

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: (headers, { arg }) => {
    const method = getMethodFromArgs(arg);
    const isFormData = arg && arg.body instanceof FormData;

    if (!isFormData) {
      headers.set('Content-Type', 'application/json');
    }

    if (isStateChangingMethod(method)) {
      const role = getRoleFromUrl(getUrlFromArgs(arg));
      const csrfToken = parseCookie(getCsrfCookieName(role));
      if (csrfToken) {
        headers.set('x-csrf-token', csrfToken);
      }
    }

    return headers;
  },
});

const removeRoleState = (_role) => {};

const isLogoutInProgress = () =>
  typeof window !== 'undefined' && window.__AUTH_LOGOUT_IN_PROGRESS__ === true;

const isLogoutPath = (url = '') => {
  const cleanUrl = String(url).split('?')[0].toLowerCase();
  return (
    cleanUrl === AUTH_API_URLS.LOGOUT.toLowerCase() ||
    cleanUrl === AUTH_API_URLS.ADMIN_LOGOUT.toLowerCase() ||
    cleanUrl === BLOODBANK_API_URLS.LOGOUT_BLOOD_BANK.toLowerCase()
  );
};

const buildSkippedDuringLogoutError = () => ({
  error: {
    status: 499,
    data: {
      success: false,
      message: 'Request skipped because logout is in progress.',
    },
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const requestUrl = getUrlFromArgs(args);
  const requestRole = getRoleFromUrl(requestUrl);
  const currentPath = window.location.pathname.toLowerCase();
  const logoutInProgress = isLogoutInProgress();

  // Prevent any extra API traffic while logout is running.
  if (logoutInProgress && !isLogoutPath(requestUrl)) {
    return buildSkippedDuringLogoutError();
  }

  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (logoutInProgress && !isLogoutPath(requestUrl)) {
      return result;
    }

    const isRefreshCall = requestUrl.toLowerCase().includes('/refresh');
    const skipReauthForThisCall = isAuthBootstrapOrLoginPath(requestUrl);

    if (!isRefreshCall && !skipReauthForThisCall) {
      const csrfCookie = parseCookie(getCsrfCookieName(requestRole));
      if (!csrfCookie) {
        await baseQuery({ url: getCsrfEndpoint(requestRole), method: 'GET' }, api, extraOptions);
      }

      const refreshResult = await baseQuery(
        { url: getRefreshEndpoint(requestRole), method: 'POST' },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        result = await baseQuery(args, api, extraOptions);
      } else {
        const onAdminRoute = currentPath.startsWith('/admin');
        const onBloodBankRoute = currentPath.startsWith('/blood-bank');

        removeRoleState(requestRole);
        api.dispatch(apiSlice.util.resetApiState());

        if ((requestRole === 'admin' && onAdminRoute) ||
            (requestRole === 'bloodbank' && onBloodBankRoute) ||
            (requestRole === 'user' && !onAdminRoute && !onBloodBankRoute)) {
          const target = getLoginPath(requestRole);
          if (!window.location.pathname.toLowerCase().startsWith(target.toLowerCase())) {
            window.location.replace(target);
          }
        }
      }
    }
  }

  if (result.data !== undefined) {
    result.data = normalizeApiPayload(result.data);
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: Object.values(TAGS),
  endpoints: () => ({}),
});
