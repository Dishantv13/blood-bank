import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.model.js";
import RegistrationOtp from "../models/BloodBankRegistrationOtp.model.js";
import cacheManager from "../utils/cacheManager.js";
import { enforceCsrfForRole } from "../middleware/csrf.js";
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from "../config/authConfig.js";
import { OAuth2Client } from "google-auth-library";
import { ApiError } from "../utils/apiError.js";
import { HTTPS_CODE } from "../utils/httpsCode.js";
import * as emailService from "../utils/emailService.js";
import * as otpHelpers from "../utils/otpHelpers.js";
import * as validationService from "./validationService.js";
import * as authCookies from "../utils/authCookies.js";
import * as serializers from "../utils/serializers.js";
import * as sessionService from "./sessionService.js";

const toPublicUser = (user) => serializers.sanitizeUser(user);

const buildUserClaims = (user, sessionId) => ({
  userId: String(user.id),
  email: user.email,
  role: user.role,
  type: "user",
  sid: sessionId,
  tokenVersion: Number(user.tokenVersion || 0),
});

const GOOGLE_OAUTH_STATE_COOKIE = "bb_google_oauth_state";
const GOOGLE_OAUTH_NONCE_COOKIE = "bb_google_oauth_nonce";
const GOOGLE_OAUTH_VERIFIER_COOKIE = "bb_google_oauth_verifier";
const GOOGLE_OAUTH_MODE_COOKIE = "bb_google_oauth_mode";
const GOOGLE_OAUTH_COOKIE_TTL_MS = 10 * 60 * 1000;
const GOOGLE_OAUTH_SCOPES = "openid email profile";
const GOOGLE_OAUTH_AUTH_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const createPkcePair = () => {
  const verifier = Buffer.from(crypto.randomBytes(32)).toString("base64url");
  const challenge = Buffer.from(
    crypto.createHash("sha256").update(verifier).digest(),
  ).toString("base64url");
  return { verifier, challenge };
};

const timingSafeEqual = (left, right) => {
  if (!left || !right) return false;
  try {
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
  } catch (err) {
    return false;
  }
};

const getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new ApiError(HTTPS_CODE.INTERNAL_SERVER_ERROR, "Google OAuth is not configured on the server");
  }

  return { clientId, clientSecret };
};

const getFrontendOrigin = () => {
  const configured = process.env.FRONTEND_URL?.trim();
  if (!configured) return "http://localhost:3000";
  try {
    const url = new URL(configured);
    return `${url.protocol}//${url.host}`;
  } catch (_error) {
    return "http://localhost:3000";
  }
};

const getGoogleRedirectUri = (req) => {
  const configured = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = req.get("host");
  return `${protocol}://${host}/api/v1/auth/google/callback`;
};

const getPrivateCookieOptions = () => ({
  ...authCookies.getPublicCookieOptions(),
  httpOnly: true,
  maxAge: GOOGLE_OAUTH_COOKIE_TTL_MS,
});

export const clearGoogleOauthCookies = (res, clearMode = false) => {
  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, getPrivateCookieOptions());
  res.clearCookie(GOOGLE_OAUTH_NONCE_COOKIE, getPrivateCookieOptions());
  res.clearCookie(GOOGLE_OAUTH_VERIFIER_COOKIE, getPrivateCookieOptions());
  if (clearMode) {
    res.clearCookie(GOOGLE_OAUTH_MODE_COOKIE, getPrivateCookieOptions());
  }
};

const resolveGoogleMode = (rawMode) => {
  const mode = String(rawMode || "").toLowerCase();
  return mode === "signup" ? "signup" : "login";
};

const buildFrontendRedirect = (mode, status, reason = "") => {
  const origin = getFrontendOrigin();
  if (status === "success") {
    return `${origin}/dashboard`;
  }

  const targetPath = mode === "signup" ? "/signup" : "/login";
  const query = reason ? `?authError=${encodeURIComponent(reason)}` : "";
  return `${origin}${targetPath}${query}`;
};

