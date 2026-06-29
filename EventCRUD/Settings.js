import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showToast } from '../PopupSystem.js';

const themes = {
  green: {
    primary: '#22c55e',
    dark: '#16a34a',
    gradient: 'linear-gradient(135deg, #16a34a, #15803d, #166534)'
  },
  blue: {
    primary: '#3b82f6',
    dark: '#2563eb',
    gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)'
  },
  red: {
    primary: '#ef4444',
    dark: '#dc2626',
    gradient: 'linear-gradient(135deg, #dc2626, #b91c1c, #991b1b)'
  },
  orange: {
    primary: '#f97316',
    dark: '#ea580c',
    gradient: 'linear-gradient(135deg, #ea580c, #c2410c, #9f330c)'
  },
  khaki: {
    primary: '#ca8a04',
    dark: '#a16207',
    gradient: 'linear-gradient(135deg, #a16207, #854d0e, #713f12)'
  },
  white: {
    primary: '#e5e7eb',
    dark: '#9ca3af',
    gradient: 'linear-gradient(135deg, #e5e7eb, #d1d5e7, #cbd5e1)'
  },
  dark: {
    primary: '#1f2937',
    dark: '#111827',
    gradient: 'linear-gradient(135deg, #111827, #0f172a, #020617)'
  },
  purple: {
    primary: '#a855f7',
    dark: '#9333ea',
    gradient: 'linear-gradient(135deg, #9333ea, #7e22ce, #6b21a8)'
  }
};

function applyTheme(themeName) {
  const theme = themes[themeName] || themes.green;
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-dark', theme.dark);
  root.style.setProperty('--theme-gradient', theme.gradient);
  localStorage.setItem('selectedTheme', themeName);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('selectedTheme');
  if (savedTheme && themes[savedTheme]) {
    applyTheme(savedTheme);
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = savedTheme;
  }
}

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
  
  if (data.selectedTheme) {
    applyTheme(data.selectedTheme);
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = data.selectedTheme;
  }
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentUser) {
    showAlert('Please log in first', { type: 'warning' });
    return;
  }

  const departmentName = document.getElementById('departmentName').value.trim();
  const departmentDetails = document.getElementById('departmentDetails').value.trim();
  const selectedTheme = document.getElementById('themeSelect').value;

  if (!departmentName) {
    showAlert('Please enter an Information Unit / Department name', { type: 'warning' });
    return;
  }

  try {
    await setDoc(doc(db, 'Admin', currentUser.uid), {
      departmentName,
      departmentDetails,
      selectedTheme,
      updatedAt: new Date()
    }, { merge: true });

    applyTheme(selectedTheme);
    showToast('Settings saved successfully');
    window.location.href = './EventCRUD.html';
  } catch (error) {
    console.error('Error saving settings:', error);
    showAlert('Failed to save settings', { type: 'error' });
  }
});

document.getElementById('themeSelect').addEventListener('change', (e) => {
  applyTheme(e.target.value);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../logIn/LogInAdmin.html';
    return;
  }

  currentUser = user;
  await loadSettings();
});
