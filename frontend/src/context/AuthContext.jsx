import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  useAdminLoginMutation,
  useLoginMutation,
  useRegisterMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useLogoutMutation,
  useRefreshSessionMutation,
  useAdminLogoutMutation,
  useRefreshAdminSessionMutation,
  useLazyGetUserSessionQuery,
  useLazyGetAdminSessionQuery,
} from "../store/authApi";
import {
  useLazyGetBloodBankSessionQuery,
  useLogoutBloodBankMutation,
  useRefreshBloodBankSessionMutation,
} from "../store/bloodBankApi";
import { useDispatch } from "react-redux";
import { apiSlice } from "../store/apiSlice";
import {
  withRefreshMutex,
  syncAuthAction,
  onAuthSync,
} from "../enum/authMutex";
import { AUTH_API_URLS } from "../enum/apiUrl";

const AuthContext = createContext();
const REFRESH_BUFFER_MS = 2 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 5 * 1000;
const EXPIRY_CHECK_ON_FOCUS_MS = 3 * 60 * 1000;

const isBloodBankPortalRoute = (path = "") => {
  const currentPath = String(path || "").toLowerCase();
  return (
    currentPath === "/blood-bank" ||
    currentPath.startsWith("/blood-bank/") ||
    currentPath === "/bloodbank" ||
    currentPath.startsWith("/bloodbank/")
  );
};

