import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
  
  const collegeName = document.getElementById('collegeName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (password !== confirmPassword) {
    showAlert('Passwords do not match', { type: 'warning' });
    return;
  }
  
  try {
    showLoading('signup');
    
    const emailQuery = query(
      collection(db, 'Admin'),
      where('email', '==', email)
    );
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      const existingAdmin = emailSnapshot.docs[0].data();
      hideLoading('signup');
      if (existingAdmin.status === 'rejected') {
        showAlert('This email was previously rejected. Contact the System Admin for more information.', { type: 'error' });
      } else {
        showAlert('This email is already registered.', { type: 'error' });
      }
      return;
    }
    
    const existingQuery = query(
      collection(db, 'Admin'),
      where('collegeName', '==', collegeName),
      where('status', '==', 'approved')
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      hideLoading('signup');
      showAlert('An account for this college already exists and is approved.', { type: 'error' });
      return;
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'Admin', userCredential.user.uid), {
      collegeName: collegeName,
      email: email,
      status: 'pending',
      createdAt: new Date()
    });
    await sendEmailVerification(userCredential.user);
    hideLoading('signup');
    showToast('Account created! Pending approval by Super Admin.');
    window.location.href = '../logIn/LogInAdmin.html';
   } catch (error) {
    hideLoading('signup');
    console.error('Error:', error);
    showAlert('Invalid Input', { type: 'error' });
  }
});