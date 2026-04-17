import { useState } from 'react';
import { useForgotPasswordMutation } from '../store/userApi';
import { Link } from 'react-router-dom';
import { ROUTE_PATH } from '../enum/routePath';
import { FaCheckCircle } from 'react-icons/fa';
import '../pages.css/ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [forgotPassword, { isLoading: loading }] = useForgotPasswordMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const response = await forgotPassword({ email }).unwrap();
      setMessage(response.message || 'Reset link sent to your email');
      setSubmitted(true);
      setEmail('');
    } catch (err) {
      setError(err.data?.message || 'Failed to send reset email');
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-box">
        <h2>Forgot Password</h2>
        
        {submitted ? (
          <div className="success-message">
            <div className="success-icon"><FaCheckCircle color="green" /></div>
            <p>{message}</p>
            <p className="hint">Check your email for password reset instructions.</p>
            <button 
              className="back-button"
              onClick={() => {
                setSubmitted(false);
                setMessage('');
              }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="form-description">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
