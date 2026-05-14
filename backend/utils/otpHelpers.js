import crypto from "crypto";
import bcrypt from "bcryptjs";
 
export const OTP_CONFIG = {
  EXPIRY_MINUTES: 10,
  MAX_VERIFY_ATTEMPTS: 5,
  MAX_RESEND_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
  PENDING_TTL_MINUTES: 60,
};


export const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const getOtpHashSecret = () => {
  const secret = process.env.BLOODBANK_OTP_HASH_SECRET;
  if (!secret) {
    return "default_otp_secret_for_dev_only";
  }
  return secret;
};

export const hashOtp = async (otp) => {
  // Combine OTP with a shared secret (pepper) before bcrypting for maximum security
  const pepperedOtp = `${String(otp)}:${getOtpHashSecret()}`;
  return await bcrypt.hash(pepperedOtp, 10);
};

export const verifyOtp = async (otp, hashedOtp) => {
  if (!otp || !hashedOtp) return false;
  const pepperedOtp = `${String(otp)}:${getOtpHashSecret()}`;
  return await bcrypt.compare(pepperedOtp, hashedOtp);
};

export const maskEmail = (email = "") => {
  const [localPart, domain = ""] = String(email).split("@");
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) return `${localPart[0]}***@${domain}`;
  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
};


export const buildOtpMeta = (record, config = {}) => {
  const {
    maxVerifyAttempts = OTP_CONFIG.MAX_VERIFY_ATTEMPTS,
    maxResendAttempts = OTP_CONFIG.MAX_RESEND_ATTEMPTS,
    resendCooldownSeconds = OTP_CONFIG.RESEND_COOLDOWN_SECONDS
  } = config;

  const now = Date.now();
  const resendAvailableInSeconds = Math.max(
    0,
    Math.ceil(
      (new Date(record.lastOtpSentAt || now).getTime() +
        resendCooldownSeconds * 1000 -
        now) /
        1000,
    ),
  );
  const otpExpiresInSeconds = Math.max(
    0,
    Math.ceil((new Date(record.otpExpiresAt || now).getTime() - now) / 1000),
  );

  return {
    verificationId: record.verificationId,
    maskedEmail: maskEmail(record.email),
    attemptsRemaining: Math.max(
      0,
      maxVerifyAttempts - (record.verifyAttemptsUsed || 0),
    ),
    resendAttemptsRemaining: Math.max(
      0,
      maxResendAttempts - (record.resendCount || 0),
    ),
    resendAvailableInSeconds,
    otpExpiresInSeconds,
  };
};
