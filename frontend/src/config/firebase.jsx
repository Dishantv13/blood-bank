// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
// Uncomment and add your Firebase credentials in .env when ready
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Only initialize Firebase if projectId is configured
// When you have Firebase credentials, the app will auto-initialize
let app = null;
let auth = null;
let googleProvider = null;
// let analytics = null;

if (firebaseConfig.projectId) {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  // analytics = getAnalytics(app);

  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app);

  // Configure Google Provider
  // Note: Cross-Origin-Opener-Policy warnings in console are expected and harmless
  // They occur because Firebase uses popups for authentication
  // These warnings do not affect functionality
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account' // Always show account selection
  });
} else {
  console.warn('⚠️  Firebase not configured — Google login disabled. Add REACT_APP_FIREBASE_* env vars to enable.');
}

export { app, auth, googleProvider };