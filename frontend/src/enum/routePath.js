export const ROUTE_PATH = {
  // Common & Auth
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  CHANGE_PASSWORD: "/change-password",
  DASHBOARD: "/dashboard",
  PROFILE: "/profile",
  DONOR_FORM: "/donor-form",

  // User Section
  BLOOD_BANKS: "/blood-banks",
  DONORS: "/donors",
  EVENTS: "/events",
  EVENT_DETAILS: "/events/:eventId",
  CREATE_REQUEST: "/create-request",
  REQUEST_DETAILS: "/requests/:requestId", // Added for consistency

  // Blood Bank specific
  BLOOD_BANK_BASE: "/blood-bank",
  BLOOD_BANK_LOGIN: "/blood-bank/login",
  BLOOD_BANK_REGISTER: "/blood-bank/register",
  BLOOD_BANK_DASHBOARD: "/blood-bank/dashboard",
  BLOOD_BANK_FORGOT_PASSWORD: "/blood-bank/forgot-password",
  BLOOD_BANK_RESET_PASSWORD: "/blood-bank/reset-password",
  BLOOD_BANK_CHANGE_PASSWORD: "/blood-bank/change-password",
  BLOOD_BANK_DETAILS: "/blood-bank/banks/:bankId",

  // Admin section
  ADMIN_LOGIN: "/admin/login",
  ADMIN_BASE: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard", 
  ADMIN_USERS: "/admin/users",
  ADMIN_BLOOD_BANKS: "/admin/bloodbanks",
  ADMIN_CAMPS: "/admin/camps",
  ADMIN_CAMPS_BY_BANK: "/admin/camps/bloodbank/:bankId",
  ADMIN_EVENTS: "/admin/events",
  ADMIN_EVENTS_BY_BANK: "/admin/events/bloodbank/:bankId",
  ADMIN_REQUESTS: "/admin/requests",
  ADMIN_REQUESTS_BY_USER: "/admin/requests/user/:userId",
  ADMIN_DONATIONS: "/admin/donations",
  ADMIN_DONATIONS_BY_USER: "/admin/donations/user/:userId",
  ADMIN_INVENTORY: "/admin/inventory",
  ADMIN_INVENTORY_DETAILS: "/admin/inventory/:inventoryId",
  ADMIN_EXPORTS: "/admin/exports",

  // Wildcard
  WILDCARD: "*",
};
