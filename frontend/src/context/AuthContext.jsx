import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  useAdminLoginMutation,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshSessionMutation,
  useAdminLogoutMutation,
  useRefreshAdminSessionMutation,
  useLazyGetUserSessionQuery,
  useLazyGetAdminSessionQuery,
} from '../store/authApi';
import {
  useLazyGetBloodBankSessionQuery,
  useLogoutBloodBankMutation,
  useRefreshBloodBankSessionMutation,
} from '../store/bloodBankApi';
import { useDispatch } from 'react-redux';
import { apiSlice } from '../store/apiSlice';
import { AUTH_API_URLS } from '../enum/apiUrl';

const AuthContext = createContext();
const REFRESH_BUFFER_MS = 2 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 5 * 1000;
const EXPIRY_CHECK_ON_FOCUS_MS = 3 * 60 * 1000;

const isBloodBankPortalRoute = (path = '') => {
  const currentPath = String(path || '').toLowerCase();
  return (
    currentPath === '/blood-bank/login' ||
    currentPath === '/bloodbank/login' ||
    currentPath === '/blood-bank/register' ||
    currentPath === '/bloodbank/register' ||
    currentPath === '/blood-bank/forgot-password' ||
    currentPath === '/bloodbank/forgot-password' ||
    currentPath.startsWith('/blood-bank/reset-password') ||
    currentPath.startsWith('/bloodbank/reset-password') ||
    currentPath === '/blood-bank/dashboard' ||
    currentPath === '/bloodbank/dashboard' ||
    currentPath === '/blood-bank/change-password' ||
    currentPath === '/bloodbank/change-password'
  );
};

