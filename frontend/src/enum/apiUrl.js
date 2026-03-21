export const AUTH_API_URLS = {
    LOGIN: '/auth/login',
    GOOGLE_LOGIN: '/auth/google',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
}

export const BLOODBANK_API_URLS = {
    // Public
    GET_ALL_BLOOD_BANKS: '/bloodbanks',
    GET_BLOOD_BANK_BY_ID: (id) => `/bloodbanks/${id}`,
    CREATE_BLOOD_BANK: '/bloodbanks',

    // Auth
    LOGIN_BLOOD_BANK: '/blood-banks/login',
    REGISTER_BLOOD_BANK: '/blood-banks/register',
    FORGOT_PASSWORD: '/blood-banks/forgot-password',
    RESET_PASSWORD: (token) => `/blood-banks/reset-password/${token}`,
    VERIFY_RESET_TOKEN: '/api/blood-banks/verify-reset-token',

    // Dashboard & Profile
    GET_DASHBOARD: '/bloodbank/dashboard',
    GET_PROFILE: '/bloodbank/settings/profile',
    UPDATE_PROFILE: '/bloodbank/settings/profile',
    CHANGE_PASSWORD: '/bloodbank/settings/password',

    // Inventory
    GET_INVENTORY: '/bloodbank/settings/inventory',
    UPDATE_INVENTORY: '/bloodbank/settings/inventory',
    UPDATE_BLOOD_GROUP: (bloodGroup) =>
        `/bloodbank/settings/inventory/${bloodGroup}`,

    // Upload
    UPLOAD_PHOTO: '/bloodbank/settings/photo',
}

export const BLOOD_CAMP_API_URLS = {
    // Public
    GET_ALL_CAMPS: '/blood-camps',
    GET_CAMP_BY_ID: (id) => `/blood-camps/${id}`,
    REGISTER_FOR_CAMP: (id) => `/blood-camps/${id}/register`,

    // Blood Bank Portal
    GET_BLOOD_BANK_CAMPS: '/bloodbank/camps',
    GET_CAMP_REGISTRATIONS: (campId) =>
        `/bloodbank/camps/${campId}/registrations`,

    CREATE_CAMP: '/blood-camps',
    UPDATE_CAMP: (id) => `/blood-camps/${id}`,
    DELETE_CAMP: (id) => `/blood-camps/${id}`,

    DELETE_CAMP_REGISTRATION: (campId, donorId) =>
        `/bloodbank/camps/${campId}/registrations/${donorId}`,
};

export const DONATION_API_URLS = {
    // Donor
    REQUEST_DONATION: '/donations/request',
    GET_MY_DONATIONS: '/donations/my',

    // Blood Bank
    GET_BLOOD_BANK_DONATIONS: '/donations/bank',
    RECORD_DONATION: (donationId) =>
        `/donations/bank/${donationId}/record`,
    UPDATE_DONATION_STATUS: (donationId) =>
        `/donations/bank/${donationId}/status`,
    CREATE_DONATION: '/donations/bank/create',
};

export const EVENT_API_URLS = {
    // Public
    GET_ALL_EVENTS: '/events',
    REGISTER_FOR_EVENT: (id) => `/events/${id}/register`,

    // Blood Bank Portal
    GET_BLOOD_BANK_EVENTS: '/bloodbank/events',
    GET_EVENT_REGISTRATIONS: (eventId) =>
        `/bloodbank/events/${eventId}/registrations`,

    CREATE_EVENT: '/bloodbank/events',
    UPDATE_EVENT: (id) => `/bloodbank/events/${id}`,
    DELETE_EVENT: (id) => `/bloodbank/events/${id}`,

    EXPORT_EVENT_REGISTRATIONS: (id) =>
        `/bloodbank/events/${id}/export-registrations`,
};

export const REQUEST_API_URLS = {
    // Standard User
    GET_ALL_REQUESTS: '/requests',
    GET_MY_REQUESTS: '/requests/my-requests',
    CREATE_REQUEST: '/requests',
    UPDATE_REQUEST: (id) => `/requests/${id}`,
    UPDATE_REQUEST_STATUS_USER: (id) => `/requests/${id}/status`,

    // Blood Bank Portal
    GET_BLOOD_BANK_REQUESTS: '/bloodbank/requests',
    GET_BLOOD_BANK_APPROVED_REQUESTS: '/bloodbank/requests/approved',
    GET_BLOOD_BANK_REQUEST_BY_ID: (id) => `/bloodbank/requests/${id}`,

    CREATE_INTER_BANK_REQUEST: '/bloodbank/requests/inter-bank',
    APPROVE_REQUEST: (id) => `/bloodbank/requests/${id}/approve`,
    REJECT_REQUEST: (id) => `/bloodbank/requests/${id}/reject`,
};

export const USER_API_URLS = {
    // Profile
    GET_PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    UPDATE_DONOR_INFO: '/users/donor-info',

    // Donors
    GET_DONORS: '/users/donors',

    // Mode & Dashboard
    TOGGLE_MODE: '/users/toggle-mode',
    GET_DASHBOARD_STATS: '/users/dashboard/stats',

    // Auth
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: (token) => `/api/auth/reset-password/${token}`,
    VERIFY_RESET_TOKEN: '/api/auth/verify-reset-token',
    CHANGE_PASSWORD: '/api/auth/change-password',
};