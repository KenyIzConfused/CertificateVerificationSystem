import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showToast, setButtonLoading } from '../assets/js/PopupSystem.js';

const firebaseConfig = {
  apiKey: "AIzaSyDG0BxXk1LbmmsABIYtw2SgN4guroV8nFc",
  authDomain: "ipprc-certificate-verification.firebaseapp.com",
  projectId: "ipprc-certificate-verification",
  storageBucket: "ipprc-certificate-verification.firebasestorage.app",
  messagingSenderId: "1056133117009",
  appId: "1:1056133117009:web:a1fcd175977a76d27c7470",
  measurementId: "G-R7PDE8B834"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const form = document.querySelector('form');
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const adminName = document.getElementById('adminName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    showAlert('Passwords do not match', { type: 'warning' });
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters', { type: 'warning' });
    return;
  }

  setButtonLoading(submitBtn, true, 'Creating account...');

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, 'Admin', userCredential.user.uid), {
      adminName,
      email,
      role: 'admin',
      createdAt: new Date()
    });

    showToast('Account created successfully! Please sign in.');
    window.location.href = '../logIn/LogInAdmin.html';
  } catch (error) {
    console.error('Signup error:', error);
    showAlert('Sign up failed: ' + error.message, { type: 'error' });
  } finally {
    setButtonLoading(submitBtn, false);
  }
});
