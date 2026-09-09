import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { showAlert, showToast, setButtonLoading, registerSession } from '../PopupSystem.js';

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

const loginForm = document.querySelector('form');
const loginBtn = loginForm.querySelector('button[type="submit"]');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
    
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
    
  setButtonLoading(loginBtn, true, 'Logging in...');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.setItem('adminLoggedIn', 'true');
    await registerSession(userCredential.user);
    showToast('Login successful!');
    window.location.href = '/event-crud';
  } catch (error) {
    console.error('Login error:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
      showAlert('Invalid email or password', { type: 'error' });
    } else {
      showAlert('Login failed. Please try again.', { type: 'error' });
    }
  } finally {
    setButtonLoading(loginBtn, false);
  }
});