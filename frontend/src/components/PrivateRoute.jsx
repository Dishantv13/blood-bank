import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import { ROUTE_PATH } from '../enum/routePath';

const PrivateRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdminAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (requireAdmin) {
    return isAdminAuthenticated ? children : <Navigate to={ROUTE_PATH.ADMIN_LOGIN} />;
  }

  return isAuthenticated ? children : <Navigate to={ROUTE_PATH.LOGIN} />;
};

export default PrivateRoute;