const isBloodBankPublicAuthRoute = (path = '') => {
  const currentPath = String(path || '').toLowerCase();
  return (
    currentPath === '/blood-bank/login' ||
    currentPath === '/bloodbank/login' ||
    currentPath === '/blood-bank/register' ||
    currentPath === '/bloodbank/register' ||
    currentPath === '/blood-bank/forgot-password' ||
    currentPath === '/bloodbank/forgot-password' ||
    currentPath.startsWith('/blood-bank/reset-password') ||
    currentPath.startsWith('/bloodbank/reset-password')
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // SECURITY FIX: Use in-memory state instead of localStorage
  // Backend manages authentication via httpOnly cookies (XSS-proof)
  const [user, setUserState] = useState(null);
  const [adminUser, setAdminUserState] = useState(null);
  const [bloodBank, setBloodBankState] = useState(null);
  const [userAccessTokenExpiresAt, setUserAccessTokenExpiresAt] = useState(null);
  const [adminAccessTokenExpiresAt, setAdminAccessTokenExpiresAt] = useState(null);
  const [bloodBankAccessTokenExpiresAt, setBloodBankAccessTokenExpiresAt] = useState(null);

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
  const [logoutMutation] = useLogoutMutation();
  const [refreshSessionMutation] = useRefreshSessionMutation();
  const [adminLogoutMutation] = useAdminLogoutMutation();
  const [refreshAdminSessionMutation] = useRefreshAdminSessionMutation();
  const [logoutBloodBankMutation] = useLogoutBloodBankMutation();
  const [refreshBloodBankSessionMutation] = useRefreshBloodBankSessionMutation();
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
    clearRefreshTimeout('user');
    clearRefreshTimeout('admin');
    clearRefreshTimeout('bloodbank');
  }, [clearRefreshTimeout]);

  const applyUserSession = useCallback((sessionData) => {
    setUser(sessionData?.user || sessionData?.data || null);
    setUserAccessTokenExpiresAt(sessionData?.accessTokenExpiresAt || null);
  }, [setUser]);

  const applyAdminSession = useCallback((sessionData) => {
    setAdminUser(sessionData?.admin || sessionData?.data || null);
    setAdminAccessTokenExpiresAt(sessionData?.accessTokenExpiresAt || null);
  }, [setAdminUser]);

  const applyBloodBankSession = useCallback((sessionData) => {
    setBloodBank(sessionData?.bloodBank || sessionData?.data || null);
    setBloodBankAccessTokenExpiresAt(sessionData?.accessTokenExpiresAt || null);
  }, [setBloodBank]);

  const clearRoleSession = useCallback((role) => {
    clearRefreshTimeout(role);

    if (role === 'admin') {
      setAdminUser(null);
      setAdminAccessTokenExpiresAt(null);
      return;
    }

    if (role === 'bloodbank') {
      setBloodBank(null);
      setBloodBankAccessTokenExpiresAt(null);
      return;
    }

    setUser(null);
    setUserAccessTokenExpiresAt(null);
  }, [clearRefreshTimeout, setAdminUser, setBloodBank, setUser]);

  const silentlyRefreshRole = useCallback(async (role) => {
    try {
      if (role === 'admin') {
        const response = await refreshAdminSessionMutation().unwrap();
        applyAdminSession(response);
        return true;
      }

      if (role === 'bloodbank') {
        const response = await refreshBloodBankSessionMutation().unwrap();
        applyBloodBankSession(response);
        return true;
      }

      const response = await refreshSessionMutation().unwrap();
      applyUserSession(response);
      return true;
    } catch (_error) {
      clearRoleSession(role);
      dispatch(apiSlice.util.resetApiState());
      return false;
    }
  }, [
    applyAdminSession,
    applyBloodBankSession,
    applyUserSession,
    clearRoleSession,
    dispatch,
    refreshAdminSessionMutation,
    refreshBloodBankSessionMutation,
    refreshSessionMutation,
  ]);

  const scheduleRefresh = useCallback((role, expiresAt) => {
    clearRefreshTimeout(role);

    if (!expiresAt) {
      return;
    }

    const expiresAtMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
      return;
    }

    const delayMs = Math.max(expiresAtMs - Date.now() - REFRESH_BUFFER_MS, MIN_REFRESH_DELAY_MS);
    refreshTimeoutsRef.current[role] = window.setTimeout(() => {
      silentlyRefreshRole(role);
    }, delayMs);
  }, [clearRefreshTimeout, silentlyRefreshRole]);

  useEffect(() => {
    const bootstrapSessions = async () => {
      const currentPath = window.location.pathname.toLowerCase();
      const isBloodBankRoute = isBloodBankPortalRoute(currentPath);
      const isAdminPublicAuthPath =
        currentPath === '/admin/login' ||
        currentPath === '/admin/forgot-password' ||
        currentPath.startsWith('/admin/reset-password');
      const isBloodBankPublicAuthPath = isBloodBankPublicAuthRoute(currentPath);
      const isPublicAuthPath = (
        currentPath === '/login' ||
        currentPath === '/signup' ||
        currentPath === '/forgot-password' ||
        currentPath.startsWith('/reset-password') ||
        currentPath === '/admin/login' ||
        currentPath === '/admin/forgot-password' ||
        currentPath.startsWith('/admin/reset-password') ||
        isBloodBankPublicAuthPath
      );
      const shouldCheckAdminSession =
        currentPath.startsWith('/admin') &&
        !isAdminPublicAuthPath;
      const shouldCheckBloodBankSession =
        isBloodBankRoute &&
        !isBloodBankPublicAuthPath;
      const shouldCheckUserSession =
        !isPublicAuthPath &&
        !currentPath.startsWith('/admin') &&
        !isBloodBankRoute;

      if (!shouldCheckUserSession && !shouldCheckAdminSession && !shouldCheckBloodBankSession) {
        clearRoleSession('user');
        clearRoleSession('admin');
        clearRoleSession('bloodbank');
        setLoading(false);
        return;
      }

      try {
        const [userSession, adminSession, bloodBankSession] = await Promise.allSettled([
          shouldCheckUserSession
            ? triggerUserSession().unwrap()
            : Promise.resolve(null),
          shouldCheckAdminSession
            ? triggerAdminSession().unwrap()
            : Promise.resolve(null),
          shouldCheckBloodBankSession
            ? triggerBloodBankSession().unwrap()
            : Promise.resolve(null),
        ]);

        if (shouldCheckUserSession && userSession.status === 'fulfilled') {
          applyUserSession(userSession.value);
        } else if (shouldCheckUserSession) {
          clearRoleSession('user');
        }

        if (shouldCheckAdminSession && adminSession.status === 'fulfilled') {
          applyAdminSession(adminSession.value);
        } else if (shouldCheckAdminSession) {
          clearRoleSession('admin');
        }

        if (shouldCheckBloodBankSession && bloodBankSession.status === 'fulfilled') {
          applyBloodBankSession(bloodBankSession.value);
        } else if (shouldCheckBloodBankSession) {
          clearRoleSession('bloodbank');
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrapSessions();
  }, [
    applyAdminSession,
    applyBloodBankSession,
    applyUserSession,
    clearRoleSession,
    triggerAdminSession,
    triggerUserSession,
    triggerBloodBankSession,
  ]);

  useEffect(() => {
    scheduleRefresh('user', user && userAccessTokenExpiresAt ? userAccessTokenExpiresAt : null);
  }, [scheduleRefresh, user, userAccessTokenExpiresAt]);

  useEffect(() => {
    scheduleRefresh('admin', adminUser && adminAccessTokenExpiresAt ? adminAccessTokenExpiresAt : null);
  }, [adminAccessTokenExpiresAt, adminUser, scheduleRefresh]);

  useEffect(() => {
    scheduleRefresh('bloodbank', bloodBank && bloodBankAccessTokenExpiresAt ? bloodBankAccessTokenExpiresAt : null);
  }, [bloodBank, bloodBankAccessTokenExpiresAt, scheduleRefresh]);

  useEffect(() => {
    const refreshSoonIfNeeded = () => {
      const now = Date.now();

      if (user && userAccessTokenExpiresAt) {
        const expiresAtMs = new Date(userAccessTokenExpiresAt).getTime();
        if (Number.isFinite(expiresAtMs) && expiresAtMs - now <= EXPIRY_CHECK_ON_FOCUS_MS) {
          silentlyRefreshRole('user');
        }
      }

      if (adminUser && adminAccessTokenExpiresAt) {
        const expiresAtMs = new Date(adminAccessTokenExpiresAt).getTime();
        if (Number.isFinite(expiresAtMs) && expiresAtMs - now <= EXPIRY_CHECK_ON_FOCUS_MS) {
          silentlyRefreshRole('admin');
        }
      }

      if (bloodBank && bloodBankAccessTokenExpiresAt) {
        const expiresAtMs = new Date(bloodBankAccessTokenExpiresAt).getTime();
        if (Number.isFinite(expiresAtMs) && expiresAtMs - now <= EXPIRY_CHECK_ON_FOCUS_MS) {
          silentlyRefreshRole('bloodbank');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSoonIfNeeded();
      }
    };

    window.addEventListener('focus', refreshSoonIfNeeded);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshSoonIfNeeded);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  const loginAdmin = useCallback(async (credentials) => {
    try {
      const response = await adminLoginMutation(credentials).unwrap();
      applyAdminSession(response);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Admin login failed',
      };
    }
  }, [adminLoginMutation, applyAdminSession]);

  const login = useCallback(async (credentials) => {
    try {
      const response = await loginMutation(credentials).unwrap();
      applyUserSession(response);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Login failed',
      };
    }
  }, [applyUserSession, loginMutation]);

  const register = useCallback(async (userData) => {
    try {
      const response = await registerMutation(userData).unwrap();
      applyUserSession(response);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Registration failed',
      };
    }
  }, [applyUserSession, registerMutation]);

  const logout = useCallback(async () => {
    window.__AUTH_LOGOUT_IN_PROGRESS__ = true;
    clearRoleSession('user');
    dispatch(apiSlice.util.resetApiState());

    try {
      await logoutMutation().unwrap();
    } catch (_error) {
      // Continue local cleanup even if server logout fails.
    } finally {
      window.__AUTH_LOGOUT_IN_PROGRESS__ = false;
    }
  }, [clearRoleSession, dispatch, logoutMutation]);

  const logoutAdmin = useCallback(async () => {
    window.__AUTH_LOGOUT_IN_PROGRESS__ = true;
    clearRoleSession('admin');
    dispatch(apiSlice.util.resetApiState());

    try {
      await adminLogoutMutation().unwrap();
    } catch (_error) {
      // Continue local cleanup even if server logout fails.
    } finally {
      window.__AUTH_LOGOUT_IN_PROGRESS__ = false;
    }
  }, [adminLogoutMutation, clearRoleSession, dispatch]);

  const logoutBloodBank = useCallback(async () => {
    window.__AUTH_LOGOUT_IN_PROGRESS__ = true;
    clearRoleSession('bloodbank');
    dispatch(apiSlice.util.resetApiState());

    try {
      await logoutBloodBankMutation().unwrap();
    } catch (_error) {
      // Continue local cleanup even if server logout fails.
    } finally {
      window.__AUTH_LOGOUT_IN_PROGRESS__ = false;
    }
  }, [clearRoleSession, dispatch, logoutBloodBankMutation]);

  const loginWithGoogle = useCallback(async ({ mode = 'login' } = {}) => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const normalizedMode = mode === 'signup' ? 'signup' : 'login';
    const startUrl = `${apiBaseUrl}${AUTH_API_URLS.GOOGLE_OAUTH_START}?mode=${encodeURIComponent(normalizedMode)}`;
    window.location.assign(startUrl);
    return { success: true };
  }, []);

  const value = useMemo(() => ({
    user,
    setUser,
    adminUser,
    setAdminUser,
    bloodBank,
    setBloodBank,
    loginAdmin,
    login,
    register,
    logout,
    logoutAdmin,
    logoutBloodBank,
    loginWithGoogle,
    isAuthenticated: !!user,
    isAdminAuthenticated: !!adminUser,
    isBloodBankAuthenticated: !!bloodBank,
    loading,
  }), [
    user,
    setUser,
    adminUser,
    setAdminUser,
    bloodBank,
    setBloodBank,
    loginAdmin,
    login,
    register,
    logout,
    logoutAdmin,
    logoutBloodBank,
    loginWithGoogle,
    loading
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
