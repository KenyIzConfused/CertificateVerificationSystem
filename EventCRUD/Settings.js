import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showToast } from '../PopupSystem.js';

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

let currentUser = null;

async function loadSettings() {
  if (!currentUser) return;

  const adminDoc = await getDoc(doc(db, 'Admin', currentUser.uid));
  const data = adminDoc.exists() ? adminDoc.data() : {};

  const departmentName = data.departmentName || data.department || 'Information Unit';
  document.getElementById('departmentName').value = departmentName;
  document.title = `${departmentName}: Settings`;
  document.getElementById('departmentDetails').value = data.departmentDetails || '';
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentUser) {
    showAlert('Please log in first', { type: 'warning' });
    return;
  }

  const departmentName = document.getElementById('departmentName').value.trim();
  const departmentDetails = document.getElementById('departmentDetails').value.trim();

  if (!departmentName) {
    showAlert('Please enter an Information Unit / Department name', { type: 'warning' });
    return;
  }

  try {
    await setDoc(doc(db, 'Admin', currentUser.uid), {
      departmentName,
      departmentDetails,
      updatedAt: new Date()
    }, { merge: true });

    showToast('Settings saved successfully');
    window.location.href = './EventCRUD.html';
  } catch (error) {
    console.error('Error saving settings:', error);
    showAlert('Failed to save settings', { type: 'error' });
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../logIn/LogInAdmin.html';
    return;
  }

  currentUser = user;
  await loadSettings();
});
