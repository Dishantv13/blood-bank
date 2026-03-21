import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';
import { useUpdateDonorInfoMutation } from '../store/userApi';
import { nameValidator, phoneValidator, pincodeValidator } from '../validation/validation';
import '../pages.css/DonorHealthForm.css';

const defaultFormValues = {
  // Personal Health Info
  weight: '',
  height: '',
  dateOfBirth: '',
  gender: '',

  // Last Donation Info
  lastDonationDate: '',
  totalDonations: 0,

  // Medical History
  bloodPressure: '',
  hemoglobinLevel: '',

  // Disease Screening
  diseases: {
    hiv: false,
    hepatitisB: false,
    hepatitisC: false,
    malaria: false,
    tuberculosis: false,
    heartDisease: false,
    diabetes: false,
    cancer: false,
    bloodDisorder: false,
    epilepsy: false,
  },

  // Recent Conditions
  recentConditions: {
    fever: false,
    coldOrFlu: false,
    antibiotics: false,
    surgery: false,
    tattooOrPiercing: false,
    pregnancy: false,
    vaccination: false,
  },

  // Lifestyle
  lifestyle: {
    alcohol: '',
    smoking: '',
    drugUse: false,
  },

  // Emergency Contact
  emergencyContact: {
    name: '',
    phone: '',
    relationship: '',
  },

  // Address (optional)
  address: {
    pincode: '',
  },

  // Consent
  consent: {
    informationAccurate: false,
    consentToDonate: false,
    understandsProcess: false,
  },
};

const keepOnlyDigits = (event, maxLength) => {
  const digits = String(event.target.value ?? '').replace(/\D/g, '');
  event.target.value = digits.slice(0, maxLength);
};

