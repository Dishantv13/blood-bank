import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY;
const IV_LENGTH = 16;

// Validate key configuration at startup
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.error(
    "❌ SECURITY CRITICAL: PII_ENCRYPTION_KEY is missing or too short (must be 32 chars).",
  );
  if (process.env.NODE_ENV === "production") {
    process.exit(1); // Crash in production if insecure
  }
}

const getEncryptionKey = () => {
  if (!ENCRYPTION_KEY) {
    throw new Error("PII_ENCRYPTION_KEY is not defined");
  }

  // Use SHA-256 to derive a consistent 32-byte key from any input string.
  // This handles various lengths and formats (raw string or hex) robustly.
  return crypto
    .createHash("sha256")
    .update(String(ENCRYPTION_KEY).trim())
    .digest();
};

export const encrypt = (text) => {
  if (!text) return text;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(String(text));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (error) {
    console.error("Encryption Error:", error.message);
    throw new Error(
      `Data encryption failed: ${error.message}. Operation aborted for security.`,
    );
  }
};

export const decrypt = (text) => {
  if (!text) return text;
  if (!text.includes(":")) {
    return text;
  }

  try {
    const key = getEncryptionKey();
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption Error:", error.message);
    throw new Error(
      `Data decryption failed: ${error.message}. The decryption key may be invalid.`,
    );
  }
};
