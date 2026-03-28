import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import {
  useAdminLoginMutation,
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useLogoutMutation,
  useAdminLogoutMutation,
  useLazyGetUserSessionQuery,
  useLazyGetAdminSessionQuery,
} from '../store/authApi';
import { useDispatch } from 'react-redux';
import { apiSlice } from '../store/apiSlice';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminUser, setAdminUserState] = useState(() => {
    try {
      const saved = localStorage.getItem('adminUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const [adminLoginMutation] = useAdminLoginMutation();
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [googleLoginMutation] = useGoogleLoginMutation();
  const [logoutMutation] = useLogoutMutation();
  const [adminLogoutMutation] = useAdminLogoutMutation();
  const [triggerUserSession] = useLazyGetUserSessionQuery();
  const [triggerAdminSession] = useLazyGetAdminSessionQuery();

  const setUser = useCallback((userData) => {
    setUserState(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const setAdminUser = useCallback((adminData) => {
    setAdminUserState(adminData);
    if (adminData) {
      localStorage.setItem('adminUser', JSON.stringify(adminData));
    } else {
      localStorage.removeItem('adminUser');
    }
  }, []);

  useEffect(() => {
    const bootstrapSessions = async () => {
      const currentPath = window.location.pathname.toLowerCase();
      const isBloodBankRoute =
        currentPath.startsWith('/blood-bank') ||
        currentPath.startsWith('/bloodbank');
      const isAdminPublicAuthPath =
        currentPath === '/admin/login' ||
        currentPath === '/admin/forgot-password' ||
        currentPath.startsWith('/admin/reset-password');
      const isPublicAuthPath = (
        currentPath === '/login' ||
        currentPath === '/signup' ||
        currentPath === '/forgot-password' ||
        currentPath.startsWith('/reset-password') ||
        currentPath === '/admin/login' ||
        currentPath === '/blood-bank/login' ||
        currentPath === '/bloodbank/login' ||
        currentPath === '/blood-bank/register' ||
        currentPath === '/bloodbank/register' ||
        currentPath === '/admin/forgot-password' ||
        currentPath.startsWith('/admin/reset-password') ||
        currentPath === '/blood-bank/forgot-password' ||
        currentPath === '/bloodbank/forgot-password' ||
        currentPath.startsWith('/blood-bank/reset-password') ||
        currentPath.startsWith('/bloodbank/reset-password')
      );
      const shouldCheckAdminSession =
        currentPath.startsWith('/admin') &&
        !isAdminPublicAuthPath;
      const shouldCheckUserSession =
        !isPublicAuthPath &&
        !currentPath.startsWith('/admin') &&
        !isBloodBankRoute;

      if (!shouldCheckUserSession && !shouldCheckAdminSession) {
        setUser(null);
        setAdminUser(null);
        setLoading(false);
        return;
      }

      try {
        const [userSession, adminSession] = await Promise.allSettled([
          shouldCheckUserSession
            ? triggerUserSession().unwrap()
            : Promise.resolve(null),
          shouldCheckAdminSession
            ? triggerAdminSession().unwrap()
            : Promise.resolve(null),
        ]);

        if (shouldCheckUserSession && userSession.status === 'fulfilled') {
          setUser(userSession.value.user || userSession.value.data || null);
        } else if (shouldCheckUserSession) {
          setUser(null);
        }

        if (shouldCheckAdminSession && adminSession.status === 'fulfilled') {
          setAdminUser(adminSession.value.admin || adminSession.value.data || null);
        } else {
          setAdminUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrapSessions();
  }, [setAdminUser, setUser, triggerAdminSession, triggerUserSession]);

  const loginAdmin = useCallback(async (credentials) => {
    try {
      const response = await adminLoginMutation(credentials).unwrap();
      setAdminUser(response.admin);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Admin login failed',
      };
    }
  }, [adminLoginMutation, setAdminUser]);

  const login = useCallback(async (credentials) => {
    try {
      const response = await loginMutation(credentials).unwrap();
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Login failed',
      };
    }
  }, [setUser, loginMutation]);

  const register = useCallback(async (userData) => {
    try {
      const response = await registerMutation(userData).unwrap();
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Registration failed',
      };
    }
  }, [setUser, registerMutation]);

  const logout = useCallback(async () => {
    window.__AUTH_LOGOUT_IN_PROGRESS__ = true;
    setUser(null);
    dispatch(apiSlice.util.resetApiState());

    try {
      await logoutMutation().unwrap();
    } catch (_error) {
      // Continue local cleanup even if server logout fails.
    } finally {
      window.__AUTH_LOGOUT_IN_PROGRESS__ = false;
    }
  }, [dispatch, logoutMutation, setUser]);

  const logoutAdmin = useCallback(async () => {
    window.__AUTH_LOGOUT_IN_PROGRESS__ = true;
    setAdminUser(null);
    dispatch(apiSlice.util.resetApiState());

    try {
      await adminLogoutMutation().unwrap();
    } catch (_error) {
      // Continue local cleanup even if server logout fails.
    } finally {
      window.__AUTH_LOGOUT_IN_PROGRESS__ = false;
    }
  }, [adminLogoutMutation, dispatch, setAdminUser]);

  const loginWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      return {
        success: false,
        message: 'Google login is not properly configured. Please check server logs and configuration.',
      };
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!result.user) {
        throw new Error('No user data received from Google');
      }

      const googleUser = result.user;
      const response = await googleLoginMutation({
        email: googleUser.email,
        name: googleUser.displayName || googleUser.email.split('@')[0],
        googleId: googleUser.uid,
        photoURL: googleUser.photoURL,
      }).unwrap();

      setUser(response.user);
      return { success: true };
    } catch (error) {
      if (error.code === 'auth/popup-closed-by-user') {
        return {
          success: false,
          message: 'Login popup was closed before completion. Please try again.',
        };
      }

      if (error.code === 'auth/cancelled-by-user') {
        return {
          success: false,
          message: 'Login was cancelled. Please try again.',
        };
      }

      return {
        success: false,
        message: error.code === 'auth/configuration-not-found'
          ? 'Google Login is not configured correctly. Please check server environment variables.'
          : (error.data?.message || 'Google login failed. Please try again later.'),
      };
    }
  }, [googleLoginMutation, setUser]);

  const value = useMemo(() => ({
    user,
    setUser,
    adminUser,
    setAdminUser,
    loginAdmin,
    login,
    register,
    logout,
    logoutAdmin,
    loginWithGoogle,
    isAuthenticated: !!user,
    isAdminAuthenticated: !!adminUser,
    loading,
  }), [
    user,
    setUser,
    adminUser,
    setAdminUser,
    loginAdmin,
    login,
    register,
    logout,
    logoutAdmin,
    loginWithGoogle,
    loading
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
