import { setAuthCookies } from "../../utils/authCookies.js";
import { createAuthSession } from "../../services/sessionService.js";
import crypto from "crypto";

export const getAuthCookiesForUser = async (res, user) => {
  const sessionId = crypto.randomUUID();
  const payload = {
    userId: String(user._id),
    email: user.email,
    role: user.role,
    type: "user",
    sid: sessionId,
    tokenVersion: user.tokenVersion || 0,
  };

  const cookies = setAuthCookies(res, "user", payload);

  await createAuthSession({
    sessionId,
    role: "user",
    userId: user._id,
    refreshTokenHash: "dummy_hash", // We don't need the actual hash for most tests
    refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    csrfTokenHash: "dummy_csrf_hash",
    tokenVersion: user.tokenVersion || 0,
    req: { ip: "127.0.0.1", get: () => "test-agent" },
  });

  return cookies;
};
