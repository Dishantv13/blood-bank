import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { ROUTE_PATH } from '../enum/routePath';

import SkeletonLoader from './SkeletonLoader';

const hasBloodBankSession = () => {
  try {
    const bloodBankData = localStorage.getItem('bloodBankData');
    const bloodBankUser = localStorage.getItem('bloodBankUser');
    return Boolean(bloodBankData || bloodBankUser);
  } catch {
    return false;
  }
};

const PrivateRoute = ({ children, requireAdmin = false, requireBloodBank = false }) => {
  const { isAuthenticated, isAdminAuthenticated, loading } = useAuth();

  if (loading) {
    return <SkeletonLoader />;
  }

  if (requireAdmin) {
    return isAdminAuthenticated ? children : <Navigate to={ROUTE_PATH.ADMIN_LOGIN} />;
  }

  if (requireBloodBank) {
    return hasBloodBankSession() ? children : <Navigate to={ROUTE_PATH.BLOOD_BANK_LOGIN} replace />;
  }

  return isAuthenticated ? children : <Navigate to={ROUTE_PATH.LOGIN} />;
};

export default PrivateRoute;
