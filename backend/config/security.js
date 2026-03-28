const required = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const validateSecurityConfig = () => {
  required('MONGODB_URI');
  required('JWT_SECRET');
  required('ADMIN_EMAIL');
  required('ADMIN_PASSWORD_HASH');
  required('ADMIN_JWT_SECRET');

  const jwtSecret = process.env.JWT_SECRET;
  const adminJwtSecret = process.env.ADMIN_JWT_SECRET;

  if (jwtSecret === adminJwtSecret) {
    throw new Error('ADMIN_JWT_SECRET must be different from JWT_SECRET');
  }
};

