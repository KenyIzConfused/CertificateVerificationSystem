import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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

document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
   
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
   
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    sessionStorage.setItem('adminLoggedIn', 'true');
    showToast('Login successful!');
    window.location.href = '../EventCRUD/EventCRUD.html';
   } catch (error) {
    console.error('Error:', error);
    if (error.code === 'auth/user-not-found') {
      showAlert('No account found with this email', { type: 'error' });
    } else if (error.code === 'auth/wrong-password') {
      showAlert('Wrong password', { type: 'error' });
    } else if (error.code === 'auth/too-many-requests') {
      showAlert('Too many attempts. Please try again later.', { type: 'error' });
    } else {
      showAlert('Login failed. Please try again.', { type: 'error' });
    }
  }
});