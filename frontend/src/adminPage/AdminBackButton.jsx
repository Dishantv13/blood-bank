import React from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTE_PATH } from '../enum/routePath';

const AdminBackButton = ({ label = 'Back to Dashboard' }) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="btn btn-outline admin-back-btn"
      onClick={() => navigate(ROUTE_PATH.ADMIN_DASHBOARD)}
    >
      {label}
    </button>
  );
};

export default AdminBackButton;
