const required = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const validateSecurityConfig = () => {
  required('MONGODB_URI');
  required('USER_ACCESS_TOKEN_SECRET');
  required('USER_REFRESH_TOKEN_SECRET');
  required('ADMIN_ACCESS_TOKEN_SECRET');
  required('ADMIN_REFRESH_TOKEN_SECRET');
  required('BLOODBANK_ACCESS_TOKEN_SECRET');
  required('BLOODBANK_REFRESH_TOKEN_SECRET');
  required('CSRF_HASH_SECRET');
  required('BLOODBANK_OTP_HASH_SECRET');
  required('ADMIN_EMAIL');
  required('ADMIN_PASSWORD_HASH');

  const distinctSecrets = [
    process.env.USER_ACCESS_TOKEN_SECRET,
    process.env.USER_REFRESH_TOKEN_SECRET,
    process.env.ADMIN_ACCESS_TOKEN_SECRET,
    process.env.ADMIN_REFRESH_TOKEN_SECRET,
    process.env.BLOODBANK_ACCESS_TOKEN_SECRET,
    process.env.BLOODBANK_REFRESH_TOKEN_SECRET,
  ];

  if (new Set(distinctSecrets).size !== distinctSecrets.length) {
    throw new Error('Access and refresh token secrets must all be different across roles');
  }
};
