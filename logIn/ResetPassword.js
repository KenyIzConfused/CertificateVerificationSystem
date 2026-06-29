import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, confirmPasswordReset } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get('oobCode');

if (!oobCode) {
  showAlert('Invalid or expired reset link.', { type: 'error' });
}

const form = document.getElementById('resetPasswordForm');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    
    if (newPassword.length < 6) {
      showAlert('Password must be at least 6 characters', { type: 'warning' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Passwords do not match', { type: 'warning' });
      return;
    }
    if (!oobCode) {
      showAlert('Invalid reset link. Please request a new one.', { type: 'error' });
      return;
    }
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      showToast('Password reset successful! You can now login.');
      setTimeout(() => {
        window.location.href = '../logIn/LogInAdmin.html';
      }, 1500);
    } catch (error) {
      console.error('Reset password error:', error);
      showAlert('Failed to reset password: ' + error.message, { type: 'error' });
    }
  });
}
