import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';
import ImageSlider from '../components/ImageSlider';
import { ROUTE_PATH } from '../enum/routePath';
import {
  nameValidator,
  emailValidator,
  phoneValidator,
  pincodeValidator,
} from '../validation/validation';
import { BLOOD_GROUPS, MIN_PASSWORD_LENGTH } from '../config/constants';
import '../pages.css/Auth.css';

const defaultFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  bloodGroup: '',
  isDonor: false,
  isAvailable: false,
  needsBlood: false,
  address: {
    street: '',
    city: '',
    state: '',
    pincode: '',
  },
};

const keepOnlyDigits = (event, maxLength) => {
  const digits = String(event.target.value ?? '').replace(/\D/g, '');
  event.target.value = digits.slice(0, maxLength);
};

const Signup = () => {
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: defaultFormValues,
    mode: 'onBlur',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  const watchedPassword = watch('password');
  const watchedIsDonor = watch('isDonor');
  const watchedIsAvailable = watch('isAvailable');
  const watchedNeedsBlood = watch('needsBlood');

  const { register: registerUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const onSubmit = async (data) => {
    setError('');

    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (data.password.length < MIN_PASSWORD_LENGTH) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...registrationData } = data;
    registrationData.phone = String(registrationData.phone ?? '').replace(/\D/g, '').slice(0, 10);
    registrationData.address = {
      ...registrationData.address,
      pincode: String(registrationData.address?.pincode ?? '').replace(/\D/g, '').slice(0, 6),
    };

    if (!registrationData.isDonor) {
      registrationData.isAvailable = false;
    }

    const result = await registerUser(registrationData);
    
    setLoading(false);
    
    if (result.success) {
      toast.success('Account created successfully! Welcome to RaktSarthi.');
      setTimeout(() => navigate(ROUTE_PATH.DASHBOARD), 1000);
    } else {
      setError(result.message);
      toast.error(result.message || 'Failed to create account. Please try again.');
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle({ mode: 'signup' });
    } catch (err) {
      setError('An error occurred during Google signup.');
      toast.error('An error occurred during Google signup.');
    } finally {
      setLoading(false);
    }
  };

  // bloodGroups imported from constants

  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        {/* Left Side - Image Slider */}
        <div className="login-slider">
          <ImageSlider />
        </div>

        {/* Right Side - Signup Form */}
        <div className="login-form-section">
        <div className="login-form-container signup-form-container">
          <div className="form-header">
            <h2>Create Your Account</h2>
            <p>Join us in saving lives through blood donation</p>
          </div>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </span>
              <span>{error}</span>
            </div>
          )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                className="form-control"
                {...register('name', {
                  validate: nameValidator,
                })}
                placeholder="Enter your full name"
              />
              {errors.name && <small className="error-message">{errors.name.message}</small>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                className="form-control"
                {...register('email', {
                  validate: emailValidator,
                })}
                placeholder="Enter your email"
              />
              {errors.email && <small className="error-message">{errors.email.message}</small>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group password-field">
              <label htmlFor="password">Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "password" : "text"}
                  id="password"
                  className="form-control"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  placeholder="At least 6 characters"
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
              {errors.password && <small className="error-message">{errors.password.message}</small>}
            </div>

            <div className="form-group password-field">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "password" : "text"}
                  id="confirmPassword"
                  className="form-control"
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === watchedPassword || 'Passwords do not match',
                  })}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Show confirm password" : "Hide confirm password"}
                >
                  {showConfirmPassword ? (
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
              {errors.confirmPassword && (
                <small className="error-message">{errors.confirmPassword.message}</small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                className="form-control"
                inputMode="numeric"
                maxLength={10}
                onInput={(event) => keepOnlyDigits(event, 10)}
                {...register('phone', {
                  setValueAs: (value) => String(value ?? '').replace(/\D/g, '').slice(0, 10),
                  validate: phoneValidator,
                })}
                placeholder="Enter your phone number"
              />
              {errors.phone && <small className="error-message">{errors.phone.message}</small>}
            </div>

            <div className="form-group">
              <label htmlFor="bloodGroup">Blood Group *</label>
              <select
                id="bloodGroup"
                className="form-control"
                {...register('bloodGroup', {
                  required: 'Blood group is required',
                })}
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              {errors.bloodGroup && <small className="error-message">{errors.bloodGroup.message}</small>}
            </div>
          </div>

          <div className="donor-selection-section">
            <div className="form-group">
              <label>I want to register as a blood donor *</label>
              <div className="option-cards">
                <label 
                  className={`option-card ${watchedIsDonor === true ? 'selected' : ''}`}
                  onClick={() => setValue('isDonor', true, { shouldDirty: true })}
                >
                  <input
                    type="radio"
                    name="isDonor"
                    value="true"
                    {...register('isDonor')}
                    checked={watchedIsDonor === true}
                    onChange={() => setValue('isDonor', true, { shouldDirty: true })}
                  />
                  <div className="option-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                    <span className="option-title">Yes</span>
                    <small>I want to help save lives</small>
                  </div>
                </label>

                <label 
                  className={`option-card ${watchedIsDonor === false ? 'selected' : ''}`}
                  onClick={() => setValue('isDonor', false, { shouldDirty: true })}
                >
                  <input
                    type="radio"
                    name="isDonor"
                    value="false"
                    {...register('isDonor')}
                    checked={watchedIsDonor === false}
                    onChange={() => setValue('isDonor', false, { shouldDirty: true })}
                  />
                  <div className="option-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <span className="option-title">No</span>
                    <small>Not at this time</small>
                  </div>
                </label>
              </div>
            </div>

            {watchedIsDonor && (
              <div className="form-group">
                <label>Available for donation?</label>
                <div className="option-cards">
                  <label 
                    className={`option-card ${watchedIsAvailable === true ? 'selected' : ''}`}
                    onClick={() => setValue('isAvailable', true, { shouldDirty: true })}
                  >
                    <input
                      type="radio"
                      name="isAvailable"
                      value="true"
                      {...register('isAvailable')}
                      checked={watchedIsAvailable === true}
                      onChange={() => setValue('isAvailable', true, { shouldDirty: true })}
                    />
                    <div className="option-content">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span className="option-title">Yes</span>
                      <small>Ready to donate</small>
                    </div>
                  </label>

                  <label 
                    className={`option-card ${watchedIsAvailable === false ? 'selected' : ''}`}
                    onClick={() => setValue('isAvailable', false, { shouldDirty: true })}
                  >
                    <input
                      type="radio"
                      name="isAvailable"
                      value="false"
                      {...register('isAvailable')}
                      checked={watchedIsAvailable === false}
                      onChange={() => setValue('isAvailable', false, { shouldDirty: true })}
                    />
                    <div className="option-content">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <span className="option-title">No</span>
                      <small>Not available now</small>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>I need blood / Looking for blood donors *</label>
              <div className="option-cards">
                <label 
                  className={`option-card ${watchedNeedsBlood === true ? 'selected' : ''}`}
                  onClick={() => setValue('needsBlood', true, { shouldDirty: true })}
                >
                  <input
                    type="radio"
                    name="needsBlood"
                    value="true"
                    {...register('needsBlood')}
                    checked={watchedNeedsBlood === true}
                    onChange={() => setValue('needsBlood', true, { shouldDirty: true })}
                  />
                  <div className="option-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                    </svg>
                    <span className="option-title">Yes</span>
                    <small>I need blood urgently</small>
                  </div>
                </label>

                <label 
                  className={`option-card ${watchedNeedsBlood === false ? 'selected' : ''}`}
                  onClick={() => setValue('needsBlood', false, { shouldDirty: true })}
                >
                  <input
                    type="radio"
                    name="needsBlood"
                    value="false"
                    {...register('needsBlood')}
                    checked={watchedNeedsBlood === false}
                    onChange={() => setValue('needsBlood', false, { shouldDirty: true })}
                  />
                  <div className="option-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <span className="option-title">No</span>
                    <small>Not looking for blood</small>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="form-section-title">Address (Optional)</div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="address.street">Street</label>
              <input
                type="text"
                id="address.street"
                className="form-control"
                {...register('address.street')}
                placeholder="Street address"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address.city">City</label>
              <input
                type="text"
                id="address.city"
                className="form-control"
                {...register('address.city')}
                placeholder="City"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="address.state">State</label>
              <input
                type="text"
                id="address.state"
                className="form-control"
                {...register('address.state')}
                placeholder="State"
              />
            </div>

            <div className="form-group">
              <label htmlFor="address.pincode">Pincode</label>
              <input
                type="text"
                id="address.pincode"
                className="form-control"
                inputMode="numeric"
                maxLength={6}
                onInput={(event) => keepOnlyDigits(event, 6)}
                {...register('address.pincode', {
                  setValueAs: (value) => String(value ?? '').replace(/\D/g, '').slice(0, 6),
                  validate: (value) => {
                    if (!String(value ?? '').trim()) return true;
                    return pincodeValidator(value);
                  },
                })}
                placeholder="Pincode"
              />
              {errors.address?.pincode && (
                <small className="error-message">{errors.address.pincode.message}</small>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              <>
                <span className="btn-icon">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M16 6L8 14L4 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                Sign Up
              </>
            )}
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <button 
            type="button" 
            className="btn-google" 
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <div className="form-footer">
          <p>
            Already have an account? <Link to={ROUTE_PATH.LOGIN} className="form-link">Login here</Link>
          </p>
        </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Signup;
