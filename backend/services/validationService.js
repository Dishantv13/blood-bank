/**
 * Centralized Validation Service
 * All validation logic in one place for consistency
 */

import { ApiError } from '../utils/apiError.js';

// Blood group validation
export const validateBloodGroup = (bloodGroup) => {
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (!validGroups.includes(bloodGroup)) {
    throw new ApiError(400, `Invalid blood group. Must be one of: ${validGroups.join(', ')}`);
  }
  return true;
};

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, 'Invalid email format');
  }
  return true;
};

// Phone validation
export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
    throw new ApiError(400, 'Invalid phone number. Must be 10 digits');
  }
  return true;
};

// Units validation (for blood units)
export const validateUnits = (units) => {
  const normalizedUnits = typeof units === 'string' ? units.trim() : units;
  const parsedUnits = Number(normalizedUnits);

  if (!Number.isInteger(parsedUnits) || parsedUnits <= 0) {
    throw new ApiError(400, 'Units must be a positive integer');
  }
  return true;
};

// Password validation
export const validatePassword = (password) => {
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }
  return true;
};

// User required fields
export const validateUserRegistration = (data) => {
  const { name, email, password, phone, bloodGroup } = data;
  
  if (!name || !name.trim()) throw new ApiError(400, 'Name is required');
  if (!email) throw new ApiError(400, 'Email is required');
  if (!password) throw new ApiError(400, 'Password is required');
  if (!phone) throw new ApiError(400, 'Phone is required');
  if (!bloodGroup) throw new ApiError(400, 'Blood group is required');
  
  validateEmail(email);
  validatePassword(password);
  validatePhone(phone);
  validateBloodGroup(bloodGroup);
  
  return true;
};

// Blood request validation
export const validateBloodRequest = (data) => {
  const { patientName, bloodGroup, units, contactNumber } = data;
  
  if (!patientName || !patientName.trim()) throw new ApiError(400, 'Patient name is required');
  if (!bloodGroup) throw new ApiError(400, 'Blood group is required');
  if (!units) throw new ApiError(400, 'Units is required');
  if (!contactNumber) throw new ApiError(400, 'Contact number is required');
  
  validateBloodGroup(bloodGroup);
  validateUnits(units);
  validatePhone(contactNumber);
  
  return true;
};

// Blood bank registration validation
export const validateBloodBankRegistration = (data) => {
  const { name, email, password, phone, licenseNumber } = data;
  
  if (!name || !name.trim()) throw new ApiError(400, 'Blood bank name is required');
  if (!email) throw new ApiError(400, 'Email is required');
  if (!password) throw new ApiError(400, 'Password is required');
  if (!phone) throw new ApiError(400, 'Phone is required');
  if (!licenseNumber) throw new ApiError(400, 'License number is required');
  
  validateEmail(email);
  validatePassword(password);
  validatePhone(phone);
  
  return true;
};

// Inventory update validation
export const validateInventoryUpdate = (data) => {
  const { bloodGroup, units } = data;
  
  if (!bloodGroup) throw new ApiError(400, 'Blood group is required');
  if (units === undefined || units === null) throw new ApiError(400, 'Units is required');
  
  validateBloodGroup(bloodGroup);
  validateUnits(units);
  
  return true;
};

// Donation validation
export const validateDonation = (data) => {
  const { bloodBankId } = data;
  
  if (!bloodBankId) throw new ApiError(400, 'Blood bank ID is required');
  
  return true;
};
