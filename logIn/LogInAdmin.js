import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showToast, showLoading, hideLoading } from '../PopupSystem.js';
import { auth, db } from '../firebase.js';

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
      showAlert('Account does not exist', { type: 'error' });
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
    
    if (adminData.status === 'rejected') {
      hideLoading('login');
      await showAlert('Account Rejected');
      await auth.signOut();
      return;
    }
    
    if (adminData.role === 'system_admin' || adminData.role === 'super_admin') {
      hideLoading('login');
      showAlert('Please use the System Admin login form', { type: 'info' });
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
     const errCode = (error.code || error.message || '').toLowerCase();
      const msg = errCode.includes('auth/wrong-password') || errCode.includes('wrong password') || errCode.includes('auth/invalid-credential') ? 'Wrong Password' : 'Invalid Input';
     showAlert(msg, { type: 'error' });
   }
});