const createUserSession = async (req, res, user) => {
  const userId = user.id || user._id;
  const tokenVersion =
    typeof user?.tokenVersion === "number"
      ? Number(user.tokenVersion)
      : Number(
        (await User.findById(userId).select("+tokenVersion").lean())
          ?.tokenVersion || 0,
      );

  return sessionService.issuePrincipalSession({
    req,
    res,
    role: "user",
    tokenVersion,
    buildClaims: (sessionId, version) =>
      buildUserClaims({ ...user, id: userId, tokenVersion: version }, sessionId),
    metadata: { userId },
  });
};

const incrementUserTokenVersion = async (userId, reason = "security_event") => {
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    {
      $inc: { tokenVersion: 1 },
      $set: { passwordChangedAt: new Date() },
    },
    { returnDocument: "after" },
  )
    .select("_id email role +tokenVersion")
    .lean();

  if (!updatedUser) {
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "User session is invalid");
  }

  await sessionService.revokeAllPrincipalSessions({
    role: "user",
    userId,
    reason,
  });

  // Invalidate the user state cache to prevent version mismatch from stale data
  await cacheManager.del(`auth:user:state:${userId}`);

  return updatedUser;
};

export const issueUserCsrfToken = async (req, res) => {
  const { csrfCookie } = authCookies.getCookieNamesForRole("user");
  const csrfToken = authCookies.generateCsrfToken();

  res.cookie(csrfCookie, csrfToken, authCookies.getPublicCookieOptions());

  // If user has an active session, sync the new CSRF token so subsequent state-changing
  // requests are accepted without requiring a full session refresh.
  const accessToken = authCookies.getAccessTokenFromRequest(req, "user");
  if (accessToken) {
    try {
      const decoded = authCookies.verifyAccessToken("user", accessToken);
      if (decoded.sid) {
        await sessionService.updateCsrfToken({
          role: "user",
          sessionId: decoded.sid,
          csrfTokenHash: authCookies.hashToken(csrfToken),
        });
      }
    } catch (_error) {
      // Ignore errors if token is invalid - client will handle 401 later
    }
  }

  return { csrfToken };
};

export const loginAndCreateSession = async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);
  const { csrfToken, accessTokenExpiresAt } = await createUserSession(
    req,
    res,
    result.user,
  );
  return { user: result.user, csrfToken, accessTokenExpiresAt };
};

export const getGoogleOAuthStartUrl = async (req, res) => {
  const { clientId } = getGoogleOAuthConfig();
  const redirectUri = getGoogleRedirectUri(req);
  const mode = resolveGoogleMode(req.query?.mode);

  const statePayload = JSON.stringify({
    mode,
    nonce: crypto.randomBytes(16).toString("hex"),
  });
  const stateRaw = Buffer.from(statePayload).toString("base64url");
  const nonceRaw = Buffer.from(crypto.randomBytes(32)).toString("base64url");
  const { verifier, challenge } = createPkcePair();

  res.cookie(
    GOOGLE_OAUTH_STATE_COOKIE,
    authCookies.hashToken(stateRaw),
    getPrivateCookieOptions(),
  );
  res.cookie(
    GOOGLE_OAUTH_NONCE_COOKIE,
    authCookies.hashToken(nonceRaw),
    getPrivateCookieOptions(),
  );
  res.cookie(GOOGLE_OAUTH_VERIFIER_COOKIE, verifier, getPrivateCookieOptions());

  const authUrl = new URL(GOOGLE_OAUTH_AUTH_ENDPOINT);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_OAUTH_SCOPES);
  authUrl.searchParams.set("state", stateRaw);
  authUrl.searchParams.set("nonce", nonceRaw);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("include_granted_scopes", "true");

  return { redirectUrl: authUrl.toString() };
};

