import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { useAdminLoginMutation, useLoginMutation, useRegisterMutation, useGoogleLoginMutation } from '../store/authApi';
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
  
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  
  const [adminUser, setAdminUserState] = useState(() => {
    try {
      const saved = localStorage.getItem('adminUser');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [adminToken, setAdminTokenState] = useState(() => localStorage.getItem('adminToken'));
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const [adminLoginMutation] = useAdminLoginMutation();
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [googleLoginMutation] = useGoogleLoginMutation();

  // Wrapper for setUser to also update localStorage
  const setUser = useCallback((userData) => {
    setUserState(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  const setTokenWrapper = useCallback((newToken) => {
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  }, []);

  const setAdminToken = useCallback((newToken) => {
    setAdminTokenState(newToken);
    if (newToken) {
      localStorage.setItem('adminToken', newToken);
    } else {
      localStorage.removeItem('adminToken');
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

  // Initialize loading state on mount
  useEffect(() => {
    setLoading(false);
  }, []);

  const loginAdmin = useCallback(async (credentials) => {
    try {
      const response = await adminLoginMutation(credentials).unwrap();
      const { token: newToken, admin } = response;
      
      // Use the wrapper callbacks that handle localStorage
      setAdminToken(newToken);
      setAdminUser(admin);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Admin login failed',
      };
    }
  }, [adminLoginMutation, setAdminToken, setAdminUser]);

  const login = useCallback(async (credentials) => {
    try {
      const response = await loginMutation(credentials).unwrap();
      const { token: newToken, user: newUser } = response;
      
      setTokenWrapper(newToken);
      setUser(newUser);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Login failed',
      };
    }
  }, [setUser, setTokenWrapper, loginMutation]);

  const register = useCallback(async (userData) => {
    try {
      const response = await registerMutation(userData).unwrap();
      const { token: newToken, user: newUser } = response;
      
      setTokenWrapper(newToken);
      setUser(newUser);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Registration failed',
      };
    }
  }, [setUser, setTokenWrapper, registerMutation]);

  const logout = useCallback(() => {
    setTokenWrapper(null);
    setUser(null);
    // Reset RTK Query cache to clear data from previous session
    dispatch(apiSlice.util.resetApiState());
  }, [setUser, setTokenWrapper, dispatch]);

  const logoutAdmin = useCallback(() => {
    setAdminToken(null);
    setAdminUser(null);
    dispatch(apiSlice.util.resetApiState());
  }, [setAdminToken, setAdminUser, dispatch]);

  const loginWithGoogle = useCallback(async () => {
    // Check if Firebase is configured
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      console.error('Firebase configuration is incomplete. Check your .env file.');
      return {
        success: false,
        message: 'Google login is not properly configured. Please check server logs and configuration.',
      };
    }

    try {
      // Sign in with Google popup
      const result = await signInWithPopup(auth, googleProvider);
      
      if (!result.user) {
        throw new Error('No user data received from Google');
      }

      const googleUser = result.user;
      
      // Send Google user info to backend for verification and user creation
      const response = await googleLoginMutation({
        email: googleUser.email,
        name: googleUser.displayName || googleUser.email.split('@')[0],
        googleId: googleUser.uid,
        photoURL: googleUser.photoURL,
      }).unwrap();
      
      const { token: newToken, user: newUser } = response;
      
      setTokenWrapper(newToken);
      setUser(newUser);
      
      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      
      // Handle Firebase specific errors
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

      // Return a clean error message for the UI
      return {
        success: false,
        message: error.code === 'auth/configuration-not-found' 
          ? 'Google Login is not configured correctly. Please check server environment variables.'
          : (error.data?.message || 'Google login failed. Please try again later.'),
      };
    }
  }, [setUser, setTokenWrapper, googleLoginMutation]);


  // Memoize context value to prevent unnecessary re-renders of all consumers
  const value = useMemo(() => ({
    user,
    setUser,
    token,
    setToken: setTokenWrapper,
    adminUser,
    setAdminUser,
    adminToken,
    setAdminToken,
    loginAdmin,
    login,
    register,
    logout,
    logoutAdmin,
    loginWithGoogle,
    isAuthenticated: !!token,
    isAdminAuthenticated: !!adminToken,
    loading,
  }), [
    user,
    setUser,
    token,
    setTokenWrapper,
    adminUser,
    setAdminUser,
    adminToken,
    setAdminToken,
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
