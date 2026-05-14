import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { TAGS } from "../enum/tagType";
import {
  AUTH_API_URLS,
  BLOODBANK_API_URLS,
  DONATION_API_URLS,
} from "../enum/apiUrl";
import { ROUTE_PATH } from "../enum/routePath";
import { withRefreshMutex } from "../enum/authMutex";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

if (!API_URL) {
  throw new Error(
    "❌ VITE_API_URL environment variable is not configured. Please set it in your .env file.",
  );
}

// SECURITY: Enforce HTTPS in production builds
if (import.meta.env.PROD && !API_URL.startsWith("https://")) {
  throw new Error(
    "❌ SECURITY VIOLATION: Production API must use HTTPS. Current API_URL: " +
      API_URL,
  );
}

const getUrlFromArgs = (args) => {
  if (typeof args === "string") return args;
  if (args && typeof args === "object" && typeof args.url === "string")
    return args.url;
  return "";
};

const getMethodFromArgs = (args) => {
  if (typeof args === "object" && args?.method)
    return String(args.method).toUpperCase();
  return "GET";
};

const isStateChangingMethod = (method) =>
  ["POST", "PUT", "PATCH", "DELETE"].includes(method);

const parseCookie = (name) => {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const isBloodBankPath = (url = "", method = "GET") => {
  const cleanUrl = String(url).split("?")[0].toLowerCase();
  const cleanMethod = String(method || "GET").toUpperCase();
  const bloodBankDashboardPrefix =
    BLOODBANK_API_URLS.GET_DASHBOARD.toLowerCase().split("/dashboard")[0]; // "/bloodbank"

  const isCampPath = cleanUrl.startsWith("/blood-camps");
  const isCampRegistrationPath = /^\/blood-camps\/[^/]+\/register$/.test(
    cleanUrl,
  );
  const isBloodBankCampManagementPath =
    isCampPath && cleanMethod !== "GET" && !isCampRegistrationPath;

  const isStatusUpdate =
    cleanUrl.startsWith("/requests/") && cleanUrl.endsWith("/status");
  const onBloodBankDashboard =
    typeof window !== "undefined" &&
    window.location.pathname.toLowerCase().includes("/blood-bank");

  const isNotificationPath = cleanUrl.startsWith("/notifications");
  const isChatPath = cleanUrl.startsWith("/chats");

  // Specific authentication / blood bank portal routes
  const isBloodBankAuthRoute = 
    cleanUrl === BLOODBANK_API_URLS.LOGIN_BLOOD_BANK.toLowerCase() ||
    cleanUrl === BLOODBANK_API_URLS.REFRESH_BLOOD_BANK.toLowerCase() ||
    cleanUrl === BLOODBANK_API_URLS.LOGOUT_BLOOD_BANK.toLowerCase() ||
    cleanUrl === BLOODBANK_API_URLS.SESSION_BLOOD_BANK.toLowerCase() ||
    cleanUrl === BLOODBANK_API_URLS.CSRF_TOKEN_BLOOD_BANK.toLowerCase() ||
    cleanUrl.startsWith("/blood-banks/register") ||
    cleanUrl.startsWith("/blood-banks/forgot-password") ||
    cleanUrl.startsWith("/blood-banks/reset-password") ||
    cleanUrl.startsWith("/blood-banks/verify-reset-token");

  return (
    isBloodBankCampManagementPath ||
    cleanUrl.startsWith(bloodBankDashboardPrefix) ||
    isBloodBankAuthRoute ||
    cleanUrl.startsWith(
      DONATION_API_URLS.GET_BLOOD_BANK_DONATIONS.toLowerCase(),
    ) ||
    cleanUrl.startsWith("/blood-unit") ||
    ((isNotificationPath || isChatPath) && onBloodBankDashboard) ||
    (cleanUrl.startsWith("/requests") &&
      (cleanUrl.includes("blood-bank") ||
        cleanUrl.includes("fulfill") ||
        (isStatusUpdate && onBloodBankDashboard)))
  );
};

const isAdminPath = (url = "") => {
  const cleanUrl = String(url).split("?")[0].toLowerCase();
  return cleanUrl.startsWith("/admin");
};

const isAdminAuthPath = (url = "") => {
  const cleanUrl = String(url).split("?")[0].toLowerCase();
  return cleanUrl.startsWith("/admin-auth");
};

const getRoleFromUrl = (url = "", method = "GET") => {
  if (isBloodBankPath(url, method)) return "bloodbank";
  if (isAdminPath(url) || isAdminAuthPath(url)) return "admin";
  return "user";
};

const getCsrfCookieName = (role) => {
  if (role === "admin") return "bb_admin_csrf";
  if (role === "bloodbank") return "bb_bank_csrf";
  return "bb_user_csrf";
};

const getCsrfEndpoint = (role) => {
  if (role === "admin") return AUTH_API_URLS.ADMIN_CSRF_TOKEN;
  if (role === "bloodbank") return BLOODBANK_API_URLS.CSRF_TOKEN_BLOOD_BANK;
  return AUTH_API_URLS.CSRF_TOKEN;
};

const getRefreshEndpoint = (role) => {
  if (role === "admin") return AUTH_API_URLS.ADMIN_REFRESH;
  if (role === "bloodbank") return BLOODBANK_API_URLS.REFRESH_BLOOD_BANK;
  return AUTH_API_URLS.REFRESH;
};

const getLoginPath = (role) => {
  if (role === "admin") return ROUTE_PATH.ADMIN_LOGIN;
  if (role === "bloodbank") return ROUTE_PATH.BLOOD_BANK_LOGIN;
  return ROUTE_PATH.LOGIN;
};

const isLoginOrAuthMutationPath = (url = "") => {
  const cleanUrl = String(url).split("?")[0].toLowerCase();
  return (
    cleanUrl === AUTH_API_URLS.LOGIN.toLowerCase() ||
    cleanUrl === AUTH_API_URLS.REGISTER.toLowerCase() ||
    cleanUrl === AUTH_API_URLS.ADMIN_LOGIN.toLowerCase() ||
    cleanUrl === BLOODBANK_API_URLS.LOGIN_BLOOD_BANK.toLowerCase() ||
    cleanUrl.startsWith("/auth/forgot-password") ||
    cleanUrl.startsWith("/auth/reset-password") ||
    cleanUrl.startsWith("/auth/verify-reset-token") ||
    cleanUrl.startsWith("/blood-banks/forgot-password") ||
    cleanUrl.startsWith("/blood-banks/reset-password") ||
    cleanUrl.startsWith("/blood-banks/verify-reset-token")
  );
};

const normalizeApiPayload = (rawResponse) => {
  // If result is a Blob (file download), return it as is to avoid wrapping
  if (rawResponse instanceof Blob) return rawResponse;

  const isObject =
    rawResponse &&
    typeof rawResponse === "object" &&
    !Array.isArray(rawResponse);
  const isWrappedSuccess =
    isObject &&
    Object.prototype.hasOwnProperty.call(rawResponse, "success") &&
    Object.prototype.hasOwnProperty.call(rawResponse, "data");

  const payload = isWrappedSuccess ? rawResponse.data : rawResponse;
  const meta = isWrappedSuccess
    ? { success: rawResponse.success, message: rawResponse.message }
    : {};

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    let normalizedData;
    if (Object.prototype.hasOwnProperty.call(payload, "data")) {
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
      pagination,
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
  credentials: "include",
  prepareHeaders: (headers, { arg }) => {
    const method = getMethodFromArgs(arg);
    const url = getUrlFromArgs(arg);
    const isFormData = arg && arg.body instanceof FormData;

    if (!isFormData) {
      headers.set("Content-Type", "application/json");
    }

    // SECURE: Always attempt to attach the CSRF token from cookies if it exists.
    // This is critical for the initial /session check and /refresh after a Google OAuth redirect.
    const role = getRoleFromUrl(url, method);
    const csrfToken = parseCookie(getCsrfCookieName(role));
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }

    return headers;
  },
});