export const completeGoogleOAuthAndCreateSession = async (req, res) => {
  const state = String(req.query?.state || "");
  let mode = "login";

  try {
    const decodedState = JSON.parse(Buffer.from(state, "base64url").toString());
    mode = resolveGoogleMode(decodedState.mode);
  } catch (e) {
    // If state is not our JSON format, it might be an old flow or invalid
  }

  const fail = (reason) => ({
    redirectUrl: buildFrontendRedirect(mode, "error", reason),
  });

  const code = String(req.query?.code || "");
  const oauthError = String(req.query?.error || "");

  if (oauthError) {
    clearGoogleOauthCookies(res);
    return fail("google_oauth_denied");
  }

  const expectedStateHash = req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE];
  const expectedNonceHash = req.cookies?.[GOOGLE_OAUTH_NONCE_COOKIE];
  const codeVerifier = req.cookies?.[GOOGLE_OAUTH_VERIFIER_COOKIE];

  if (
    !code ||
    !state ||
    !expectedStateHash ||
    !expectedNonceHash ||
    !codeVerifier
  ) {
    clearGoogleOauthCookies(res);
    return fail("google_oauth_invalid_state");
  }

  const incomingStateHash = authCookies.hashToken(state);
  if (!timingSafeEqual(incomingStateHash, expectedStateHash)) {
    clearGoogleOauthCookies(res);
    return fail("google_oauth_state_mismatch");
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const redirectUri = getGoogleRedirectUri(req);

  try {
    const response = await fetch(GOOGLE_OAUTH_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }).toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        `Google OAuth token exchange failed: ${errorData.error_description || response.statusText}`,
      );
    }

    const tokenData = await response.json();
    const idToken = tokenData?.id_token;
    if (!idToken) {
      throw new ApiError(
        HTTPS_CODE.UNAUTHORIZED,
        "Google OAuth token response did not include id_token",
      );
    }

    const googleClient = new OAuth2Client(clientId);
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    const nonce = payload?.nonce || "";
    if (
      !nonce ||
      !timingSafeEqual(authCookies.hashToken(nonce), expectedNonceHash)
    ) {
      throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Google OAuth nonce validation failed");
    }

    const result = await googleLoginWithClaims({
      email: payload?.email,
      name: payload?.name,
      googleId: payload?.sub,
      photoURL: payload?.picture,
      emailVerified: payload?.email_verified === true,
    });

    await createUserSession(req, res, result.user);

    clearGoogleOauthCookies(res, true); // true to clear the now-deprecated mode cookie too
    return { redirectUrl: buildFrontendRedirect(mode, "success") };
  } catch (error) {
    clearGoogleOauthCookies(res);
    return fail("google_oauth_failed");
  }
};

export const refreshUserSession = async (req, res) => {
  const { principal, csrfToken, accessTokenExpiresAt } =
    await sessionService.refreshPrincipalSession({
      req,
      res,
      role: "user",
      getPrincipal: async (decoded) => {
        const user = await User.findById(decoded.userId).select("_id email role +tokenVersion").lean();
        if (user) {
          user.id = String(user._id);
        }
        return user;
      },
      buildClaims: (user, sessionId, version) =>
        buildUserClaims({ ...user, id: user.id || user._id, tokenVersion: version }, sessionId),
      onBreach: async (userId) => {
        await incrementUserTokenVersion(userId, "security_breach_detected");
      },
    });

  const result = await getSessionUser(principal._id || principal.id);
  return { user: result.user, csrfToken, accessTokenExpiresAt };
};

export const logoutUserSession = async (req, res) => {
  try {
    if (!enforceCsrfForRole(req, "user")) {
      console.warn("[AUTH] CSRF validation failed during logout attempt");
    }
    const refreshToken = authCookies.getRefreshTokenFromRequest(req, "user");
    if (refreshToken) {
      try {
        const decoded = authCookies.verifyRefreshToken("user", refreshToken);
        if (decoded?.sid) {
          await sessionService.revokeAuthSession({
            role: "user",
            sessionId: decoded.sid,
            reason: "logout",
          });
        }
      } catch (_error) { }
    }
  } finally {
    authCookies.clearAuthCookies(res, "user");
  }

  return { success: true };
};

// Login user with email & password
export const loginUser = async (email, password) => {
  validationService.validateEmail(email);
  validationService.validatePassword(password);

  const user = await User.findOne({ email }).select(
    "_id name email +password bloodGroup phone role isDonor photoURL activeMode donorInfo address +loginAttempts +lockUntil +tokenVersion",
  );

  if (!user) {
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "User not registered please register first");
  }

  // Check if account is temporarily locked
  if (user.lockUntil && user.lockUntil > Date.now()) {
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Account temporarily locked due to multiple failed login attempts.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const attempts = (user.loginAttempts || 0) + 1;
    user.loginAttempts = attempts;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      throw new ApiError(HTTPS_CODE.UNAUTHORIZED, `Account temporarily locked for ${LOCK_DURATION_MS / (60 * 1000)} minutes.`);
    }
    await user.save();
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "Invalid Credentials");
  }

  // Successful login – clear lockout state
  if (user.loginAttempts || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  return {
    user: { ...toPublicUser(user), tokenVersion: user.tokenVersion },
  };
};

