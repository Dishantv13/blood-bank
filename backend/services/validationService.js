import { ApiError } from '../utils/apiError.js';
import { HTTPS_CODE } from '../utils/httpsCode.js';

// Blood group validation
export const validateBloodGroup = (bloodGroup) => {
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (!validGroups.includes(bloodGroup)) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, `Invalid blood group. Must be one of: ${validGroups.join(', ')}`);
  }
  return true;
};

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Invalid email format');
  }
  return true;
};

// Phone validation
export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Invalid phone number. Must be 10 digits');
  }
  return true;
};

// Units validation (for blood units)
export const validateUnits = (units) => {
  const normalizedUnits = typeof units === 'string' ? units.trim() : units;
  const parsedUnits = Number(normalizedUnits);

  if (!Number.isInteger(parsedUnits) || parsedUnits <= 0) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Units must be a positive integer');
  }
  return true;
};

// Password validation - enforce strong password policy
export const validatePassword = (password) => {
  if (password.length < 8) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Password must be at least 8 characters');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Password must contain at least one lowercase letter');
  }

  // Check for number
  if (!/\d/.test(password)) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Password must contain at least one number');
  }

  // Check for special character
  if (!/[@$!%*?&]/.test(password)) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Password must contain at least one special character (@$!%*?&)');
  }

  return true;
};

// User required fields
export const validateUserRegistration = (data) => {
  const { name, email, password, phone, bloodGroup } = data;

  if (!name || !name.trim()) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Name is required');
  if (!email) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Email is required');
  if (!password) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Password is required');
  if (!phone) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Phone is required');
  if (!bloodGroup) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Blood group is required');

  validateEmail(email);
  validatePassword(password);
  validatePhone(phone);
  validateBloodGroup(bloodGroup);

  return true;
};

// Blood request validation
export const validateBloodRequest = (data) => {
  const { patientName, bloodGroup, units, contactNumber } = data;

  if (!patientName || !patientName.trim()) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Patient name is required');
  if (!bloodGroup) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Blood group is required');
  if (!units) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Units is required');
  if (!contactNumber) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Contact number is required');

  validateBloodGroup(bloodGroup);
  validateUnits(units);
  validatePhone(contactNumber);

  return true;
};

// Blood bank registration validation
export const validateBloodBankRegistration = (data) => {
  const { name, email, password, phone, licenseNumber } = data;

  if (!name || !name.trim()) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Blood bank name is required');
  if (!email) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Email is required');
  if (!password) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Password is required');
  if (!phone) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Phone is required');
  if (!licenseNumber) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'License number is required');

  validateEmail(email);
  validatePassword(password);
  validatePhone(phone);

  return true;
};

// Inventory update validation
export const validateInventoryUpdate = (data) => {
  const { bloodGroup, units } = data;

  if (!bloodGroup) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Blood group is required');
  if (units === undefined || units === null) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Units is required');

  validateBloodGroup(bloodGroup);
  validateUnits(units);

  return true;
};

// Donation validation
export const validateDonation = (data) => {
  const { bloodBankId } = data;

  if (!bloodBankId) throw new ApiError(HTTPS_CODE.BAD_REQUEST, 'Blood bank ID is required');

  return true;
};
