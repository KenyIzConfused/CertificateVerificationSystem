import { createUserWithEmailAndPassword, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showToast, showLoading, hideLoading } from '../PopupSystem.js';
import { auth, db } from '../firebase.js';

function getFirebaseErrorMessage(error) {
  const errCode = (error.code || error.message || '').toLowerCase();
  
  if (errCode.includes('auth/email-already-in-use') || errCode.includes('email-already-in-use')) {
    return 'This email is already registered.';
  }
  if (errCode.includes('auth/invalid-email') || errCode.includes('invalid-email')) {
    return 'Invalid email format.';
  }
  if (errCode.includes('auth/weak-password') || errCode.includes('weak-password')) {
    return 'Password should be at least 6 characters.';
  }
  if (errCode.includes('auth/network-request-failed') || errCode.includes('network-request-failed')) {
    return 'Network error. Please check your internet connection.';
  }
  if (errCode.includes('auth/too-many-requests') || errCode.includes('too-many-requests')) {
    return 'Too many attempts. Please try again later.';
  }
  if (errCode.includes('auth/operation-not-allowed') || errCode.includes('operation-not-allowed')) {
    return 'Email/password sign-up is not enabled. Contact the System Admin.';
  }
  
  if (errCode.includes('permission-denied') || errCode.includes('insufficient permission') || errCode.includes('missing or insufficient permissions')) {
    return 'Permission denied. Please contact the System Admin to enable sign-up.';
  }
  
  if (errCode.includes('unavailable') || errCode.includes('network')) {
    return 'Service temporarily unavailable. Please try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}

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
  
  if (!collegeName || !email || !password) {
    showAlert('Please fill in all fields', { type: 'warning' });
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
    
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (authError) {
      hideLoading('signup');
      showAlert(getFirebaseErrorMessage(authError), { type: 'error' });
      return;
    }
    
    await userCredential.user.getIdToken();
    
    let adminDocRef;
    try {
      adminDocRef = doc(db, 'Admin', userCredential.user.uid);
      await setDoc(adminDocRef, {
        collegeName: collegeName,
        email: email,
        status: 'pending',
        createdAt: new Date()
      });
    } catch (firestoreError) {
      hideLoading('signup');
      console.error('Firestore write error:', firestoreError);
      
      try {
        await userCredential.user.delete();
      } catch (deleteError) {
        console.error('Failed to cleanup auth user:', deleteError);
      }
      
      if (firestoreError.code === 'permission-denied' || firestoreError.message?.toLowerCase().includes('permission')) {
        showAlert('Permission denied. The System Admin needs to update Firestore security rules to allow new sign-ups.', { type: 'error' });
      } else if (firestoreError.code === 'unavailable' || firestoreError.message?.toLowerCase().includes('unavailable')) {
        showAlert('Firestore is temporarily unavailable. Please try again in a moment.', { type: 'error' });
      } else {
        showAlert('Failed to save account data. Error: ' + (firestoreError.message || 'Unknown error'), { type: 'error' });
      }
      return;
    }
    
    try {
      await sendEmailVerification(userCredential.user);
    } catch (emailError) {
      console.error('Email verification error:', emailError);
    }
    
    hideLoading('signup');
    showToast('Account created! Pending approval by System Admin.');
    window.location.href = '../logIn/LogInAdmin.html';
     
  } catch (error) {
    hideLoading('signup');
    console.error('Unexpected error:', error);
    showAlert(getFirebaseErrorMessage(error), { type: 'error' });
  }
});
