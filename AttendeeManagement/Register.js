import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, serverTimestamp, getDocs, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showConfirm, showToast, showLoading, hideLoading } from '../PopupSystem.js';
import { MAJOR_OPTIONS } from './form-options.js';

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

let currentUser = null;
let allStudents = [];

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const studentName = document.getElementById('studentName').value;
  const studentIdNumber = document.getElementById('studentIdNumber').value;
  const course = document.getElementById('studentCourse').value.trim();
  const major = document.getElementById('studentMajor').value.trim();
  const year = document.getElementById('studentYear').value.trim();
  
  const parts = [course, major, year].filter(Boolean);
  const combinedCourse = parts.join('-');
  
  const adminUid = currentUser?.uid || '';
  
  const confirmed = await showConfirm('Are you sure you want to register this student?');
  if (confirmed !== 1) return;
  
  try {
    showLoading('register');
    
    const existingQuery = query(collection(db, 'RegisteredStudents'), where('idNumber', '==', studentIdNumber), where('adminId', '==', adminUid));
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      hideLoading('register');
      showAlert('This ID number is already registered', { type: 'warning' });
      return;
    }
    
    const studentData = {
      fullName: studentName,
      idNumber: studentIdNumber,
      course: combinedCourse,
      role: 'Student',
      adminId: adminUid,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'RegisteredStudents'), studentData);
    hideLoading('register');
    document.getElementById('registerForm').reset();
    document.getElementById('studentMajor').innerHTML = '<option value="">Select Major</option>';
    showToast('Student registered successfully');
  } catch (error) {
    hideLoading('register');
    console.error('Error registering student:', error);
    showAlert('Failed to register student', { type: 'error' });
  }
});

document.getElementById('studentCourse').addEventListener('change', () => {
  const course = document.getElementById('studentCourse').value;
  const majorSelect = document.getElementById('studentMajor');
  const majors = MAJOR_OPTIONS[course] || [];
  majorSelect.innerHTML = '<option value="">Select Major</option>' +
    majors.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
});

document.getElementById('studentCourse').addEventListener('input', () => {
  document.getElementById('studentCourse').value = document.getElementById('studentCourse').value.toUpperCase();
});

document.getElementById('studentMajor').addEventListener('input', () => {
  document.getElementById('studentMajor').value = document.getElementById('studentMajor').value.toUpperCase();
});

document.getElementById('studentYear').addEventListener('input', () => {
  document.getElementById('studentYear').value = document.getElementById('studentYear').value.toUpperCase();
});

document.getElementById('studentName').addEventListener('input', () => {
  const el = document.getElementById('studentName');
  el.value = toTitleCase(el.value);
});

function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function filterStudents(studentsList, searchTerm) {
  if (!searchTerm) return studentsList;
  const term = searchTerm.toLowerCase();
  return studentsList.filter(s => 
    (s.fullName || '').toLowerCase().includes(term) ||
    (s.idNumber || '').toLowerCase().includes(term)
  );
}

function renderStudents(studentsList, searchTerm = '') {
  const filtered = filterStudents(studentsList, searchTerm);
  
  document.getElementById('registeredCount').textContent = studentsList.length;
  
  const tableBody = document.getElementById('registeredTableBody');
  const noData = document.getElementById('noRegistered');
  
  if (filtered.length === 0) {
    noData.style.display = 'block';
    tableBody.innerHTML = '';
    return;
  }
  
  noData.style.display = 'none';
  
  tableBody.innerHTML = filtered.map(student => {
    const courseParts = (student.course || '').split('-');
    const course = courseParts[0] || '';
    const major = courseParts[1] || '';
    const year = courseParts[2] || '';
    
    return `
      <tr class="border-b border-gray-100 hover:bg-green-50 transition-colors">
        <td class="py-4 px-4">
          <span class="font-medium text-gray-800">${escapeHtml(student.fullName)}</span>
        </td>
        <td class="py-4 px-4 text-gray-600">${escapeHtml(student.idNumber || '')}</td>
        <td class="py-4 px-4 text-gray-600">${escapeHtml(course)}</td>
        <td class="py-4 px-4 text-gray-600">${escapeHtml(major)}</td>
        <td class="py-4 px-4 text-gray-600">${escapeHtml(year)}</td>
        <td class="py-4 px-4">
          <div class="flex gap-1 flex-wrap">
            <button onclick="window.deleteStudent('${student.id}')" 
              class="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-xs">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteStudent = async (studentId) => {
  const confirmed = await showConfirm('Are you sure you want to delete this student?');
  if (confirmed !== 1) return;
  
  try {
    showLoading('deleteStudent');
    await deleteDoc(doc(db, 'RegisteredStudents', studentId));
    hideLoading('deleteStudent');
    showToast('Student deleted', 'success');
  } catch (error) {
    hideLoading('deleteStudent');
    console.error('Error deleting student:', error);
    showAlert('Failed to delete student', { type: 'error' });
  }
};

document.getElementById('searchStudents').addEventListener('input', () => {
  renderStudents(allStudents, document.getElementById('searchStudents').value);
});

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (!user) {
      window.location.href = '../logIn/LogInAdmin.html';
      return;
    }
    
    const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
    const adminData = adminDoc.exists() ? adminDoc.data() : {};
    
    if (adminData.status === 'rejected') {
      await showAlert('Account Rejected');
      await auth.signOut();
      window.location.href = '../logIn/LogInAdmin.html';
      return;
    }
    
    if (adminData.status !== 'approved') {
      await auth.signOut();
      window.location.href = '../logIn/LogInAdmin.html';
      return;
    }
    
    const orgName = localStorage.getItem('orgName');
    const headerOrgName = document.getElementById('headerOrgName');
    if (headerOrgName && orgName) {
      headerOrgName.textContent = orgName;
    }
    
    const q = query(collection(db, 'RegisteredStudents'), where('adminId', '==', user.uid));
    onSnapshot(q, (snapshot) => {
      allStudents = [];
      snapshot.forEach((docSnap) => {
        allStudents.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderStudents(allStudents, document.getElementById('searchStudents').value);
    });
});

window.handleLogout = async () => {
  try {
    await auth.signOut();
    sessionStorage.removeItem('adminLoggedIn');
    localStorage.removeItem('orgName');
  } catch (error) {
    console.error('Logout error:', error);
  }
  window.location.href = '../logIn/LogInAdmin.html?v=' + Date.now();
};