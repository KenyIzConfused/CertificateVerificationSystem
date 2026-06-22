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
    container.innerHTML = '<p class="dashboard-empty-state">No pending approvals.</p>';
    return;
  }
  
  container.innerHTML = pendingAdmins.map(admin => `
    <article class="approval-request">
      <div class="approval-request__body">
        <h3 class="approval-request__title">${escapeHtml(admin.collegeName)}</h3>
        <p class="approval-request__meta">${escapeHtml(admin.email)}</p>
        <p class="approval-request__meta approval-request__meta--muted">Created: ${formatDate(admin.createdAt)}</p>
        <p class="approval-request__meta approval-request__meta--muted">Updated: ${formatDate(admin.updatedAt)}</p>
      </div>
      <div class="approval-request__actions">
        <button onclick="window.approveAdmin('${admin.id}', '${escapeHtml(admin.collegeName)}')" 
          class="approval-action approval-action--approve">
          Approve
        </button>
        <button onclick="window.rejectAdmin('${admin.id}', '${escapeHtml(admin.collegeName)}')" 
          class="approval-action approval-action--reject">
          Reject
        </button>
      </div>
    </article>
  `).join('');
};

const renderHistory = (admins) => {
  const container = document.getElementById('historyContainer');
  
  const historyAdmins = admins.filter(a => a.status === 'approved' || a.status === 'rejected');
  
  if (historyAdmins.length === 0) {
    container.innerHTML = '<p class="dashboard-empty-state">No history yet.</p>';
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
    
    return `
      <article class="history-entry">
        <div class="history-entry__top">
          <div class="history-entry__body">
            <h3>${escapeHtml(admin.collegeName)}</h3>
            <p>${escapeHtml(admin.email)}</p>
          </div>
          <span class="history-badge ${isApproved ? 'history-badge--approved' : 'history-badge--rejected'}">
            ${actionText}
          </span>
        </div>
        <div class="history-entry__footer">
          <span>${date}</span>
          ${admin.reason ? `<span>Reason: ${escapeHtml(admin.reason)}</span>` : ''}
        </div>
      </article>
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