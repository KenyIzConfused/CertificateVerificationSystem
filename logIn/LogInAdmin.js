import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showToast, showLoading, hideLoading } from '../PopupSystem.js';

const firebaseConfig = {
  apiKey: "AIzaSyCKuHUI87RMQK70Cvxm4YO2Jl1UDdoeAfw",
  authDomain: "certificateverification-8ef83.firebaseapp.com",
  projectId: "certificateverification-8ef83",
  storageBucket: "certificateverification-8ef83.firebasestorage.app",
  messagingSenderId: "797766748638",
  appId: "1:797766748638:web:2b716ec9e7c6f64c27b54f",
  measurementId: "G-19BFPGEFEK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    showLoading('login');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    const adminDoc = await getDoc(doc(db, 'Admin', userCredential.user.uid));
    if (!adminDoc.exists()) {
      hideLoading('login');
      showAlert('Account not found', { type: 'error' });
      await auth.signOut();
      return;
    }
    
    const adminData = adminDoc.data();
    
    if (adminData.status === 'pending') {
      hideLoading('login');
      showAlert('Account pending approval. Please wait for the System Admin to approve your account.', { type: 'warning' });
      await auth.signOut();
      return;
    }
    
    if (adminData.role === 'super_admin') {
      hideLoading('login');
      showAlert('Please use the Super Admin Login page', { type: 'info' });
      await auth.signOut();
      return;
    }
    
    sessionStorage.setItem('adminLoggedIn', 'true');
    if (adminData.collegeName) {
      localStorage.setItem('orgName', adminData.collegeName);
    }
    hideLoading('login');
     showToast('Login successful!');
     window.location.href = '../EventCRUD/EventCRUD.html';
   } catch (error) {
    hideLoading('login');
     console.error('Error:', error);
     if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
       showAlert('Invalid email or password', { type: 'error' });
     } else {
       showAlert('Login failed: ' + error.message, { type: 'error' });
     }
   }
});