const getActivePortal = () => {
  if (typeof window === "undefined") return "user";
  const currentPath = window.location.pathname.toLowerCase();
  if (currentPath.startsWith("/admin")) return "admin";
  if (isBloodBankPortalRoute(currentPath)) return "bloodbank";
  return "user";
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [adminUser, setAdminUserState] = useState(null);
  const [bloodBank, setBloodBankState] = useState(null);
  const [userAccessTokenExpiresAt, setUserAccessTokenExpiresAt] =
    useState(null);
  const [adminAccessTokenExpiresAt, setAdminAccessTokenExpiresAt] =
    useState(null);
  const [bloodBankAccessTokenExpiresAt, setBloodBankAccessTokenExpiresAt] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const refreshTimeoutsRef = useRef({
    user: null,
    admin: null,
    bloodbank: null,
  });

  const [adminLoginMutation] = useAdminLoginMutation();
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [verifyOtpMutation] = useVerifyOtpMutation();
  const [resendOtpMutation] = useResendOtpMutation();
  const [logoutMutation] = useLogoutMutation();
  const [refreshSessionMutation] = useRefreshSessionMutation();
  const [adminLogoutMutation] = useAdminLogoutMutation();
  const [refreshAdminSessionMutation] = useRefreshAdminSessionMutation();
  const [logoutBloodBankMutation] = useLogoutBloodBankMutation();
  const [refreshBloodBankSessionMutation] =
    useRefreshBloodBankSessionMutation();
  const [triggerUserSession] = useLazyGetUserSessionQuery();
  const [triggerAdminSession] = useLazyGetAdminSessionQuery();
  const [triggerBloodBankSession] = useLazyGetBloodBankSessionQuery();

  // SECURITY FIX: Store in memory only, not localStorage
  // httpOnly cookies handle authentication persistence
  const setUser = useCallback((userData) => {
    setUserState(userData);
    // Note: Tokens are in httpOnly cookies managed by backend
  }, []);

  const setAdminUser = useCallback((adminData) => {
    setAdminUserState(adminData);
    // Note: Tokens are in httpOnly cookies managed by backend
  }, []);

  const setBloodBank = useCallback((bloodBankData) => {
    setBloodBankState(bloodBankData);
    // Note: Tokens are in httpOnly cookies managed by backend
  }, []);

  const clearRefreshTimeout = useCallback((role) => {
    const timerId = refreshTimeoutsRef.current[role];
    if (timerId) {
      clearTimeout(timerId);
      refreshTimeoutsRef.current[role] = null;
    }
  }, []);

  const clearAllRefreshTimeouts = useCallback(() => {
    clearRefreshTimeout("user");
    clearRefreshTimeout("admin");
    clearRefreshTimeout("bloodbank");
  }, [clearRefreshTimeout]);

  const applyUserSession = useCallback(
    (sessionData) => {
      if (!sessionData) return;
      setUser(sessionData.user || sessionData.data || sessionData);
      if (sessionData.accessTokenExpiresAt) {
        setUserAccessTokenExpiresAt(sessionData.accessTokenExpiresAt);
      }
    },
    [setUser],
  );

  const applyAdminSession = useCallback(
    (sessionData) => {
      if (!sessionData) return;
      setAdminUser(sessionData.admin || sessionData.data || sessionData);
      if (sessionData.accessTokenExpiresAt) {
        setAdminAccessTokenExpiresAt(sessionData.accessTokenExpiresAt);
      }
    },
    [setAdminUser],
  );

  const applyBloodBankSession = useCallback(
    (sessionData) => {
      if (!sessionData) return;
      setBloodBank(sessionData.bloodBank || sessionData.data || sessionData);
      if (sessionData.accessTokenExpiresAt) {
        setBloodBankAccessTokenExpiresAt(sessionData.accessTokenExpiresAt);
      }
    },
    [setBloodBank],
  );

  const clearRoleSession = useCallback(
    (role) => {
      clearRefreshTimeout(role);

      if (role === "admin") {
        setAdminUser(null);
        setAdminAccessTokenExpiresAt(null);
        return;
      }

      if (role === "bloodbank") {
        setBloodBank(null);
        setBloodBankAccessTokenExpiresAt(null);
        return;
      }

      setUser(null);
      setUserAccessTokenExpiresAt(null);
    },
    [clearRefreshTimeout, setAdminUser, setBloodBank, setUser],
  );

  const silentlyRefreshRole = useCallback(
    async (role) => {
      // SECURITY FIX: Prevent cross-portal refresh API calls
      const activePortal = getActivePortal();
      if (role !== activePortal) return false;

      return withRefreshMutex(role, async () => {
        try {
          if (role === "admin") {
            const response = await refreshAdminSessionMutation().unwrap();
            applyAdminSession(response);
            syncAuthAction("admin", "refresh", response);
            return true;
          }

          if (role === "bloodbank") {
            const response = await refreshBloodBankSessionMutation().unwrap();
            applyBloodBankSession(response);
            syncAuthAction("bloodbank", "refresh", response);
            return true;
          }

          const response = await refreshSessionMutation().unwrap();
          applyUserSession(response);
          syncAuthAction("user", "refresh", response);
          return true;
        } catch (error) {
          // Only clear session on 401 (Unauthorized) or 403 (Forbidden)
          // Temporary 500 or network errors should NOT log the user out.
          const status = error?.status || error?.error?.status;
          const isAuthError = status === 401 || status === 403;

          if (isAuthError) {
            clearRoleSession(role);
            dispatch(apiSlice.util.resetApiState());
            syncAuthAction(role, "logout");
            return false;
          }

          // Return null to signify a retryable/temporary error
          return null;
        }
      });
    },
    [
      applyAdminSession,
      applyBloodBankSession,
      applyUserSession,
      clearRoleSession,
      dispatch,
      refreshAdminSessionMutation,
      refreshBloodBankSessionMutation,
      refreshSessionMutation,
    ],
  );

  const scheduleRefresh = useCallback(
    (role, expiresAt) => {
      clearRefreshTimeout(role);

      if (!expiresAt) {
        return;
      }

      const expiresAtMs = new Date(expiresAt).getTime();
      if (!Number.isFinite(expiresAtMs)) {
        return;
      }

      const delayMs = Math.max(
        expiresAtMs - Date.now() - REFRESH_BUFFER_MS,
        MIN_REFRESH_DELAY_MS,
      );
      refreshTimeoutsRef.current[role] = window.setTimeout(() => {
        silentlyRefreshRole(role);
      }, delayMs);
    },
    [clearRefreshTimeout, silentlyRefreshRole],
  );

  useEffect(() => {
    const bootstrapSessions = async () => {
      const currentPath = window.location.pathname.toLowerCase();

      // We check for existing sessions even on public routes to enable automatic redirects
      const isBloodBankRoute = isBloodBankPortalRoute(currentPath);
      const isAdminPath = currentPath.startsWith("/admin");

      // Determine what to check based on what we don't have yet in memory
      // Only check the session relevant to the current portal
      const checkAdmin = !adminUser && isAdminPath;
      const checkBloodBank = !bloodBank && isBloodBankRoute;
      const checkUser = !user && !isBloodBankRoute && !isAdminPath;

      try {
        const promises = [];
        if (checkUser)
          promises.push(
            triggerUserSession()
              .unwrap()
              .catch(() => null),
          );
        if (checkAdmin)
          promises.push(
            triggerAdminSession()
              .unwrap()
              .catch(() => null),
          );
        if (checkBloodBank)
          promises.push(
            triggerBloodBankSession()
              .unwrap()
              .catch(() => null),
          );

        const results = await Promise.all(promises);

        // Apply whatever sessions we found
        results.forEach((session) => {
          if (!session) return;
          if (session.user || session.data?.user) applyUserSession(session);
          else if (session.admin || session.data?.admin)
            applyAdminSession(session);
          else if (session.bloodBank || session.data?.bloodBank)
            applyBloodBankSession(session);
        });
      } catch (error) {
        console.error("[Auth] Bootstrap failed:", error);
      } finally {
        setLoading(false);
      }
    };

    bootstrapSessions();

    // Listen for authentication events from other tabs
    onAuthSync(({ role, action, data }) => {
      const activePortal = getActivePortal();
      if (role !== activePortal) return; // Ignore events from other portals

      if (action === "login" || action === "refresh") {
        if (role === "user") applyUserSession(data);
        if (role === "admin") applyAdminSession(data);
        if (role === "bloodbank") applyBloodBankSession(data);
      } else if (action === "logout") {
        clearRoleSession(role);
        dispatch(apiSlice.util.resetApiState());
      }
    });
  }, [
    applyAdminSession,
    applyBloodBankSession,
    applyUserSession,
    clearRoleSession,
    dispatch,
    triggerAdminSession,
    triggerUserSession,
    triggerBloodBankSession,
  ]);

  useEffect(() => {
    scheduleRefresh(
      "user",
      user && userAccessTokenExpiresAt ? userAccessTokenExpiresAt : null,
    );
  }, [scheduleRefresh, user, userAccessTokenExpiresAt]);

  useEffect(() => {
    scheduleRefresh(
      "admin",
      adminUser && adminAccessTokenExpiresAt ? adminAccessTokenExpiresAt : null,
    );
  }, [adminAccessTokenExpiresAt, adminUser, scheduleRefresh]);

  useEffect(() => {
    scheduleRefresh(
      "bloodbank",
      bloodBank && bloodBankAccessTokenExpiresAt
        ? bloodBankAccessTokenExpiresAt
        : null,
    );
  }, [bloodBank, bloodBankAccessTokenExpiresAt, scheduleRefresh]);

  useEffect(() => {
    const refreshSoonIfNeeded = () => {
      const now = Date.now();
      const activePortal = getActivePortal();

      if (activePortal === "user" && user && userAccessTokenExpiresAt) {
        const expiresAtMs = new Date(userAccessTokenExpiresAt).getTime();
        if (
          Number.isFinite(expiresAtMs) &&
          expiresAtMs - now <= EXPIRY_CHECK_ON_FOCUS_MS
        ) {
          silentlyRefreshRole("user");
        }
      }

      if (activePortal === "admin" && adminUser && adminAccessTokenExpiresAt) {
        const expiresAtMs = new Date(adminAccessTokenExpiresAt).getTime();
        if (
          Number.isFinite(expiresAtMs) &&
          expiresAtMs - now <= EXPIRY_CHECK_ON_FOCUS_MS
        ) {
          silentlyRefreshRole("admin");
        }
      }

      if (activePortal === "bloodbank" && bloodBank && bloodBankAccessTokenExpiresAt) {
        const expiresAtMs = new Date(bloodBankAccessTokenExpiresAt).getTime();
        if (
          Number.isFinite(expiresAtMs) &&
          expiresAtMs - now <= EXPIRY_CHECK_ON_FOCUS_MS
        ) {
          silentlyRefreshRole("bloodbank");
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshSoonIfNeeded();
      }
    };

    window.addEventListener("focus", refreshSoonIfNeeded);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshSoonIfNeeded);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearAllRefreshTimeouts();
    };
  }, [
    adminAccessTokenExpiresAt,
    adminUser,
    bloodBank,
    bloodBankAccessTokenExpiresAt,
    clearAllRefreshTimeouts,
    silentlyRefreshRole,
    user,
    userAccessTokenExpiresAt,
  ]);

  const loginAdmin = useCallback(
    async (credentials) => {
      try {
        const response = await adminLoginMutation(credentials).unwrap();
        applyAdminSession(response);
        syncAuthAction("admin", "login", response);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: error.data?.message || "Admin login failed",
        };
      }
    },
    [adminLoginMutation, applyAdminSession],
  );

  const login = useCallback(
    async (credentials) => {
      try {
        const response = await loginMutation(credentials).unwrap();
        applyUserSession(response);
        syncAuthAction("user", "login", response);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: error.data?.message || "Login failed",
        };
      }
    },
    [applyUserSession, loginMutation],
  );

  const register = useCallback(
    async (userData) => {
      try {
        const response = await registerMutation(userData).unwrap();
        // Ensure we return everything from the response to catch verification metadata
        return { success: true, ...response, ...(response.data || {}) };
      } catch (error) {
        // Extract validation errors from express-validator if present
        const validationErrors = error.data?.errors;
        let message = error.data?.message || "Registration failed";

        if (validationErrors && Array.isArray(validationErrors)) {
          message = validationErrors.map((err) => err.msg).join(". ");
        }

        return {
          success: false,
          message,
          errors: validationErrors,
        };
      }
    },
    [registerMutation],
  );

  const verifyOtp = useCallback(
    async (otpData) => {
      try {
        const response = await verifyOtpMutation(otpData).unwrap();
        applyUserSession(response.data || response);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          message: error.data?.message || "OTP verification failed",
        };
      }
    },
    [applyUserSession, verifyOtpMutation],
  );

  const resendOtp = useCallback(
    async (verificationId) => {
      try {
        const response = await resendOtpMutation({ verificationId }).unwrap();
        return { success: true, ...response.data };
      } catch (error) {
        return {
          success: false,
          message: error.data?.message || "Resend OTP failed",
        };
      }
    },
    [resendOtpMutation],
  );

  const logout = useCallback(async () => {
    window.__AUTH_LOGOUT_IN_PROGRESS__ = true;
    clearRoleSession("user");
    dispatch(apiSlice.util.resetApiState());

    try {
      await logoutMutation().unwrap();
    } catch (_error) {
      // Continue local cleanup even if server logout fails.
    } finally {
      window.__AUTH_LOGOUT_IN_PROGRESS__ = false;
      syncAuthAction("user", "logout");
    }
  }, [clearRoleSession, dispatch, logoutMutation]);

  const logoutAdmin = useCallback(async () => {
    window.__AUTH_LOGOUT_IN_PROGRESS__ = true;
    clearRoleSession("admin");
    dispatch(apiSlice.util.resetApiState());

    try {
      await adminLogoutMutation().unwrap();
    } catch (_error) {
      // Continue local cleanup even if server logout fails.
    } finally {
      window.__AUTH_LOGOUT_IN_PROGRESS__ = false;
      syncAuthAction("admin", "logout");
    }
  }, [adminLogoutMutation, clearRoleSession, dispatch]);

  const logoutBloodBank = useCallback(async () => {
    window.__AUTH_LOGOUT_IN_PROGRESS__ = true;
    clearRoleSession("bloodbank");
    dispatch(apiSlice.util.resetApiState());

    try {
      await logoutBloodBankMutation().unwrap();
    } catch (_error) {
      // Continue local cleanup even if server logout fails.
    } finally {
      window.__AUTH_LOGOUT_IN_PROGRESS__ = false;
      syncAuthAction("bloodbank", "logout");
    }
  }, [clearRoleSession, dispatch, logoutBloodBankMutation]);

  const loginWithGoogle = useCallback(async ({ mode = "login" } = {}) => {
    const apiBaseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const normalizedMode = mode === "signup" ? "signup" : "login";
    const baseUrl = apiBaseUrl.endsWith("/v1")
      ? apiBaseUrl
      : `${apiBaseUrl}/v1`;
    const startUrl = `${baseUrl}${AUTH_API_URLS.GOOGLE_OAUTH_START}?mode=${encodeURIComponent(normalizedMode)}`;
    window.location.assign(startUrl);
    return { success: true };
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      adminUser,
      setAdminUser,
      bloodBank,
      setBloodBank,
      loginAdmin,
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      logoutAdmin,
      logoutBloodBank,
      loginWithGoogle,
      isAuthenticated: !!user || !!adminUser || !!bloodBank,
      isAdminAuthenticated: !!adminUser,
      isBloodBankAuthenticated: !!bloodBank,
      loading,
    }),
    [
      user,
      setUser,
      adminUser,
      setAdminUser,
      bloodBank,
      setBloodBank,
      loginAdmin,
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      logoutAdmin,
      logoutBloodBank,
      loginWithGoogle,
      loading,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
