const toSafeString = (value) => String(value ?? '').trim();

export const nameValidator = (value) => {
  const name = toSafeString(value);

  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters';
  if (!/^[A-Za-z\s.'-]+$/.test(name)) {
    return 'Name can only contain letters, spaces, apostrophe, dot, and hyphen';
  }

  return true;
};

export const bloodBankNameValidator = (value) => {
  const name = toSafeString(value);

  if (!name) return 'Blood bank name is required';
  if (name.length < 3) return 'Blood bank name must be at least 3 characters';
  if (!/^[A-Za-z0-9\s.'()&-]+$/.test(name)) {
    return 'Blood bank name contains invalid characters';
  }

  return true;
};

export const phoneValidator = (value) => {
  const phone = toSafeString(value);

  if (!phone) return 'Phone is required';
  if (!/^\d{10}$/.test(phone)) return 'Phone must be 10 digits';

  return true;
};

export const optionalPhoneValidator = (value) => {
  const phone = toSafeString(value);
  if (!phone) return true;
  return phoneValidator(phone);
};

export const aadhaarValidator = (value) => {
  const aadhaar = toSafeString(value).replace(/\s/g, '');

  if (!aadhaar) return 'Aadhaar number is required';
  if (!/^\d{12}$/.test(aadhaar)) return 'Aadhaar must be 12 digits';

  return true;
};

/*
  Sample fake license numbers for testing only:
  1. BB-REG/001
  2. MED/BB-2025
  3. LIC-AB12/34
  4. HSP/BLD-7788
  5. BNK-XY9/2026
  6. TMP/FAKE-11
*/
export const licenseNumberValidator = (value) => {
  const license = toSafeString(value).toUpperCase();

  if (!license) return 'Medical license is required';
  if (!/^[A-Za-z0-9/\-]{5,15}$/.test(license)) {
    return 'Medical license must be 5-15 characters (letters, numbers, /, -)';
  }

  return true;
};

// Backward compatibility for existing imports.
export const medicalLicenseValidator = (value) => licenseNumberValidator(value);

export const emailValidator = (value) => {
  const email = toSafeString(value);

  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address';
  }

  return true;
};

export const optionalEmailValidator = (value) => {
  const email = toSafeString(value);
  if (!email) return true;
  return emailValidator(email);
};

export const registrationNumberValidator = (value) => {
  const registrationNumber = toSafeString(value);

  if (!registrationNumber) return true;
  if (!/^[A-Za-z0-9/-]{3,30}$/.test(registrationNumber)) {
    return 'Registration number must be 3-30 characters (letters, numbers, /, -)';
  }

  return true;
};

export const pincodeValidator = (value) => {
  const pincode = toSafeString(value);

  if (!pincode) return 'Pincode is required';
  if (!/^\d{6}$/.test(pincode)) return 'Pincode must be 6 digits';

  return true;
};

export const yearValidator = (value) => {
  const year = toSafeString(value);
  if (!year) return true;

  if (!/^\d{4}$/.test(year)) return 'Enter a valid 4-digit year';

  const yearNumber = Number(year);
  const currentYear = new Date().getFullYear();

  if (yearNumber < 1900 || yearNumber > currentYear) {
    return `Year must be between 1900 and ${currentYear}`;
  }

  return true;
};