// Google OAuth login/register
export const googleLoginWithClaims = async ({
  email,
  name,
  googleId,
  photoURL,
}) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const displayName =
    String(name || "").trim() || normalizedEmail.split("@")[0] || "Google User";
  const normalizedGoogleId = String(googleId || "").trim();
  const normalizedPhotoUrl = String(photoURL || "").trim();

  if (!normalizedEmail || !normalizedGoogleId) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Missing required Google user data");
  }

  let user = await User.findOne({ email: normalizedEmail }).select(
    "+tokenVersion +role +activeMode",
  );

  if (!user) {
    const newUser = new User({
      name: displayName,
      email: normalizedEmail,
      googleId: normalizedGoogleId,
      photoURL: normalizedPhotoUrl,
      password: crypto.randomBytes(16).toString("hex"),
      phone: "",
      isDonor: false,
      address: { street: "", city: "", state: "", pincode: "" },
      tokenVersion: 0,
      isEmailVerified: true,
    });

    await newUser.save();
    user = newUser;
  } else if (!user.googleId) {
    // Guard against legacy empty-string values that violate enum validation on save.
    if (user.bloodGroup === "") {
      user.bloodGroup = undefined;
    }
    user.googleId = normalizedGoogleId;
    user.photoURL = normalizedPhotoUrl;
    await user.save();
  }

  return {
    user: { ...toPublicUser(user), tokenVersion: user.tokenVersion },
  };
};

export const getSessionUser = async (userId) => {
  const user = await User.findById(userId)
    .select(serializers.USER_SAFE_FIELDS)
    .lean();

  if (!user) {
    throw new ApiError(HTTPS_CODE.UNAUTHORIZED, "User session is invalid");
  }

  return { user: toPublicUser(user) };
};

export const getUserSessionWithExpiry = async (req, userId) => {
  const result = await getSessionUser(userId);
  return {
    ...result,
    accessTokenExpiresAt: authCookies.getAccessTokenExpiryFromRequest(
      req,
      "user",
    ),
  };
};

// Request password reset
// Uses constant-time response to prevent account enumeration
export const requestPasswordReset = async (email) => {
  validationService.validateEmail(email);

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "No account found with this email address");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.passwordReset = {
    token: resetTokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiration
  };

  await user.save();

  try {
    await emailService.sendPasswordResetEmail(email, resetToken, "user");
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new ApiError(
      HTTPS_CODE.INTERNAL_SERVER_ERROR,
      "Failed to send reset email. Please try again later.",
    );
  }

  return { success: true };
};

// Reset password with token
export const resetPassword = async (token, newPassword) => {
  validationService.validatePassword(newPassword);

  if (!token) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Reset token is required");
  }

  const resetTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    "passwordReset.token": resetTokenHash,
    "passwordReset.expiresAt": { $gt: new Date() },
  });

  if (!user) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Invalid or expired reset token");
  }

  user.password = newPassword;
  user.passwordReset = undefined;
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  user.passwordChangedAt = new Date();

  await user.save();
  await sessionService.revokeAllPrincipalSessions({
    role: "user",
    userId: user._id,
    reason: "password_reset",
  });

  return { success: true };
};

