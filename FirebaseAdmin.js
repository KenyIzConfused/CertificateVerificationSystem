import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
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
const functions = getFunctions(app);

export const createAdminFn = httpsCallable(functions, 'createAdmin');
export const generateInviteCodeFn = httpsCallable(functions, 'generateInviteCode');
export const ensureAdminClaimFn = httpsCallable(functions, 'ensureAdminClaim');

// Guard for admin pages and the login flow. Verifies (and lazily backfills)
// the admin custom claim for accounts created before claims existed.
// Returns true only when the caller may use admin features; on failure the
// caller is signed out so protected pages can redirect to the login screen.
export async function requireAdmin() {
  if (!auth.currentUser) return false;
  try {
    const result = await ensureAdminClaimFn();
    if (result.data && result.data.admin) return true;
  } catch (error) {
    console.error('Admin claim check failed:', error);
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out failed:', error);
  }
  return false;
}