const removeRoleState = (_role) => {};

const isLogoutInProgress = () =>
  typeof window !== "undefined" && window.__AUTH_LOGOUT_IN_PROGRESS__ === true;

const isLogoutPath = (url = "") => {
  const cleanUrl = String(url).split("?")[0].toLowerCase();
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
      message: "Request skipped because logout is in progress.",
    },
  },
});

const runRefreshForRole = async (role, api, extraOptions) => {
  return withRefreshMutex(role, async () => {
    const csrfCookie = parseCookie(getCsrfCookieName(role));
    if (!csrfCookie) {
      await baseQuery(
        { url: getCsrfEndpoint(role), method: "GET" },
        api,
        extraOptions,
      );
    }

    let refreshResult = await baseQuery(
      { url: getRefreshEndpoint(role), method: "POST" },
      api,
      extraOptions,
    );

    // Refresh can itself fail on stale CSRF cookie; renew token and retry once.
    if (isCsrfError(refreshResult)) {
      await baseQuery(
        { url: getCsrfEndpoint(role), method: "GET" },
        api,
        extraOptions,
      );
      refreshResult = await baseQuery(
        { url: getRefreshEndpoint(role), method: "POST" },
        api,
        extraOptions,
      );
    }

    return refreshResult;
  });
};

const isCsrfError = (result) => {
  const status = result?.error?.status;
  const message = String(result?.error?.data?.message || "").toLowerCase();
  return status === 403 && message.includes("csrf");
};

