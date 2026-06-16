import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showToast, showConfirm, showLoading, hideLoading } from '../PopupSystem.js';

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

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

window.approveAdmin = async (adminId, collegeName) => {
  const confirmed = await showConfirm(`Approve ${collegeName}? This will allow them to login.`);
  if (confirmed !== 1) return;

  try {
    showLoading('approve');
    await updateDoc(doc(db, 'Admin', adminId), { status: 'approved' });
    hideLoading('approve');
    showToast('Admin approved successfully');
  } catch (error) {
    hideLoading('approve');
    console.error('Error approving admin:', error);
    showAlert('Failed to approve admin', { type: 'error' });
  }
};

window.rejectAdmin = async (adminId, collegeName) => {
  const confirmed = await showConfirm(`Reject ${collegeName}? This will delete the account.`);
  if (confirmed !== 1) return;

  try {
    showLoading('reject');
    await deleteDoc(doc(db, 'Admin', adminId));
    hideLoading('reject');
    showToast('Admin rejected');
  } catch (error) {
    hideLoading('reject');
    console.error('Error rejecting admin:', error);
    showAlert('Failed to reject admin', { type: 'error' });
  }
};

const renderPendingAdmins = (admins) => {
  const container = document.getElementById('pendingAdminsContainer');
  
  const pendingAdmins = admins.filter(a => a.status === 'pending');
  
  if (pendingAdmins.length === 0) {
    container.innerHTML = '<p class="text-brand-400 text-center py-8">No pending approvals.</p>';
    return;
  }
  
  container.innerHTML = pendingAdmins.map(admin => `
    <div class="border border-brand-200 rounded-lg p-4 flex justify-between items-center">
      <div>
        <h3 class="font-semibold text-brand-900">${escapeHtml(admin.collegeName)}</h3>
        <p class="text-sm text-brand-600">${escapeHtml(admin.email)}</p>
        <p class="text-xs text-brand-500 mt-1">Created: ${admin.createdAt ? new Date(admin.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p>
      </div>
      <div class="flex gap-2">
        <button onclick="window.approveAdmin('${admin.id}', '${escapeHtml(admin.collegeName)}')" 
          class="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
          Approve
        </button>
        <button onclick="window.rejectAdmin('${admin.id}', '${escapeHtml(admin.collegeName)}')" 
          class="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
          Reject
        </button>
      </div>
    </div>
  `).join('');
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../logIn/LogInSuperAdmin.html';
    return;
  }

  const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
  if (!adminDoc.exists() || adminDoc.data().role !== 'super_admin') {
    await signOut(auth);
    window.location.href = '../logIn/LogInSuperAdmin.html';
    return;
  }

  const q = collection(db, 'Admin');
  onSnapshot(q, (snapshot) => {
    const admins = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.role !== 'super_admin') {
        admins.push({ id: doc.id, ...data });
      }
    });
    renderPendingAdmins(admins);
  });
});