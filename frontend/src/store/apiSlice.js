import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { TAGS } from '../enum/tagType';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getUrlFromArgs = (args) => {
  if (typeof args === 'string') return args;
  if (args && typeof args === 'object' && typeof args.url === 'string') return args.url;
  return '';
};

const isBloodBankPath = (url = '') => {
  const cleanUrl = String(url).split('?')[0].toLowerCase();
  return cleanUrl.startsWith('/bloodbank') || cleanUrl.startsWith('/donations/bank');
};

const isAdminPath = (url = '') => {
  const cleanUrl = String(url).split('?')[0].toLowerCase();
  return cleanUrl.startsWith('/admin');
};

const isAdminAuthPath = (url = '') => {
  const cleanUrl = String(url).split('?')[0].toLowerCase();
  return cleanUrl.startsWith('/admin-auth');
};

// Create base query with auth headers setup
const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { arg }) => {
    headers.set('Content-Type', 'application/json');

    const requestUrl = getUrlFromArgs(arg);
    const isBloodBankEndpoint = isBloodBankPath(requestUrl);
    const isAdminEndpoint = isAdminPath(requestUrl) && !isAdminAuthPath(requestUrl);

    if (isBloodBankEndpoint) {
      const bToken = localStorage.getItem('bloodBankToken');
      if (bToken) headers.set('authorization', `Bearer ${bToken}`);
    } else if (isAdminEndpoint) {
      const aToken = localStorage.getItem('adminToken');
      if (aToken) headers.set('authorization', `Bearer ${aToken}`);
    } else {
      // Standard user endpoints
      const uToken = localStorage.getItem('token');
      if (uToken) headers.set('authorization', `Bearer ${uToken}`);
    }

    return headers;
  },
});

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

// Custom wrapper to handle 401 unauth auto-logouts across all endpoints
const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const requestUrl = getUrlFromArgs(args);
    const isBloodBankEndpoint = isBloodBankPath(requestUrl);
    const isAdminEndpoint = isAdminPath(requestUrl) && !isAdminAuthPath(requestUrl);
    const currentPath = window.location.pathname.toLowerCase();
    const onAdminRoute = currentPath.startsWith('/admin');
    const onBloodBankRoute = currentPath.startsWith('/blood-bank');

    if (isBloodBankEndpoint) {
      if (onAdminRoute) {
        return result;
      }
      localStorage.removeItem('bloodBankToken');
      localStorage.removeItem('bloodBankData');
      localStorage.removeItem('bloodBankUser');
      // Dispatch reset to invalidate all cached data
      api.dispatch(apiSlice.util.resetApiState());
      // Let PrivateRoute handle the redirect
      if (!window.location.pathname.includes('/blood-bank/login')) {
        window.location.replace('/blood-bank/login');
      }
    } else if (isAdminEndpoint) {
      if (onBloodBankRoute) {
        return result;
      }
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      // Dispatch reset to invalidate all cached data
      api.dispatch(apiSlice.util.resetApiState());
      // Let PrivateRoute handle the redirect
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.replace('/admin/login');
      }
    } else {
      if (onAdminRoute || onBloodBankRoute) {
        return result;
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Dispatch reset to invalidate all cached data
      api.dispatch(apiSlice.util.resetApiState());
      // Let PrivateRoute handle the redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }
  }

  if (result.data !== undefined) {
    result.data = normalizeApiPayload(result.data);
  }

  return result;
};

// Initialize an empty api service that we'll inject endpoints into later
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: Object.values(TAGS), // Register all possible tags
  endpoints: () => ({}), // Start empty, inject across different files
});
