import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { showAlert, showToast } from '../PopupSystem.js';

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
const auth = getAuth(app);

const form = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('email');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) {
      showAlert('Please enter your email address', { type: 'warning' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('Password reset email sent! Please check your inbox and spam folder.');
      form.reset();
    } catch (error) {
      console.error('Password reset error:', error);
      showAlert('Failed to send reset email: ' + error.message, { type: 'error' });
    }
  });
}
