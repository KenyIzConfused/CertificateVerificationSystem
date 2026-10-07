import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js';

const firebaseConfig = {
  apiKey: "AIzaSyDG0BxXk1LbmmsABIYtw2SgN4guroV8nFc",
  authDomain: "ipprc-certificate-verification.firebaseapp.com",
  projectId: "ipprc-certificate-verification",
  storageBucket: "ipprc-certificate-verification.firebasestorage.app",
  messagingSenderId: "1056133117009",
  appId: "1:1056133117009:web:a1fcd175977a76d27c7470",
  measurementId: "G-R7PDE8B834"
};

const app = initializeApp(firebaseConfig);

// Firebase App Check (reCAPTCHA v3) - OPTIONAL, off by default.
// To enable:
//   1. Firebase Console -> App Check -> Register app (web) -> reCAPTCHA v3.
//   2. Paste the site key into RECAPTCHA_V3_SITE_KEY below.
//   3. Enable enforcement for Firestore / Storage / Callable functions
//      in the same console page.
// Leave the key empty to keep App Check disabled (this module is a no-op).
// For local development with enforcement on, log
// `self.FIREBASE_APPCHECK_DEBUG_TOKEN` in the console and register it as a
// debug token in Firebase Console -> App Check -> Manage debug tokens.
const RECAPTCHA_V3_SITE_KEY = '';

if (RECAPTCHA_V3_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}

export default app;
