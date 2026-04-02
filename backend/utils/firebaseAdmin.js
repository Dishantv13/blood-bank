import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { ApiError } from './apiError.js';

const readMultilineEnv = (value) => String(value || '').replace(/\\n/g, '\n').trim();

const getFirebaseAdminConfig = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = readMultilineEnv(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

const getFirebaseAdminApp = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const config = getFirebaseAdminConfig();
  if (!config) {
    return null;
  }

  return initializeApp({
    credential: cert(config),
  });
};

export const isFirebaseAdminConfigured = () => Boolean(getFirebaseAdminConfig());

export const verifyFirebaseIdToken = async (idToken) => {
  if (!idToken) {
    throw new ApiError(400, 'Google ID token is required');
  }

  const app = getFirebaseAdminApp();
  if (!app) {
    throw new ApiError(503, 'Google login is not configured on the server');
  }

  try {
    return await getAuth(app).verifyIdToken(idToken, true);
  } catch (_error) {
    throw new ApiError(401, 'Invalid Google authentication token');
  }
};
