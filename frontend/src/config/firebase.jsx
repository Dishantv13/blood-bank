// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Check if all required config values are present
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

if (!isFirebaseConfigured && process.env.NODE_ENV !== 'test') {
  console.warn(
    "Firebase configuration is missing or incomplete. Google Login will not work. " +
    "Please check your .env file and ensure REACT_APP_FIREBASE_* variables are set."
  );
}

// Initialize Firebase only if config is present, otherwise provide mock/null
let app;
try {
  if (isFirebaseConfigured) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } else {
    // Return a dummy app object if not configured to prevent crashes on import
    // But we'll handle this in auth export
    app = null;
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
  app = null;
}

// Initialize Firebase Analytics safely
let analytics = null;
if (app) {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    }
  }).catch(e => console.warn("Analytics not supported:", e));
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = app ? getAuth(app) : null;

// Configure Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account' // Always show account selection
});

// Optional: Add scopes if you need more than basic profile info
// googleProvider.addScope('https://www.googleapis.com/auth/user.phonenumbers.read');

export { app, analytics, isFirebaseConfigured };