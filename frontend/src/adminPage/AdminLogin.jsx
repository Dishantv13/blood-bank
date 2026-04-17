import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTE_PATH } from '../enum/routePath';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import '../adminPage.css/AdminPremium.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { loginAdmin, isAdminAuthenticated } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAdminAuthenticated) {
      navigate(ROUTE_PATH.ADMIN_DASHBOARD);
    }
  }, [isAdminAuthenticated, navigate]);

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
      <div className="login-mesh-bg"></div>
      <div className="login-glass-card fade-in-up">
        <div className="login-brand">🩸</div>
        <h1 className="login-title">Command Center</h1>
        <p className="login-subtitle">Secure access for BloodBank Administrators.</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="premium-form-group">
            <label htmlFor="email"><FiMail /> Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              className="premium-input-login"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@bloodbank.ai"
              required
              autoComplete="username"
            />
          </div>

          <div className="premium-form-group">
            <label htmlFor="password"><FiLock /> Password</label>
            <div className="admin-password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="premium-input-login"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="admin-password-toggle-premium"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {error && <div className="admin-login-error-premium">{error}</div>}

          <button type="submit" className="btn-premium-login" disabled={submitting}>
            {submitting ? 'Authenticating...' : 'Authorize Session'}
          </button>
        </form>
        
        <div className="login-footer-text">
           System protected by end-to-end encryption.
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
