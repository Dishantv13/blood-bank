import React, { useState } from 'react';
import { useChangeUserPasswordMutation } from '../store/userApi';
import { MIN_PASSWORD_LENGTH } from '../enum/constants';
import '../pages.css/ChangePassword.css'

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [changePassword, { isLoading: loading }] = useChangeUserPasswordMutation();

  const validatePasswords = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return false;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError('New password must be at least 6 characters');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!validatePasswords()) {
      return;
    }

    try {
      const response = await changePassword({
        currentPassword,
        newPassword
      }).unwrap();

      setMessage(response.message || 'Password changed successfully');
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setMessage('');
      }, 3000);
    } catch (err) {
      setError(err.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-box">
        <h2>Change Password</h2>
        <p className="form-description">
          Update your password to keep your account secure
        </p>

        {success ? (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <p>{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Current Password */}
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <div className="password-input-group">
                <input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={loading}
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-group">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={loading}
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <small>Must be at least {MIN_PASSWORD_LENGTH} characters</small>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-group">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength="6"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && <div className="error-message">{error}</div>}

            {/* Buttons */}
            <div className="button-group">
              <button 
                type="submit" 
                className="change-button"
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
              <button 
                type="reset" 
                className="reset-button"
                onClick={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
                disabled={loading}
              >
                Clear
              </button>
            </div>

            {/* Password Requirements */}
            <div className="password-requirements">
              <h4>Password Requirements:</h4>
              <ul>
                <li>At least {MIN_PASSWORD_LENGTH} characters long</li>
                <li>Must contain at least one uppercase letter</li>
                <li>Must contain at least one lowercase letter</li>
                <li>Must contain at least one number</li>
                <li>Must contain at least one special character</li>
                <li>Different from current password</li>
                <li>Both passwords must match</li>
              </ul>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePassword;
