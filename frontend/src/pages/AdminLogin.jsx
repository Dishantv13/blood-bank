import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTE_PATH } from '../enum/routePath';
import '../pages.css/AdminPremium.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await loginAdmin(formData);
    setSubmitting(false);

    if (!result.success) {
      setError(result.message || 'Admin login failed');
      return;
    }

    navigate(ROUTE_PATH.ADMIN_DASHBOARD);
  };

  return (
    <div className="admin-login-premium-root">
      <div className="login-glass-card">
        <div className="login-brand">🩸</div>
        <h1>BloodBank Admin</h1>
        <p>Enter your credentials to access the command center.</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="premium-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              className="premium-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@bloodbank.com"
              required
              autoComplete="username"
            />
          </div>

          <div className="premium-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              className="premium-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="admin-login-error">{error}</div>}

          <button type="submit" className="btn-premium" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Sign In to Panel'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
