import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { showAlert, showToast, setButtonLoading } from '../PopupSystem.js';
import { createAdminFn } from '../FirebaseAdmin.js';

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

const form = document.querySelector('form');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
    
  const inviteCode = document.getElementById('inviteCode').value.trim().toUpperCase();
  const adminName = document.getElementById('adminName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
    
  if (!inviteCode) {
    showAlert('Please enter your invite code', { type: 'warning' });
    return;
  }

  if (password !== confirmPassword) {
    showAlert('Passwords do not match', { type: 'warning' });
    return;
  }

  setButtonLoading(submitBtn, true, 'Creating account...');

  try {
    await createAdminFn({ inviteCode, adminName, email, password });
    showToast('Account created! You can now log in.');
    window.location.href = '../logIn/LogInAdmin.html';
  } catch (error) {
    console.error('Error:', error);
    const message = (error && error.message) ? error.message : 'Sign up failed.';
    showAlert('Sign up failed: ' + message, { type: 'error' });
  } finally {
    setButtonLoading(submitBtn, false);
  }
});