export const initiateUserRegistration = async (req, registrationData) => {
  const { name, email, password, bloodGroup, phone } = registrationData;

  if (!name || !email || !password) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Please provide name, email, and password");
  }

  validationService.validateEmail(email);
  validationService.validatePassword(password);
  if (phone) validationService.validatePhone(phone);

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "User with this email already exists");
  }

  const otp = otpHelpers.generateOtp();
  const otpHash = await otpHelpers.hashOtp(otp);
  const now = new Date();
  const otpExpiresAt = new Date(
    now.getTime() + otpHelpers.OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000,
  );
  const recordExpiresAt = new Date(
    now.getTime() + otpHelpers.OTP_CONFIG.PENDING_TTL_MINUTES * 60 * 1000,
  );
  const verificationId = crypto.randomUUID();

  const existingPending = await RegistrationOtp.findOne({
    email: email.toLowerCase(),
    type: "user",
    status: { $in: ["pending", "expired"] },
  });

  const pendingData = {
    verificationId,
    email: email.toLowerCase(),
    type: "user",
    otpHash,
    otpExpiresAt,
    status: "pending",
    verifyAttemptsUsed: 0,
    resendCount: 0,
    lastOtpSentAt: now,
    registrationData,
    clientMeta: {
      ip: String(req.ip || ""),
      userAgent: String(req.get("user-agent") || ""),
    },
    expiresAt: recordExpiresAt,
    verifiedAt: null,
  };

  if (existingPending) {
    Object.assign(existingPending, pendingData);
    await existingPending.save();
  } else {
    await RegistrationOtp.create(pendingData);
  }

  try {
    await emailService.sendUserRegistrationOtpEmail(email, otp, {
      expiresInMinutes: otpHelpers.OTP_CONFIG.EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error("User OTP send failed:", error);
    await RegistrationOtp.deleteOne({ verificationId });
    throw new ApiError(
      HTTPS_CODE.INTERNAL_SERVER_ERROR,
      "Unable to send OTP email. Please try again later.",
    );
  }

  const record = await RegistrationOtp.findOne({ verificationId }).lean();
  return {
    ...otpHelpers.buildOtpMeta(record),
    nextStep: "verify_otp",
  };
};

export const verifyUserRegistrationOtp = async (
  req,
  res,
  verificationId,
  otp,
) => {
  if (!verificationId || !otp) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "VerificationId and otp are required");
  }

  const now = new Date();
  const pendingRegistration = await RegistrationOtp.findOne({
    verificationId: String(verificationId),
    type: "user",
  }).select("+otpHash");

  if (!pendingRegistration) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Invalid or expired verification session");
  }

  if (pendingRegistration.status === "locked") {
    throw new ApiError(
      HTTPS_CODE.TOO_MANY_REQUESTS,
      "Maximum OTP attempts reached. Please restart registration.",
    );
  }

  if (
    pendingRegistration.status !== "pending" ||
    pendingRegistration.expiresAt <= now ||
    pendingRegistration.otpExpiresAt <= now
  ) {
    pendingRegistration.status = "expired";
    await pendingRegistration.save();
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      "OTP is invalid or expired. Please restart registration.",
    );
  }

  if (
    pendingRegistration.verifyAttemptsUsed >=
    otpHelpers.OTP_CONFIG.MAX_VERIFY_ATTEMPTS
  ) {
    pendingRegistration.status = "locked";
    await pendingRegistration.save();
    throw new ApiError(
      HTTPS_CODE.TOO_MANY_REQUESTS,
      "Maximum OTP attempts reached. Please restart registration.",
    );
  }

  const isOtpValid = await otpHelpers.verifyOtp(
    String(otp).trim(),
    pendingRegistration.otpHash,
  );
  if (!isOtpValid) {
    pendingRegistration.verifyAttemptsUsed += 1;
    if (
      pendingRegistration.verifyAttemptsUsed >=
      otpHelpers.OTP_CONFIG.MAX_VERIFY_ATTEMPTS
    ) {
      pendingRegistration.status = "locked";
    }
    await pendingRegistration.save();

    const meta = otpHelpers.buildOtpMeta(pendingRegistration.toObject());
    throw new ApiError(
      pendingRegistration.status === "locked" ? HTTPS_CODE.TOO_MANY_REQUESTS : HTTPS_CODE.BAD_REQUEST,
      pendingRegistration.status === "locked"
        ? "Maximum OTP attempts reached. Please restart registration."
        : `Invalid OTP. ${meta.attemptsRemaining} attempts remaining.`,
    );
  }

  // OTP is valid - create the user
  const regData = pendingRegistration.registrationData;
  const user = new User({
    name: regData.name,
    email: regData.email.toLowerCase(),
    password: regData.password, // Already hashed during initiation
    bloodGroup: regData.bloodGroup,
    phone: regData.phone || "",
    isDonor: false,
    address: regData.address || {
      street: "",
      city: "",
      state: "",
      pincode: "",
    },
    role: "user",
    isEmailVerified: true,
  });

  await user.save();
  await RegistrationOtp.deleteOne({ _id: pendingRegistration._id });

  // Create session for the new user
  const sessionId = crypto.randomUUID();
  const {
    refreshToken,
    refreshTokenExpiresAt,
    csrfToken,
    accessTokenExpiresAt,
  } = authCookies.setAuthCookies(res, "user", buildUserClaims(user, sessionId));

  await sessionService.createAuthSession({
    sessionId,
    role: "user",
    userId: user._id,
    refreshTokenHash: authCookies.hashToken(refreshToken),
    refreshTokenExpiresAt,
    tokenVersion: user.tokenVersion || 0,
    req,
  });

  await emailService.sendWelcomeEmail(user.email, user.name);

  return {
    user: toPublicUser(user),
    csrfToken,
    accessTokenExpiresAt,
  };
};

