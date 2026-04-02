import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLoginBloodBankMutation } from '../store/bloodBankApi';
import { useToast } from '../components/ToastContainer';
import ThemeToggle from "../components/ThemeToggle";
import { ROUTE_PATH } from '../enum/routePath';
import '../pages.css/BloodBankAuth.css';

const BloodBankLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(true);

  const [loginBloodBank, { isLoading: loading }] = useLoginBloodBankMutation();

  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const isRestrictedLoginMessage = (message) => {
    const normalized = String(message || '').toLowerCase();
    return (
      normalized.includes('approval email') ||
      normalized.includes('pending admin approval') ||
      normalized.includes('pending') ||
      normalized.includes('rejected by the admin') ||
      normalized.includes('registration request was rejected')
    );
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await loginBloodBank(formData).unwrap();
      
      // SECURITY FIX: Authentication handled by httpOnly cookies
      // No need to store tokens or sensitive data in localStorage
      // Backend sets cookies automatically with credentials: 'include'
      
      toast.success('Login successful! Welcome back.');
      navigate(ROUTE_PATH.BLOOD_BANK_DASHBOARD);
    } catch (err) {
      const errorMessage = err.data?.message || 'Login failed. Please try again.';
      if (isRestrictedLoginMessage(errorMessage)) {
        setFormData({ email: '', password: '' });
        setError(errorMessage);
      } else {
        setError(errorMessage);
      }
      toast.error(errorMessage);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="guest-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="blood-bank-auth-container">
      <div className="auth-left-panel">
        <div className="auth-branding">
          <div className="auth-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
            </svg>
          </div>
          <h1>Blood Bank Portal</h1>
          <p>Manage your blood bank inventory, organize camps, and save lives</p>
        </div>
        
        <div className="auth-features">
          <div className="feature-item1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7h-9a2 2 0 00-2 2v10a2 2 0 002 2h9a2 2 0 002-2V9a2 2 0 00-2-2z"/>
              <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
            </svg>
            <span>Inventory Management</span>
          </div>
          <div className="feature-item1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Organize Blood Camps</span>
          </div>
          <div className="feature-item1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <span>Connect with Donors</span>
          </div>
          <div className="feature-item1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <span>Analytics & Reports</span>
          </div>
        </div>
      </div>

      <div className="auth-right-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Welcome Back</h2>
            <p>Sign in after your blood bank registration has been approved by admin</p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="bloodbank@example.com"
                required
              />
            </div>

            <div className="form-group password-field">
              <label htmlFor="password">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "password" : "text"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Show password" : "Hide password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5 0-9.27-3.11-11-8 1.05-2.96 3-5.27 5.47-6.78"/>
                      <path d="M1 1l22 22"/>
                      <path d="M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8a11.83 11.83 0 01-3.11 4.86"/>
                      <path d="M14.12 14.12a3 3 0 01-4.24-4.24"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <Link to={ROUTE_PATH.BLOOD_BANK_FORGOT_PASSWORD} className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <Link to={ROUTE_PATH.BLOOD_BANK_REGISTER}>Register your blood bank</Link>
            </p>
            <p className="user-login-link">
              Are you a donor?{' '}
              <Link to={ROUTE_PATH.LOGIN}>Go to donor login</Link>
            </p>
          </div>
        </div>
      </div>
      </div>

      <style>{`
        .auth-alert.auth-alert-error {
          background: #fff5f5;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        [data-theme='dark'] .auth-alert.auth-alert-error {
          background: #3f1d1d;
          color: #fecaca;
          border-color: #7f1d1d;
        }
      `}</style>
    </div>
  );
};

export default BloodBankLogin;
