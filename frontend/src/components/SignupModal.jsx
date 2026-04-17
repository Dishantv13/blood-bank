import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext";
import { ROUTE_PATH } from "../enum/routePath";
import { useToast } from "./ToastContainer";
import Modal from "./Modal";
import "../components.css/SignupModal.css";

import {
  nameValidator,
  phoneValidator,
  emailValidator,
  pincodeValidator,
  passwordValidator,
} from "../validation/validation";
import { BLOOD_GROUPS, MIN_PASSWORD_LENGTH } from "../enum/constants";

const SignupModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { register: registerUser, verifyOtp, resendOtp, loginWithGoogle } = useAuth();

  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [verificationState, setVerificationState] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    mode: 'onBlur'
  });

  const watchedPassword = watch("password");

  const getVerificationPayload = (response) => {
    const data = response?.data || response || {};
    return {
      verificationId: data.verificationId || response?.verificationId || '',
      maskedEmail: data.maskedEmail || response?.maskedEmail || '',
      attemptsRemaining: data.attemptsRemaining ?? response?.attemptsRemaining ?? 0,
      resendAttemptsRemaining: data.resendAttemptsRemaining ?? response?.resendAttemptsRemaining ?? 0,
      resendAvailableInSeconds: data.resendAvailableInSeconds ?? response?.data?.resendAvailableInSeconds ?? 0,
      otpExpiresInSeconds: data.otpExpiresInSeconds ?? response?.data?.otpExpiresInSeconds ?? 0,
      maxVerifyAttempts: data.maxVerifyAttempts ?? response?.data?.maxVerifyAttempts ?? 5,
    };
  };

  useEffect(() => {
    if (!verificationState?.verificationId) return undefined;
    const timer = setInterval(() => {
      setVerificationState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          resendAvailableInSeconds: Math.max(0, (prev.resendAvailableInSeconds || 0) - 1),
          otpExpiresInSeconds: Math.max(0, (prev.otpExpiresInSeconds || 0) - 1),
        };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [verificationState?.verificationId]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        name: data.name?.trim(),
        email: data.email?.trim().toLowerCase(),
        phone: data.phone?.replace(/\D/g, "").slice(0, 10),
        address: {
          street: data.address?.street?.trim() || "",
          city: data.address?.city?.trim() || "",
          state: data.address?.state?.trim() || "",
          pincode: String(data.address?.pincode ?? "").replace(/\D/g, "").slice(0, 6),
        },
      };

      const result = await registerUser(payload);

      if (result.success) {
        const nextState = getVerificationPayload(result);
        if (nextState.verificationId) {
          setVerificationState(nextState);
          setOtpCode('');
          setOtpError('');
          toast.success(`Verification code sent to ${nextState.maskedEmail || 'your email'}`);
        } else {
          toast.success('Account created successfully!');
          onClose();
          navigate(ROUTE_PATH.DASHBOARD);
        }
      } else {
        // Map backend validation errors to form fields
        if (result.errors && Array.isArray(result.errors)) {
          result.errors.forEach((err) => {
            const field = err.path || err.param;
            if (field) {
              setError(field, { type: 'server', message: err.msg });
            }
          });
          toast.error('Please fix the errors in the form.');
        } else {
          toast.error(result.message || 'Registration failed');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!verificationState?.verificationId) return;

    const sanitizedOtp = String(otpCode || '').replace(/\D/g, '').slice(0, 6);
    if (sanitizedOtp.length !== 6) {
      setOtpError('Please enter the 6-digit code');
      return;
    }

    setOtpError('');
    setIsVerifying(true);

    try {
      const result = await verifyOtp({
        verificationId: verificationState.verificationId,
        otp: sanitizedOtp,
      });

      if (result.success) {
        toast.success('Email verified! Redirecting to dashboard...');
        onClose();
        navigate(ROUTE_PATH.DASHBOARD);
      } else {
        setOtpError(result.message);
        const refreshed = getVerificationPayload(result);
        setVerificationState(prev => ({ ...prev, ...refreshed }));
        toast.error(result.message || 'Invalid OTP');
      }
    } catch (err) {
      setOtpError('An unexpected error occurred during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verificationState?.verificationId || (verificationState.resendAvailableInSeconds || 0) > 0) return;

    setOtpError('');
    setIsResending(true);

    try {
      const result = await resendOtp(verificationState.verificationId);
      if (result.success) {
        const nextState = getVerificationPayload(result);
        setVerificationState(prev => ({ ...prev, ...nextState }));
        setOtpCode('');
        toast.success('A new verification code has been sent');
      } else {
        setOtpError(result.message);
        toast.error(result.message || 'Failed to resend code');
      }
    } catch (err) {
      setOtpError('An unexpected error occurred while resending');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle({ mode: 'signup' });
    } catch (error) {
      toast.error("An error occurred during Google signup.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const renderOtpContent = () => (
    <div className="signup-modal-otp-wrapper">
      <div className="otp-modal-header">
        <p>A 6-digit code has been sent to <strong>{verificationState.maskedEmail}</strong></p>
      </div>

      <form onSubmit={handleVerifyOtp} className="signup-modal-form">
        {otpError && (
          <div className="error-alert">
            {otpError}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="modal-otp">Verification Code</label>
          <input
            type="text"
            id="modal-otp"
            autoComplete="one-time-code"
            className="form-control text-center otp-input-field"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            autoFocus
            disabled={isVerifying}
            style={{ fontSize: '1.5rem', letterSpacing: '8px', textAlign: 'center', fontWeight: 'bold' }}
          />
          {verificationState.attemptsRemaining > 0 && verificationState.attemptsRemaining < verificationState.maxVerifyAttempts && (
            <small className="attempts-remaining">
              {verificationState.attemptsRemaining} attempts remaining
            </small>
          )}
        </div>

        <button
          type="submit"
          className={`btn btn-primary btn-full ${isVerifying ? 'btn-loading' : ''}`}
          disabled={isVerifying || otpCode.length !== 6}
        >
          {isVerifying ? 'Verifying...' : 'Verify & Complete Signup'}
        </button>

        <div className="modal-otp-footer">
          <p>
            Didn't receive the code?{' '}
            {verificationState.resendAvailableInSeconds > 0 ? (
              <span className="resend-timer">
                Resend in {verificationState.resendAvailableInSeconds}s
              </span>
            ) : (
              <button
                type="button"
                className="resend-link"
                onClick={handleResendOtp}
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </p>
          <button
            type="button"
            className="back-btn"
            onClick={() => setVerificationState(null)}
          >
            Back to Edit Info
          </button>
        </div>
      </form>
    </div>
  );

  const renderSignupContent = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="signup-modal-form">
      {/* Personal Info */}
      <div className="form-section-title">Personal Information</div>

      <div className="form-group">
        <label>
          <span className="label-icon">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M3 19C3 15.134 6.13401 12 10 12C13.866 12 17 15.134 17 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          Full Name *
        </label>
        <input
          className="form-control"
          placeholder="Enter your full name"
          {...register("name", { validate: nameValidator })}
        />
        {errors.name && <p className="error-text">{errors.name.message}</p>}
      </div>

      <div className="form-group">
        <label>
          <span className="label-icon">
            <svg width="16" height="16" viewBox="0 -3 20 20" fill="none">
              <path d="M3 4H17C18.1 4 19 4.9 19 6V14C19 15.1 18.1 16 17 16H3C1.9 16 1 15.1 1 14V6C1 4.9 1.9 4 3 4Z" stroke="currentColor" strokeWidth="2" />
              <path d="M19 6L10 11L1 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          Email Address *
        </label>
        <input
          className="form-control"
          placeholder="your.email@example.com"
          type="email"
          {...register("email", { validate: emailValidator })}
        />
        {errors.email && <p className="error-text">{errors.email.message}</p>}
      </div>

      <div className="form-row">
        <div className="form-group password-field">
          <label>
            <span className="label-icon">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="9" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M6 9V6C6 3.79 7.79 2 10 2C12.21 2 14 3.79 14 6V9" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            Password *
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "password" : "text"}
              placeholder="At least 8 characters (A-Z, a-z, 0-9, @$!%*?&)"
              {...register("password", {
                validate: passwordValidator,
              })}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5 0-9.27-3.11-11-8 1.05-2.96 3-5.27 5.47-6.78" />
                  <path d="M1 1l22 22" />
                  <path d="M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8a11.83 11.83 0 01-3.11 4.86" />
                  <path d="M14.12 14.12a3 3 0 01-4.24-4.24" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && <p className="error-text">{errors.password.message}</p>}
        </div>

        <div className="form-group password-field">
          <label>Confirm Password *</label>
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? "password" : "text"}
              className="form-control"
              placeholder="Re-enter password"
              {...register("confirmPassword", {
                required: "Confirm password required",
                validate: (value) => value === watchedPassword || "Passwords do not match",
              })}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.94 10.94 0 0112 20c-5 0-9.27-3.11-11-8 1.05-2.96 3-5.27 5.47-6.78" />
                  <path d="M1 1l22 22" />
                  <path d="M9.9 4.24A10.94 10.94 0 0112 4c5 0 9.27 3.11 11 8a11.83 11.83 0 01-3.11 4.86" />
                  <path d="M14.12 14.12a3 3 0 01-4.24-4.24" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Phone Number *</label>
          <input
            className="form-control"
            placeholder="Enter phone number"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            {...register("phone", {
              validate: phoneValidator,
              setValueAs: (value) => String(value ?? "").replace(/\D/g, "").slice(0, 10),
            })}
            onInput={(event) => {
              event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 10);
            }}
          />
          {errors.phone && <p className="error-text">{errors.phone.message}</p>}
        </div>

        <div className="form-group">
          <label>Blood Group *</label>
          <select
            className="form-control"
            {...register("bloodGroup", { required: "Blood group required" })}
          >
            <option value="">Select Blood Group</option>
            {BLOOD_GROUPS.map((group) => (
              <option key={group}>{group}</option>
            ))}
          </select>
          {errors.bloodGroup && <p className="error-text">{errors.bloodGroup.message}</p>}
        </div>
      </div>

      <div className="form-group-checkbox">
        <label className="checkbox-label">
          <input type="checkbox" {...register("isDonor")} />
          <span>I want to register as a blood donor</span>
        </label>
      </div>

      <div className="form-group-checkbox">
        <label className="checkbox-label">
          <input type="checkbox" {...register("needsBlood")} />
          <span>I need blood / Looking for blood donors</span>
        </label>
      </div>

      <div className="form-section-title">Address (Optional)</div>

      <div className="form-row">
        <div className="form-group">
          <label>Street</label>
          <input className="form-control" {...register("address.street")} />
        </div>

        <div className="form-group">
          <label>City</label>
          <input className="form-control" {...register("address.city")} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>State</label>
          <input className="form-control" {...register("address.state")} />
        </div>

        <div className="form-group">
          <label>Pincode</label>
          <input
            className="form-control"
            type="text"
            inputMode="numeric"
            maxLength={6}
            {...register("address.pincode", {
              setValueAs: (value) => String(value ?? "").replace(/\D/g, "").slice(0, 6),
              validate: (val) => !val || pincodeValidator(val) === true || pincodeValidator(val),
            })}
            onInput={(event) => {
              event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 6);
            }}
          />
          {errors.address?.pincode && <p className="error-text">{errors.address.pincode.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        className={`btn btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
        disabled={loading}
      >
        {loading ? 'Creating Account...' : 'Sign Up'}
      </button>

      <div className="divider">
        <span>OR</span>
      </div>

      <button
        type="button"
        className={`btn-google ${isGoogleLoading ? 'btn-loading' : ''}`}
        onClick={handleGoogleSignup}
        disabled={isGoogleLoading || loading}
      >
        {!isGoogleLoading && (
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        {isGoogleLoading ? "Connecting..." : "Continue with Google"}
      </button>

      <div className="blood-bank-register-link">
        <p>
          Are you a Blood Bank?{" "}
          <Link to={ROUTE_PATH.BLOOD_BANK_REGISTER} onClick={onClose}>
            Register here
          </Link>
        </p>
      </div>
    </form>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={verificationState ? "Identify Yourself" : "Create Your Account"}>
      <div className="signup-modal-body">
        {verificationState ? renderOtpContent() : renderSignupContent()}
      </div>
    </Modal>
  );
};

export default SignupModal;