export const resendUserRegistrationOtp = async (req, verificationId) => {
  if (!verificationId) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "VerificationId is required");
  }

  const now = new Date();
  const pendingRegistration = await RegistrationOtp.findOne({
    verificationId: String(verificationId),
    type: "user",
  }).select("+otpHash");

  if (!pendingRegistration) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Invalid or expired verification session");
  }

  if (pendingRegistration.status === "locked") {
    throw new ApiError(
      HTTPS_CODE.TOO_MANY_REQUESTS,
      "Maximum attempts reached. Please restart registration.",
    );
  }

  if (
    pendingRegistration.resendCount >= otpHelpers.OTP_CONFIG.MAX_RESEND_ATTEMPTS
  ) {
    throw new ApiError(
      HTTPS_CODE.TOO_MANY_REQUESTS,
      "Maximum resend attempts reached. Please restart registration.",
    );
  }

  const cooldownExpiry = new Date(
    pendingRegistration.lastOtpSentAt.getTime() +
    otpHelpers.OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000,
  );
  if (now < cooldownExpiry) {
    const remaining = Math.ceil((cooldownExpiry - now) / 1000);
    throw new ApiError(
      HTTPS_CODE.TOO_MANY_REQUESTS,
      `Please wait ${remaining} seconds before requesting a new OTP.`,
    );
  }

  const otp = otpHelpers.generateOtp();
  const otpHash = await otpHelpers.hashOtp(otp);

  pendingRegistration.otpHash = otpHash;
  pendingRegistration.otpExpiresAt = new Date(
    now.getTime() + otpHelpers.OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000,
  );
  pendingRegistration.lastOtpSentAt = now;
  pendingRegistration.resendCount += 1;
  pendingRegistration.status = "pending";
  await pendingRegistration.save();

  try {
    await emailService.sendUserRegistrationOtpEmail(pendingRegistration.email, otp, {
      expiresInMinutes: otpHelpers.OTP_CONFIG.EXPIRY_MINUTES,
    });
  } catch (error) {
    throw new ApiError(
      HTTPS_CODE.INTERNAL_SERVER_ERROR,
      "Unable to send OTP email. Please try again later.",
    );
  }

  return otpHelpers.buildOtpMeta(pendingRegistration.toObject());
};

// Verify reset token
export const verifyResetToken = async (token) => {
  if (!token) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Reset token is required");
  }

  const resetTokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    "passwordReset.token": resetTokenHash,
    "passwordReset.expiresAt": { $gt: new Date() },
  })
    .select("_id")
    .lean();

  if (!user) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Invalid or expired reset token");
  }

  return { valid: true };
};

// Change password for authenticated user
export const changePassword = async (userId, currentPassword, newPassword) => {
  validationService.validatePassword(newPassword);

  if (!currentPassword) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Current password is required");
  }

  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new ApiError(HTTPS_CODE.NOT_FOUND, "User not found");
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new ApiError(HTTPS_CODE.BAD_REQUEST, "Current password is incorrect");
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  if (isSamePassword) {
    throw new ApiError(
      HTTPS_CODE.BAD_REQUEST,
      "New password must be different from current password",
    );
  }

  user.password = newPassword;
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  user.passwordChangedAt = new Date();
  await user.save();
  await sessionService.revokeAllPrincipalSessions({
    role: "user",
    userId: user._id,
    reason: "password_change",
  });

  return { success: true };
};
