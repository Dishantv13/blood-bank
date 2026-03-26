import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTE_PATH } from '../enum/routePath';
import '../adminPage.css/AdminPremium.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
            <div className="admin-password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="premium-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5 0-9.27-3.11-11-8 1.05-2.96 3-5.27 5.47-6.78"/>
                    <path d="M1 1l22 22"/>
                    <path d="M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8a11.83 11.83 0 01-3.11 4.86"/>
                    <path d="M14.12 14.12a3 3 0 01-4.24-4.24"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
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
