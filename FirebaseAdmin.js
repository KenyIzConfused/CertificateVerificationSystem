import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
import { showAlert } from './PopupSystem.js';
import './AppCheck.js';

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
const db = getFirestore(app);
const functions = getFunctions(app);

// Optional (used only when the Cloud Functions are deployed):
export const createAdminFn = httpsCallable(functions, 'createAdmin');
export const generateInviteCodeFn = httpsCallable(functions, 'generateInviteCode');

// Guard for admin pages and the login flow. Verifies the admin
// account by reading the Admin document directly from Firestore -
// no Cloud Function required, so the app works with Authentication
// and Firestore alone.
// Returns true only when the caller may use admin features. Accounts
// without an Admin document are signed out; service errors (e.g.
// network issues) leave the session alone and return false.
export async function requireAdmin() {
  if (!auth.currentUser) return false;
  try {
    const adminDoc = await getDoc(doc(db, 'Admin', auth.currentUser.uid));
    if (adminDoc.exists()) return true;
    // Signed in, but no admin record - not an admin account.
    showAlert('Access denied: this account does not have admin privileges.', { type: 'error' });
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out failed:', error);
    }
  } catch (error) {
    console.error('Admin check failed:', error);
    showAlert('Could not verify admin access. Check your connection and try again.', { type: 'error' });
  }
  return false;
}
