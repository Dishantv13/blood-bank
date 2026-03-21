import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { TAGS } from '../enum/tagType';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper to identify bloodbank portal endpoints for correct token attachment and logout handling
const checkIsBloodBankEndpoint = (endpoint) => {
  if (!endpoint) return false;
  // Use a more specific check. Blood bank portal endpoints typically 
  // explicitly use the bloodbank route prefix or include 'bloodbank' in the endpoint name.
  const name = endpoint.toLowerCase();

  // These specific endpoints are clearly for the Blood Bank Portal
  if (name.includes('bloodbank') ||
    name.includes('getbloodbank') ||
    name.includes('createcamp') ||
    name.includes('createevent') ||
    name.includes('updatecamp') ||
    name.includes('updateevent') ||
    name.includes('deletecamp') ||
    name.includes('deleteevent') ||
    name.includes('getcampregistrations') ||
    name.includes('geteventregistrations') ||
    name.includes('exporteventregistrations') ||
    name.includes('exportcampregistrations') ||
    name.includes('exportregistrations') ||
    name.includes('approverequest') ||
    name.includes('rejectrequest') ||
    name.includes('interbankrequest') ||
    name.includes('inventory') ||
    name.includes('bloodgroup') ||
    name.includes('getbloodbankdonations') ||
    name.includes('recorddonation') ||
    name.includes('updatedonationstatus') ||
    name.includes('createdonation')) {
    return true;
  }

  // If it's a general camp/event/request endpoint, it might be for a standard user.
  // We check if it explicitly starts with 'bloodbank' in the URL context
  return false;
};

// Create base query with auth headers setup
const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { endpoint }) => {
    headers.set('Content-Type', 'application/json');

    // Detect if this is a bloodbank portal endpoint
    const isBloodBankEndpoint = checkIsBloodBankEndpoint(endpoint);

    if (isBloodBankEndpoint) {
      const bToken = localStorage.getItem('bloodBankToken');
      if (bToken) headers.set('authorization', `Bearer ${bToken}`);
    } else {
      // Standard user endpoints
      const uToken = localStorage.getItem('token');
      if (uToken) headers.set('authorization', `Bearer ${uToken}`);
    }

    return headers;
  },
});

// Custom wrapper to handle 401 unauth auto-logouts across all endpoints
const baseQueryWithReauth = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Detect if this is a bloodbank portal endpoint
    const isBloodBankEndpoint = checkIsBloodBankEndpoint(api.endpoint);

    if (isBloodBankEndpoint) {
      localStorage.removeItem('bloodBankToken');
      localStorage.removeItem('bloodBankData');
      localStorage.removeItem('bloodBankUser');
      if (!window.location.pathname.includes('/blood-bank/login')) {
        window.location.href = '/blood-bank/login';
      }
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
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
