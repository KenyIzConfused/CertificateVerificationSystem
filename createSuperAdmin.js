import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Usage: Create a super admin account
// Edit these values:
const superAdminEmail = 'your-email@example.com';
const superAdminPassword = 'your-password';
const superAdminName = 'System Administrator';

const createSuperAdmin = async () => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, superAdminEmail, superAdminPassword);
    await setDoc(doc(db, 'Admin', userCredential.user.uid), {
      collegeName: superAdminName,
      email: superAdminEmail,
      role: 'super_admin',
      status: 'approved',
      createdAt: new Date()
    });
    console.log('Super admin created successfully!');
    console.log('Email:', superAdminEmail);
    console.log('Password:', superAdminPassword);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

createSuperAdmin();