const DonorHealthForm = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [locationShared, setLocationShared] = useState(false);
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [aadharPreview, setAadharPreview] = useState(null);
  const [updateDonorInfo, { isLoading }] = useUpdateDonorInfoMutation();
  const {
    register,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: defaultFormValues,
    mode: 'onBlur',
  });
  watch();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Load existing donor info/health form if available
    const infoSource = user?.healthForm || user?.donorInfo;
    if (infoSource) {
      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return isNaN(d) ? '' : d.toISOString().split('T')[0];
      };

      const healthData = user?.healthForm || {};
      // Handle mapping from healthForm naming (medicalConditions) back to frontend (diseases) if needed
      // or simply rely on the populated object's fields.
      
      reset({
        ...defaultFormValues,
        ...user.donorInfo,
        ...healthData,
        // Reverse mapping for diseases/conditions if they differ
        diseases: healthData.medicalConditions ? {
          hiv: healthData.medicalConditions.hivAids,
          hepatitisB: healthData.medicalConditions.hepatitisBC,
          hepatitisC: healthData.medicalConditions.hepatitisBC,
          malaria: healthData.medicalConditions.malaria,
          tuberculosis: healthData.medicalConditions.tuberculosis,
          heartDisease: healthData.medicalConditions.heartDisease,
          diabetes: healthData.medicalConditions.diabetes,
          cancer: healthData.medicalConditions.cancer,
        } : (user.donorInfo?.diseases || defaultFormValues.diseases),
        dateOfBirth: formatDate(user.donorInfo?.dateOfBirth || healthData.dateOfBirth),
        lastDonationDate: formatDate(user.donorInfo?.lastDonationDate || healthData.donationHistory?.lastDonationDate),
      });
    }
  }, [user, reset]);

  const calculateEligibility = (data) => {
    // Check if any disease is present
    const hasDisease = Object.values(data.diseases).some(v => v === true);
    const hasRecentCondition = Object.values(data.recentConditions).some(v => v === true);
    
    // Check weight (minimum 50kg)
    const weightOk = parseFloat(data.weight) >= 50;
    
    // Check age (18-65)
    const birthDate = new Date(data.dateOfBirth);
    const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    const ageOk = age >= 18 && age <= 65;
    
    // Check last donation (minimum 3 months gap)
    let donationGapOk = true;
    if (data.lastDonationDate) {
      const lastDonation = new Date(data.lastDonationDate);
      const monthsGap = Math.floor((new Date() - lastDonation) / (30 * 24 * 60 * 60 * 1000));
      donationGapOk = monthsGap >= 3;
    }
    
    return {
      eligible: !hasDisease && !hasRecentCondition && weightOk && ageOk && donationGapOk,
      reasons: {
        hasDisease,
        hasRecentCondition,
        weightOk,
        ageOk,
        donationGapOk
      }
    };
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setLocation(coords);
        setLocationShared(true);
        setGettingLocation(false);
        setSuccess('Location shared successfully!');
        setTimeout(() => setSuccess(''), 2000);
      },
      (error) => {
        setGettingLocation(false);
        setError(`Unable to retrieve location: ${error.message}`);
        setTimeout(() => setError(''), 3000);
      }
    );
  };

  const handleAadharChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Aadhar image size should be less than 5MB');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPG, JPEG, or PNG)');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAadharPreview(reader.result);
      };
      reader.readAsDataURL(file);
      toast.success('Aadhar card uploaded successfully!');
    }
  };

  const removeAadhar = () => {
    setAadharPreview(null);
  };

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');

    // Fixed consent validation - check the nested object structure
    if (!data.consent?.informationAccurate || !data.consent?.consentToDonate || !data.consent?.understandsProcess) {
      setError('Please accept all consent declarations');
      return;
    }

    const eligibility = calculateEligibility(data);
    
    try {
      const submitData = {
        ...data,
        isEligible: eligibility.eligible,
        eligibilityReasons: eligibility.reasons,
        lastUpdated: new Date().toISOString()
      };

      submitData.emergencyContact = {
        ...submitData.emergencyContact,
        phone: String(submitData.emergencyContact?.phone ?? '').replace(/\D/g, '').slice(0, 10),
      };

      submitData.address = {
        ...submitData.address,
        pincode: String(submitData.address?.pincode ?? '').replace(/\D/g, '').slice(0, 6),
      };

      // Add location if shared
      if (location) {
        submitData.location = {
          type: 'Point',
          coordinates: [location.longitude, location.latitude]
        };
      }

      const response = await updateDonorInfo(submitData).unwrap();
      
      const updatedUser = response?.user || response?.data || response;
      if (updatedUser) setUser(updatedUser);
      
      const successMessage = eligibility.eligible 
        ? 'Your information has been saved! You are eligible to donate blood.' 
        : 'Your information has been saved. Based on your responses, you may not be eligible to donate at this time.';
      setSuccess(successMessage);
      toast.success(successMessage);
      
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err) {
      setError(err.data?.message || 'Failed to save information');
      toast.error(err.data?.message || 'Failed to save your health information. Please try again.');
    }
  };

  return (
    <div className="donor-form-container">
      <div className="donor-form-header">
        <h1>Donor Health Questionnaire</h1>
        <p>Please fill out this form accurately to determine your eligibility for blood donation</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="donor-health-form">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Personal Information */}
        <section className="form-section">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 20C4 16.134 7.58172 13 12 13C16.4183 13 20 16.134 20 20" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Personal Information
          </h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Weight (kg) *</label>
              <input
                type="number"
                {...register('weight', {
                  required: 'Weight is required',
                  min: {
                    value: 50,
                    message: 'Minimum 50kg required for donation',
                  },
                })}
                min="30"
                max="200"
                placeholder="e.g., 65"
              />
              {errors.weight && <small className="error-message">{errors.weight.message}</small>}
              <small>Minimum 50kg required for donation</small>
            </div>

            <div className="form-group">
              <label>Height (cm) *</label>
              <input
                type="number"
                {...register('height', {
                  required: 'Height is required',
                  min: {
                    value: 100,
                    message: 'Enter a valid height',
                  },
                })}
                min="100"
                max="250"
                placeholder="e.g., 170"
              />
              {errors.height && <small className="error-message">{errors.height.message}</small>}
            </div>

            <div className="form-group">
              <label>Date of Birth *</label>
              <input
                type="date"
                {...register('dateOfBirth', {
                  required: 'Date of birth is required',
                  validate: (value) => {
                    const birthDate = new Date(value);
                    const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
                    return (age >= 18 && age <= 65) || 'Age must be between 18 and 65 years';
                  },
                })}
              />
              {errors.dateOfBirth && <small className="error-message">{errors.dateOfBirth.message}</small>}
              <small>Age must be between 18-65 years</small>
            </div>

            <div className="form-group">
              <label>Gender *</label>
              <select
                {...register('gender', {
                  required: 'Gender is required',
                })}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <small className="error-message">{errors.gender.message}</small>}
            </div>
          </div>

          {/* Location Sharing */}
          <div className="location-section">
            <div className="location-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <label>Share Your Location (Helps patients find donors nearby)</label>
            </div>
            <button
              type="button"
              className={`btn-location ${locationShared ? 'shared' : ''}`}
              onClick={handleGetLocation}
              disabled={gettingLocation || locationShared}
            >
              {gettingLocation ? (
                <>
                  <span className="spinner-small"></span>
                  Getting location...
                </>
              ) : locationShared ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Location Shared
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Share My Location
                </>
              )}
            </button>
            {locationShared && location && (
              <small className="location-info">
                Latitude: {location.latitude.toFixed(6)}, Longitude: {location.longitude.toFixed(6)}
              </small>
            )}
          </div>
        </section>

        {/* Donation History */}
        <section className="form-section">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3C12 3 6 9.5 6 14C6 17.3137 8.68629 20 12 20C15.3137 20 18 17.3137 18 14C18 9.5 12 3 12 3Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Donation History
          </h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Last Donation Date</label>
              <input
                type="date"
                {...register('lastDonationDate')}
                disabled={!!user?.donorInfo?.lastDonationDate}
                className={user?.donorInfo?.lastDonationDate ? 'input-disabled-locked' : ''}
              />
              <small>{user?.donorInfo?.lastDonationDate ? "Date is locked to your latest recorded donation." : "Leave empty if first-time donor"}</small>
            </div>

            <div className="form-group">
              <label>Total Donations Made</label>
              <input
                type="number"
                {...register('totalDonations', {
                  valueAsNumber: true,
                })}
                disabled={!!user?.donorInfo?.totalDonations && user?.donorInfo?.totalDonations > 0}
                className={(user?.donorInfo?.totalDonations && user?.donorInfo?.totalDonations > 0) ? 'input-disabled-locked' : ''}
                min="0"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label>Blood Pressure</label>
              <input
                type="text"
                {...register('bloodPressure')}
                placeholder="e.g., 120/80"
              />
            </div>

            <div className="form-group">
              <label>Hemoglobin Level (g/dL)</label>
              <input
                type="number"
                {...register('hemoglobinLevel', {
                  valueAsNumber: true,
                })}
                step="0.1"
                min="0"
                max="20"
                placeholder="e.g., 14.5"
              />
              <small>Minimum 12.5 g/dL required</small>
            </div>
          </div>
        </section>

        {/* Disease Screening */}
        <section className="form-section">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Disease Screening
          </h2>
          <p className="section-note">Please check if you have ever been diagnosed with any of the following:</p>
          
          <div className="checkbox-grid">
            {[
              { key: 'hiv', label: 'HIV/AIDS' },
              { key: 'hepatitisB', label: 'Hepatitis B' },
              { key: 'hepatitisC', label: 'Hepatitis C' },
              { key: 'malaria', label: 'Malaria (in last 3 years)' },
              { key: 'tuberculosis', label: 'Tuberculosis' },
              { key: 'heartDisease', label: 'Heart Disease' },
              { key: 'diabetes', label: 'Diabetes (on insulin)' },
              { key: 'cancer', label: 'Cancer' },
              { key: 'bloodDisorder', label: 'Blood Disorder' },
              { key: 'epilepsy', label: 'Epilepsy' },
            ].map(disease => (
              <label key={disease.key} className="checkbox-label">
                <input
                  type="checkbox"
                  {...register(`diseases.${disease.key}`)}
                />
                <span className="checkmark"></span>
                {disease.label}
              </label>
            ))}
          </div>
        </section>

        {/* Recent Conditions */}
        <section className="form-section">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Recent Conditions (Last 6 Months)
          </h2>
          <p className="section-note">Check if you have experienced any of the following in the last 6 months:</p>
          
          <div className="checkbox-grid">
            {[
              { key: 'fever', label: 'Fever or infection' },
              { key: 'coldOrFlu', label: 'Cold or Flu' },
              { key: 'antibiotics', label: 'Taking antibiotics' },
              { key: 'surgery', label: 'Surgery or dental procedure' },
              { key: 'tattooOrPiercing', label: 'Tattoo or piercing' },
              { key: 'pregnancy', label: 'Pregnancy or breastfeeding' },
              { key: 'vaccination', label: 'Recent vaccination' },
            ].map(condition => (
              <label key={condition.key} className="checkbox-label">
                <input
                  type="checkbox"
                  {...register(`recentConditions.${condition.key}`)}
                />
                <span className="checkmark"></span>
                {condition.label}
              </label>
            ))}
          </div>
        </section>

        {/* Lifestyle */}
        <section className="form-section">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Lifestyle Information
          </h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Alcohol Consumption</label>
              <select
                {...register('lifestyle.alcohol')}
              >
                <option value="">Select</option>
                <option value="never">Never</option>
                <option value="occasionally">Occasionally</option>
                <option value="regularly">Regularly</option>
              </select>
            </div>

            <div className="form-group">
              <label>Smoking</label>
              <select
                {...register('lifestyle.smoking')}
              >
                <option value="">Select</option>
                <option value="never">Never</option>
                <option value="former">Former smoker</option>
                <option value="current">Current smoker</option>
              </select>
            </div>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              {...register('lifestyle.drugUse')}
            />
            <span className="checkmark"></span>
            History of intravenous drug use
          </label>
        </section>

        {/* Emergency Contact */}
        <section className="form-section">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Emergency Contact
          </h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Contact Name *</label>
              <input
                type="text"
                {...register('emergencyContact.name', {
                  validate: nameValidator,
                })}
                placeholder="Full name"
              />
              {errors.emergencyContact?.name && (
                <small className="error-message">{errors.emergencyContact.name.message}</small>
              )}
            </div>

            <div className="form-group">
              <label>Contact Phone *</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                onInput={(event) => keepOnlyDigits(event, 10)}
                {...register('emergencyContact.phone', {
                  setValueAs: (value) => String(value ?? '').replace(/\D/g, '').slice(0, 10),
                  validate: phoneValidator,
                })}
                placeholder="Phone number"
              />
              {errors.emergencyContact?.phone && (
                <small className="error-message">{errors.emergencyContact.phone.message}</small>
              )}
            </div>

            <div className="form-group">
              <label>Relationship *</label>
              <select
                {...register('emergencyContact.relationship', {
                  required: 'Relationship is required',
                })}
              >
                <option value="">Select</option>
                <option value="myself">Myself</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
              {errors.emergencyContact?.relationship && (
                <small className="error-message">{errors.emergencyContact.relationship.message}</small>
              )}
            </div>
          </div>
        </section>

        <section className="form-section">
          <h2>Address</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Pincode</label>
              <input
                type="text"
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
        </section>

        {/* Aadhar Card Verification */}
        <section className="form-section aadhar-section">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M6 16C6 14 7.5 13 9 13C10.5 13 12 14 12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="15" y1="9" x2="18" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="15" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="15" y1="15" x2="18" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Aadhar Card Verification
          </h2>
          <p className="section-description">Upload your Aadhar card for identity verification. This helps us ensure the authenticity of donors.</p>
          
          <div className="aadhar-upload-container">
            {!aadharPreview ? (
              <label className="aadhar-upload-box">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleAadharChange}
                  style={{ display: 'none' }}
                />
                <div className="upload-placeholder">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span className="upload-text">Click to upload Aadhar Card</span>
                  <span className="upload-hint">JPG, JPEG, or PNG (Max 5MB)</span>
                </div>
              </label>
            ) : (
              <div className="aadhar-preview-container">
                <img src={aadharPreview} alt="Aadhar Preview" className="aadhar-preview-image" />
                <div className="aadhar-preview-overlay">
                  <button type="button" className="btn-remove-aadhar" onClick={removeAadhar}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    Remove
                  </button>
                </div>
                <div className="aadhar-uploaded-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  Uploaded
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Consent */}
        <section className="form-section consent-section">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Declaration & Consent
          </h2>
          
          <label className="checkbox-label consent-checkbox">
            <input
              type="checkbox"
              {...register('consent.informationAccurate', {
                required: 'You must confirm the accuracy of your information',
              })}
            />
            <span className="checkmark"></span>
            I declare that all the information provided above is true and accurate to the best of my knowledge.
          </label>

          <label className="checkbox-label consent-checkbox">
            <input
              type="checkbox"
              {...register('consent.consentToDonate', {
                required: 'You must consent to donate blood',
              })}
            />
            <span className="checkmark"></span>
            I consent to donate blood and understand that my blood will be tested for infectious diseases.
          </label>

          <label className="checkbox-label consent-checkbox">
            <input
              type="checkbox"
              {...register('consent.understandsProcess', {
                required: 'You must acknowledge understanding the donation process',
              })}
            />
            <span className="checkmark"></span>
            I understand the blood donation process and the health implications involved.
          </label>
        </section>

        {(errors.consent?.informationAccurate || errors.consent?.consentToDonate || errors.consent?.understandsProcess) && (
          <div className="alert alert-error">
            Please accept all consent declarations to continue.
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading || (user?.donorInfo && !isDirty)}
            style={{ opacity: isLoading || (user?.donorInfo && !isDirty) ? 0.6 : 1 }}
          >
            {isLoading ? 'Saving...' : (user?.donorInfo ? 'Update Health Information' : 'Submit Health Information')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DonorHealthForm;
