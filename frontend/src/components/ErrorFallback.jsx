import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../components.css/ErrorBoundary.css';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    resetErrorBoundary();
    navigate('/');
  };

  return (
    <div className="error-fallback-container">
      <div className="error-fallback-content">
        <div className="error-illustration">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="error-title">Oops! Something went wrong</h1>
        <p className="error-message">
          {error?.message || "An unexpected error occurred. Our team has been notified."}
        </p>
        <div className="error-actions">
          <button className="error-btn primary" onClick={resetErrorBoundary}>
            Try Again
          </button>
          <button className="error-btn secondary" onClick={handleGoHome}>
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
