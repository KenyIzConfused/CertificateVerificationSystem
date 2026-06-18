import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

async function createSystemAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const collegeName = process.argv[4] || 'System Admin';

  if (!email || !password) {
    console.log('Usage: node createSystemAdmin.mjs <email> <password> <collegeName>');
    process.exit(1);
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'Admin', cred.user.uid), {
      collegeName,
      email,
      role: 'system_admin',
      status: 'approved',
      createdAt: new Date()
    });
    console.log('System Admin created successfully!');
    console.log('Email:', email);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createSystemAdmin();