const baseQueryWithReauth = async (args, api, extraOptions) => {
  const requestUrl = getUrlFromArgs(args);
  const requestMethod = getMethodFromArgs(args);
  const requestRole = getRoleFromUrl(requestUrl, requestMethod);
  const currentPath = window.location.pathname.toLowerCase();
  const logoutInProgress = isLogoutInProgress();

  // Prevent any extra API traffic while logout is running.
  if (logoutInProgress && !isLogoutPath(requestUrl)) {
    return buildSkippedDuringLogoutError();
  }

  let result = await baseQuery(args, api, extraOptions);

  // If CSRF is missing/expired, fetch a new token and retry state-changing calls once.
  if (isStateChangingMethod(requestMethod) && isCsrfError(result)) {
    await baseQuery(
      { url: getCsrfEndpoint(requestRole), method: "GET" },
      api,
      extraOptions,
    );
    result = await baseQuery(args, api, extraOptions);
  }

  if (
    result.error &&
    (result.error.status === 401 ||
      (result.error.status === 403 && !isCsrfError(result)))
  ) {
    if (logoutInProgress && !isLogoutPath(requestUrl)) {
      return result;
    }

    const isRefreshCall = requestUrl.toLowerCase().includes("/refresh");
    const skipReauthForThisCall = isLoginOrAuthMutationPath(requestUrl);
    const isSessionCheck = requestUrl.toLowerCase().includes("/session");
    const onAuthPage =
      currentPath === ROUTE_PATH.LOGIN.toLowerCase() ||
      currentPath === ROUTE_PATH.BLOOD_BANK_LOGIN.toLowerCase() ||
      currentPath === ROUTE_PATH.ADMIN_LOGIN.toLowerCase() ||
      currentPath === ROUTE_PATH.FORGOT_PASSWORD.toLowerCase() ||
      currentPath === ROUTE_PATH.RESET_PASSWORD.toLowerCase() ||
      currentPath === ROUTE_PATH.BLOOD_BANK_FORGOT_PASSWORD.toLowerCase() ||
      currentPath === ROUTE_PATH.BLOOD_BANK_RESET_PASSWORD.toLowerCase();

    if (
      !isRefreshCall &&
      !skipReauthForThisCall &&
      !(isSessionCheck && onAuthPage)
    ) {
      const refreshResult = await runRefreshForRole(
        requestRole,
        api,
        extraOptions,
      );

      if (refreshResult.data) {
        result = await baseQuery(args, api, extraOptions);
      } else {
        const onAdminRoute = currentPath.startsWith("/admin");
        const onBloodBankRoute = currentPath.startsWith("/blood-bank");

        removeRoleState(requestRole);
        api.dispatch(apiSlice.util.resetApiState());

        if (
          (requestRole === "admin" && onAdminRoute) ||
          (requestRole === "bloodbank" && onBloodBankRoute) ||
          (requestRole === "user" && !onAdminRoute && !onBloodBankRoute)
        ) {
          const target = getLoginPath(requestRole);
          if (
            !window.location.pathname
              .toLowerCase()
              .startsWith(target.toLowerCase())
          ) {
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
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: Object.values(TAGS),
  // Keep data reasonably fresh across tabs/devices while still benefiting from cache.
  keepUnusedDataFor: 120,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: 30,
  endpoints: () => ({}),
});
