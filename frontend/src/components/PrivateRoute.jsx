import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { ROUTE_PATH } from "../enum/routePath";

import SkeletonLoader from "./SkeletonLoader";

const PrivateRoute = ({
  children,
  requireAdmin = false,
  requireBloodBank = false,
}) => {
  const {
    isAuthenticated,
    isAdminAuthenticated,
    isBloodBankAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return <SkeletonLoader />;
  }

  if (requireAdmin) {
    return isAdminAuthenticated ? (
      children
    ) : (
      <Navigate to={ROUTE_PATH.ADMIN_LOGIN} />
    );
  }

  if (requireBloodBank) {
    // SECURITY FIX: Use AuthContext with httpOnly cookies instead of localStorage
    return isBloodBankAuthenticated ? (
      children
    ) : (
      <Navigate to={ROUTE_PATH.BLOOD_BANK_LOGIN} replace />
    );
  }

  return isAuthenticated ? children : <Navigate to={ROUTE_PATH.LOGIN} />;
};

export default PrivateRoute;
