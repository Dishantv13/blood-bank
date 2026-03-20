import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { useLoginMutation, useRegisterMutation, useGoogleLoginMutation } from '../store/authApi';
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
  const [user, setUserState] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

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

  useEffect(() => {
    if (token) {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          setUserState(JSON.parse(userData));
        } catch (e) {
          // Invalid JSON in localStorage — clear it
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          setToken(null);
        }
      }
    }
    setLoading(false);
  }, [token]);

  const login = useCallback(async (credentials) => {
    try {
      const response = await loginMutation(credentials).unwrap();
      const { token: newToken, user: newUser } = response;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      setToken(newToken);
      setUser(newUser);
      
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
      const { token: newToken, user: newUser } = response;
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      setToken(newToken);
      setUser(newUser);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.data?.message || 'Registration failed',
      };
    }
  }, [setUser, registerMutation]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    // Reset RTK Query cache to clear data from previous session
    dispatch(apiSlice.util.resetApiState());
  }, [setUser, dispatch]);

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
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      setToken(newToken);
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
  }, [setUser, googleLoginMutation]);


  // Memoize context value to prevent unnecessary re-renders of all consumers
  const value = useMemo(() => ({
    user,
    setUser,
    token,
    setToken,
    login,
    register,
    logout,
    loginWithGoogle,
    isAuthenticated: !!token,
    loading,
  }), [user, setUser, token, login, register, logout, loginWithGoogle, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
