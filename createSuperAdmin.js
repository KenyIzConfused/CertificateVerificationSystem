import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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