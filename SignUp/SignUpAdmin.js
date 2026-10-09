import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showToast, setButtonLoading } from '../PopupSystem.js';

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
const inviteCodeInput = document.getElementById('inviteCode');

// Pre-fill invite code from URL if present
function getInviteCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get('inviteCode') || params.get('code') || '').trim().toUpperCase();
}

const urlInviteCode = getInviteCodeFromUrl();
if (urlInviteCode) {
  inviteCodeInput.value = urlInviteCode;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
    
  const inviteCode = inviteCodeInput.value.trim().toUpperCase();
  const adminName = document.getElementById('adminName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
    
  if (password !== confirmPassword) {
    showAlert('Passwords do not match', { type: 'warning' });
    return;
  }

  // Validate invite code if provided
  if (inviteCode) {
    if (inviteCode.length > 20 || !/^[A-Z0-9-]+$/.test(inviteCode)) {
      showAlert('Invalid invite code format', { type: 'warning' });
      return;
    }
    try {
      const codeDoc = await getDoc(doc(db, 'inviteCodes', inviteCode));
      if (!codeDoc.exists()) {
        showAlert('Invite code not found', { type: 'error' });
        return;
      }
      const codeData = codeDoc.data();
      if (codeData.used) {
        showAlert('Invite code already used', { type: 'error' });
        return;
      }
    } catch (error) {
      console.warn('Could not validate invite code:', error);
      // Continue anyway - non-blocking
    }
  }

  setButtonLoading(submitBtn, true, 'Creating account...');

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'Admin', userCredential.user.uid), {
      adminName: adminName,
      email: email,
      createdAt: new Date(),
      ...(inviteCode ? { invitedVia: inviteCode } : {})
    });
    
    // Mark invite code as used if provided
    if (inviteCode) {
      try {
        await setDoc(doc(db, 'inviteCodes', inviteCode), {
          used: true,
          usedBy: userCredential.user.uid,
          usedAt: new Date()
        }, { merge: true });
      } catch (e) {
        console.warn('Could not mark invite code used:', e);
      }
    }

    await sendEmailVerification(userCredential.user);
    showToast('Account created! Please verify your email.');
    window.location.href = '../logIn/LogInAdmin.html';
  } catch (error) {
    console.error('Error:', error);
    showAlert('Sign up failed: ' + error.message, { type: 'error' });
  } finally {
    setButtonLoading(submitBtn, false);
  }
});