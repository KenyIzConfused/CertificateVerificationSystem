import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showToast, showConfirm, showLoading, hideLoading } from '../PopupSystem.js';

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
  const reason = prompt(`Reject ${collegeName}?\n\nEnter rejection reason:`);
  if (reason === null) return;

  try {
    showLoading('reject');
    await updateDoc(doc(db, 'Admin', adminId), {
      status: 'rejected',
      rejectedAt: new Date(),
      reason: reason || 'Rejected by System Admin'
    });
    hideLoading('reject');
    showToast('Admin rejected');
  } catch (error) {
    hideLoading('reject');
    console.error('Error rejecting admin:', error);
    showAlert('Failed to reject admin', { type: 'error' });
  }
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  try {
    if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate().toLocaleString();
    }
    return new Date(dateValue).toLocaleString();
  } catch {
    return 'N/A';
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
        <p class="text-xs text-brand-500 mt-1">Created: ${formatDate(admin.createdAt)}</p>
      <p class="text-xs text-brand-500 mt-1">Updated: ${formatDate(admin.updatedAt)}</p>
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

const renderHistory = (admins) => {
  const container = document.getElementById('historyContainer');
  
  const historyAdmins = admins.filter(a => a.status === 'approved' || a.status === 'rejected');
  
  if (historyAdmins.length === 0) {
    container.innerHTML = '<p class="text-brand-400 text-center py-8">No history yet.</p>';
    return;
  }
  
  const sorted = [...historyAdmins].sort((a, b) => {
    const dateA = a.approvedAt || a.rejectedAt || a.createdAt;
    const dateB = b.approvedAt || b.rejectedAt || b.createdAt;
    return new Date(dateB) - new Date(dateA);
  });
  
  container.innerHTML = sorted.map(admin => {
    const isApproved = admin.status === 'approved';
    const date = isApproved 
      ? (admin.approvedAt ? new Date(admin.approvedAt.toDate()).toLocaleString() : 'N/A')
      : (admin.rejectedAt ? new Date(admin.rejectedAt.toDate()).toLocaleString() : 'N/A');
    const actionText = isApproved ? 'Approved' : 'Rejected';
    const badgeClass = isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    
    return `
      <div class="border border-gray-200 rounded-lg p-4">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h3 class="font-semibold text-gray-800">${escapeHtml(admin.collegeName)}</h3>
            <p class="text-sm text-gray-600">${escapeHtml(admin.email)}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-medium ${badgeClass}">
            ${actionText}
          </span>
        </div>
        <div class="flex justify-between items-center text-xs text-gray-500">
          <span>${date}</span>
          ${admin.reason ? `<span>Reason: ${escapeHtml(admin.reason)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
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
    renderHistory(admins);
  });
});