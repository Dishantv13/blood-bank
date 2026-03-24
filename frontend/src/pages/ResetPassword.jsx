import React, { useState, useEffect } from 'react';
import { useResetPasswordMutation, useVerifyResetTokenMutation } from '../store/userApi';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ROUTE_PATH } from '../enum/routePath';
import '../pages.css/ResetPassword.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);

  const [verifyToken, { isLoading: validating }] = useVerifyResetTokenMutation();
  const [resetPassword, { isLoading: loading }] = useResetPasswordMutation();

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link');
      return;
    }

    // Verify token
    const verifyUserResetToken = async () => {
      try {
        const response = await verifyToken(token).unwrap();
        setTokenValid(response.valid);
        if (!response.valid) {
          setError('Your reset link has expired. Please request a new one.');
        }
      } catch (err) {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    verifyUserResetToken();
  }, [token, verifyToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const response = await resetPassword({
        token,
        password
      }).unwrap();
      setMessage(response.message || 'Password changed successfully');
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate(ROUTE_PATH.LOGIN);
      }, 2000);
    } catch (err) {
      setError(err.data?.message || 'Failed to reset password');
    }
  };

  if (validating) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-box">
          <p>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-box error-box">
          <h2>Invalid Reset Link</h2>
          <p>{error}</p>
          <button 
            className="back-button"
            onClick={() => navigate(ROUTE_PATH.FORGOT_PASSWORD)}
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-box">
        <h2>Reset Password</h2>

        {success ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <p>{message}</p>
            <p className="hint">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength="6"
              />
              <small>Must be at least 6 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength="6"
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message-text">{message}</div>}

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="back-link">
              <Link to={ROUTE_PATH.LOGIN}>Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
