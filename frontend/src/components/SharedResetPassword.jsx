import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import { MIN_PASSWORD_LENGTH } from "../enum/constants";

const SharedResetPassword = ({
  useVerifyTokenMutation,
  useResetPasswordMutation,
  title,
  backToLoginPath,
  forgotPasswordPath,
  containerClass,
  boxClass,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [verifyToken, { isLoading: validating }] = useVerifyTokenMutation();
  const [resetPassword, { isLoading: loading }] = useResetPasswordMutation();

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link");
      return;
    }

    const verifyResetToken = async () => {
      try {
        const response = await verifyToken(token).unwrap();
        setTokenValid(response.valid);
        if (!response.valid) {
          setError("Your reset link has expired. Please request a new one.");
        }
      } catch (err) {
        setError("Invalid or expired reset link. Please request a new one.");
      }
    };

    verifyResetToken();
  }, [token, verifyToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    try {
      const response = await resetPassword({
        token,
        password,
      }).unwrap();
      setMessage(response.message || "Password changed successfully");
      setSuccess(true);

      setTimeout(() => {
        navigate(backToLoginPath);
      }, 2000);
    } catch (err) {
      setError(err.data?.message || "Failed to reset password");
    }
  };

  if (validating) {
    return (
      <div className={containerClass}>
        <div className={boxClass}>
          <p>Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className={containerClass}>
        <div className={`${boxClass} error-box`}>
          <h2>Invalid Reset Link</h2>
          <p>{error}</p>
          <button
            className="back-button"
            onClick={() => navigate(forgotPasswordPath)}
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className={boxClass}>
        <h2>{title}</h2>

        {success ? (
          <div className="success-message">
            <div className="success-icon">
              <FaCheckCircle color="green" />
            </div>
            <p>{message}</p>
            <p className="hint">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group password-field">
              <label htmlFor="password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={MIN_PASSWORD_LENGTH}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5 0-9.27-3.11-11-8 1.05-2.96 3-5.27 5.47-6.78" />
                      <path d="M1 1l22 22" />
                      <path d="M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8a11.83 11.83 0 01-3.11 4.86" />
                      <path d="M14.12 14.12a3 3 0 01-4.24-4.24" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group password-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={MIN_PASSWORD_LENGTH}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5 0-9.27-3.11-11-8 1.05-2.96 3-5.27 5.47-6.78" />
                      <path d="M1 1l22 22" />
                      <path d="M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8a11.83 11.83 0 01-3.11 4.86" />
                      <path d="M14.12 14.12a3 3 0 01-4.24-4.24" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <small>Must be at least {MIN_PASSWORD_LENGTH} characters</small>
              <small>Must contain at least one uppercase letter</small>
              <small>Must contain at least one lowercase letter</small>
              <small>Must contain at least one number</small>
              <small>Must contain at least one special character</small>
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message-text">{message}</div>}

            <button
              type="submit"
              className="submit-button"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <div className="back-link">
              <Link to={backToLoginPath}>Back to Login</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SharedResetPassword;
