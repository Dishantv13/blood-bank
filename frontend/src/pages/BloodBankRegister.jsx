import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useRegisterBloodBankMutation } from '../store/bloodBankApi';
import { useToast } from '../components/ToastContainer';
import ThemeToggle from "../components/ThemeToggle";
import { ROUTE_PATH } from '../enum/routePath';
import {
  bloodBankNameValidator,
  emailValidator,
  licenseNumberValidator,
  nameValidator,
  optionalEmailValidator,
  optionalPhoneValidator,
  phoneValidator,
  pincodeValidator,
  registrationNumberValidator,
  yearValidator,
} from '../validation/validation';
import '../pages.css/BloodBankAuth.css';

const BloodBankRegister = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState(null);
  const [locationShared, setLocationShared] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);

  const [registerBloodBank] = useRegisterBloodBankMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      logo: '',
      licenseNumber: '',
      registrationNumber: '',
      establishedYear: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      openTime: '09:00',
      closeTime: '18:00',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      services: [],
      contactPersonName: '',
      contactPersonPhone: '',
      contactPersonEmail: '',
    },
    mode: 'onTouched',
  });

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const allServices = [
    'Whole Blood',
    'Plasma',
    'Platelets',
    'Red Blood Cells',
    'Blood Testing',
    'Blood Camp Organization',
    'Emergency Services',
    '24/7 Availability'
  ];
  const watchedWorkingDays = watch('workingDays') || [];
  const watchedServices = watch('services') || [];
  const watchedPassword = watch('password');

  useEffect(() => {
    register('workingDays', {
      validate: (value) =>
        (value && value.length > 0) || 'Please select at least one working day',
    });
    register('services', {
      validate: (value) =>
        (value && value.length > 0) || 'Please select at least one service',
    });
  }, [register]);

  const getStepError = () => {
    if (formError) return formError;

    if (step === 1) {
      return (
        errors.name?.message ||
        errors.email?.message ||
        errors.phone?.message ||
        errors.password?.message ||
        errors.confirmPassword?.message
      );
    }

    if (step === 2) {
      return (
        errors.licenseNumber?.message ||
        errors.address?.message ||
        errors.city?.message ||
        errors.state?.message ||
        errors.pincode?.message ||
        errors.establishedYear?.message
      );
    }

    return errors.workingDays?.message || errors.services?.message;
  };

  const handleDayToggle = (day) => {
    const updatedDays = watchedWorkingDays.includes(day)
      ? watchedWorkingDays.filter((d) => d !== day)
      : [...watchedWorkingDays, day];

    setValue('workingDays', updatedDays, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    setFormError('');
  };

  const handleServiceToggle = (service) => {
    const updatedServices = watchedServices.includes(service)
      ? watchedServices.filter((s) => s !== service)
      : [...watchedServices, service];

    setValue('services', updatedServices, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    setFormError('');
  };

  const validateStep = async () => {
    setFormError('');

    if (step === 1) {
      return trigger(['name', 'email', 'phone', 'password', 'confirmPassword']);
    }

    if (step === 2) {
      const isValid = await trigger([
        'licenseNumber',
        'address',
        'city',
        'state',
        'pincode',
        'establishedYear',
      ]);

      if (!isValid) return false;

      if (!locationShared) {
        const message = 'Please share your location';
        setFormError(message);
        toast.warning(message);
        return false;
      }

      return true;
    }

    const isValid = await trigger(['workingDays', 'services']);
    if (!isValid) return false;

    if ((getValues('workingDays') || []).length === 0) {
      setError('workingDays', {
        type: 'manual',
        message: 'Please select at least one working day',
      });
      return false;
    }

    if ((getValues('services') || []).length === 0) {
      setError('services', {
        type: 'manual',
        message: 'Please select at least one service',
      });
      return false;
    }

    return true;
  };

  const nextStep = async () => {
    const isValid = await validateStep();
    if (isValid) {
      setStep(step + 1);
      setFormError('');
      toast.info(`Step ${step + 1} of 3`);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setFormError('');
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          type: 'Point',
          coordinates: [position.coords.longitude, position.coords.latitude]
        };
        setLocation(loc);
        setLocationShared(true);
        setGettingLocation(false);
        clearErrors('location');
        setFormError('');
        toast.success('Location captured successfully!');
      },
      (err) => {
        const message = `Failed to get location: ${err.message}`;
        setFormError(message);
        toast.error(message);
        setGettingLocation(false);
      }
    );
  };

    const onSubmit = async (data) => {
      const isValid = await validateStep();
      if (!isValid) return;

      if (!locationShared) {
        const message = 'Please share your location';
        setFormError(message);
        toast.warning(message);
        return;
      }

      setFormError('');

    try {
      const submitData = {
          ...data,
        operatingHours: {
            open: data.openTime,
            close: data.closeTime,
            days: data.workingDays
        },
        location: location || undefined
      };
      
      const response = await registerBloodBank(submitData).unwrap();
      toast.success('Registration successful! Please login.');
      navigate(ROUTE_PATH.BLOOD_BANK_LOGIN, { state: { message: 'Registration successful! Please login.' } });
    } catch (err) {
      console.error('Registration error:', err.data || err.message);
      const errorMessage = err.data?.message || err.data?.error || 'Registration failed. Please try again.';
      setFormError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3].map((s) => (
        <div key={s} className={`step ${step >= s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
          <div className="step-number">
            {step > s ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : s}
          </div>
          <span className="step-label">
            {s === 1 && 'Account'}
            {s === 2 && 'Details'}
            {s === 3 && 'Services'}
          </span>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <>
      <div className="form-group">
        <label htmlFor="name">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Blood Bank Name *
        </label>
        <input
          type="text"
          id="name"
          placeholder="Enter blood bank name"
          {...register('name', { validate: bloodBankNameValidator })}
        />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="email">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          placeholder="bloodbank@example.com"
          {...register('email', { validate: emailValidator })}
        />
        {errors.email && <p className="field-error">{errors.email.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="phone">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
          Phone Number *
        </label>
        <input
          type="tel"
          id="phone"
          placeholder="Enter phone number"
          inputMode="numeric"
          maxLength={10}
          onInput={(e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
          }}
          {...register('phone', { validate: phoneValidator })}
        />
        {errors.phone && <p className="field-error">{errors.phone.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Logo URL (Optional)
        </label>
        <input
          type="url"
          id="logo"
          placeholder="https://example.com/logo.png"
          {...register('logo', {
            validate: (value) => {
              if (!value) return true;
              try {
                new URL(value);
                return true;
              } catch {
                return 'Enter a valid logo URL';
              }
            },
          })}
        />
        {errors.logo && <p className="field-error">{errors.logo.message}</p>}
      </div>

      <div className="form-row">
        <div className="form-group password-field">
          <label htmlFor="password">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Password *
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'password' : 'text'}
              id="password"
              placeholder="Min 6 characters"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Show password' : 'Hide password'}
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
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>

        <div className="form-group password-field">
          <label htmlFor="confirmPassword">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
            Confirm Password *
          </label>
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? 'password' : 'text'}
              id="confirmPassword"
              placeholder="Confirm password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === watchedPassword || 'Passwords do not match',
              })}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Show confirm password' : 'Hide confirm password'}
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
            <p className="field-error">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="licenseNumber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            License Number *
          </label>
          <input
            type="text"
            id="licenseNumber"
            placeholder="Enter license number"
            {...register('licenseNumber', { validate: licenseNumberValidator })}
          />
          {errors.licenseNumber && (
            <p className="field-error">{errors.licenseNumber.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="registrationNumber">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Registration Number
          </label>
          <input
            type="text"
            id="registrationNumber"
            placeholder="Optional"
            {...register('registrationNumber', { validate: registrationNumberValidator })}
          />
          {errors.registrationNumber && (
            <p className="field-error">{errors.registrationNumber.message}</p>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="address">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Address *
        </label>
        <input
          type="text"
          id="address"
          placeholder="Street address"
          {...register('address', { required: 'Address is required' })}
        />
        {errors.address && <p className="field-error">{errors.address.message}</p>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="city">City *</label>
          <input
            type="text"
            id="city"
            placeholder="City"
            {...register('city', { required: 'City is required' })}
          />
          {errors.city && <p className="field-error">{errors.city.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="state">State *</label>
          <input
            type="text"
            id="state"
            placeholder="State"
            {...register('state', { required: 'State is required' })}
          />
          {errors.state && <p className="field-error">{errors.state.message}</p>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="pincode">Pincode *</label>
          <input
            type="text"
            id="pincode"
            placeholder="Pincode"
            inputMode="numeric"
            maxLength={6}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            }}
            {...register('pincode', {
              setValueAs: (value) => String(value ?? '').replace(/\D/g, '').slice(0, 6),
              validate: pincodeValidator,
            })}
          />
          {errors.pincode && <p className="field-error">{errors.pincode.message}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="establishedYear">Established Year</label>
          <input
            type="number"
            id="establishedYear"
            placeholder="e.g., 2010"
            min="1900"
            max={new Date().getFullYear()}
            {...register('establishedYear', { validate: yearValidator })}
          />
          {errors.establishedYear && (
            <p className="field-error">{errors.establishedYear.message}</p>
          )}
        </div>
      </div>

      <div className="form-group location-section">
        <label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Share Location (Required) *
        </label>
        <button
          type="button"
          className={`btn-location ${locationShared ? 'shared' : ''}`}
          onClick={handleGetLocation}
          disabled={gettingLocation}
        >
          {gettingLocation ? (
            <>
              <span className="spinner-small"></span>
              Getting Location...
            </>
          ) : locationShared ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Location Shared
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Share My Location
            </>
          )}
        </button>
        {locationShared && location && (
          <div className="location-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>
              Location: {location.coordinates[1].toFixed(6)}, {location.coordinates[0].toFixed(6)}
            </span>
          </div>
        )}
        {!locationShared && step === 2 && formError === 'Please share your location' && (
          <p className="field-error">Please share your location</p>
        )}
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      <div className="form-group">
        <label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Operating Hours
        </label>
        <div className="operating-hours-grid">
          <div className="time-input-group">
            <small>Opening Time</small>
            <input
              type="time"
              {...register('openTime')}
            />
          </div>
          <div className="time-input-group">
            <small>Closing Time</small>
            <input
              type="time"
              {...register('closeTime')}
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Working Days *</label>
        <div className="services-grid">
          {allDays.map(day => (
            <label key={day} className="service-checkbox">
              <input
                type="checkbox"
                checked={watchedWorkingDays.includes(day)}
                onChange={() => handleDayToggle(day)}
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
        {errors.workingDays && <p className="field-error">{errors.workingDays.message}</p>}
      </div>

      <div className="form-group">
        <label>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Services Offered *
        </label>
        <div className="services-grid">
          {allServices.map(service => (
            <label key={service} className="service-checkbox">
              <input
                type="checkbox"
                checked={watchedServices.includes(service)}
                onChange={() => handleServiceToggle(service)}
              />
              <span>{service}</span>
            </label>
          ))}
        </div>
        {errors.services && <p className="field-error">{errors.services.message}</p>}
      </div>

      <div className="form-group">
        <label htmlFor="contactPersonName">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Contact Person Name
        </label>
        <input
          type="text"
          id="contactPersonName"
          placeholder="Primary contact name"
          {...register('contactPersonName', {
            validate: (value) => {
              if (!String(value ?? '').trim()) return true;
              return nameValidator(value);
            },
          })}
        />
        {errors.contactPersonName && (
          <p className="field-error">{errors.contactPersonName.message}</p>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="contactPersonPhone">Contact Person Phone</label>
          <input
            type="tel"
            id="contactPersonPhone"
            placeholder="Optional contact phone"
            inputMode="numeric"
            maxLength={10}
            onInput={(e) => {
              e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
            }}
            {...register('contactPersonPhone', {
              setValueAs: (value) => String(value ?? '').replace(/\D/g, '').slice(0, 10),
              validate: optionalPhoneValidator,
            })}
          />
          {errors.contactPersonPhone && (
            <p className="field-error">{errors.contactPersonPhone.message}</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="contactPersonEmail">Contact Person Email</label>
          <input
            type="email"
            id="contactPersonEmail"
            placeholder="Optional contact email"
            {...register('contactPersonEmail', {
              validate: optionalEmailValidator,
            })}
          />
          {errors.contactPersonEmail && (
            <p className="field-error">{errors.contactPersonEmail.message}</p>
          )}
        </div>
      </div>
    </>
  );

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
          <h1>Join Our Network</h1>
          <p>Register your blood bank and connect with thousands of donors</p>
        </div>
        
        <div className="auth-features">
          <div className="feature-item1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Quick Registration Process</span>
          </div>
          <div className="feature-item1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Verified & Secure Platform</span>
          </div>
          <div className="feature-item1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            <span>Large Donor Network</span>
          </div>
        </div>
      </div>

      <div className="auth-right-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Register Blood Bank</h2>
            <p>Create your blood bank account</p>
          </div>

          {renderStepIndicator()}

          {getStepError() && (
            <div className="auth-alert auth-alert-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {getStepError()}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="form-navigation">
              {step > 1 && (
                <button type="button" onClick={prevStep} className="auth-btn auth-btn-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="12" x2="5" y2="12"/>
                    <polyline points="12 19 5 12 12 5"/>
                  </svg>
                  Back
                </button>
              )}
              
              {step < 3 ? (
                <button type="button" onClick={nextStep} className="auth-btn">
                  Next
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              ) : (
                <button type="submit" className="auth-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      Register
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to={ROUTE_PATH.BLOOD_BANK_LOGIN}>Sign in here</Link>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .step-indicator {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-bottom: 2rem;
        }
        
        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        
        .step-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e0e0e0;
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        
        .step.active .step-number {
          background: #e63946;
          color: white;
        }
        
        .step.completed .step-number {
          background: #16a34a;
          color: white;
        }
        
        .step.completed .step-number svg {
          width: 20px;
          height: 20px;
        }
        
        .step-label {
          font-size: 0.85rem;
          color: #888;
          font-weight: 500;
        }
        
        .step.active .step-label,
        .step.completed .step-label {
          color: #333;
        }
        
        .form-navigation {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        
        .form-navigation .auth-btn {
          flex: 1;
        }
        
        .auth-btn-secondary {
          background: #f0f0f0 !important;
          color: #333 !important;
        }
        
        .auth-btn-secondary:hover {
          background: #e0e0e0 !important;
          box-shadow: none !important;
        }

        .field-error {
          color: #dc2626;
          font-size: 0.85rem;
          margin-top: 0.35rem;
        }

        .password-field {
          position: relative;
        }

        .password-input-wrapper {
          position: relative;
        }

        .password-input-wrapper input {
          width: 100%;
          padding-right: 2.8rem;
        }

        .password-toggle {
          position: absolute;
          right: 0.9rem;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 0.15rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .password-toggle svg {
          width: 18px;
          height: 18px;
        }
      `}</style>
      </div>
    </div>
  );
};

export default BloodBankRegister;
