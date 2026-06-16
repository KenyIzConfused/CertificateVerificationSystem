import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDG0BxXk1LbmmsABIYtw2SgN4guroV8nFc",
  authDomain: "ipprc-certificate-verification.firebaseapp.com",
  projectId: "ipprc-certificate-verification",
  appId: "1:1056133117009:web:a1fcd175977a76d27c7470"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createSuperAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const collegeName = process.argv[4] || 'System Administrator';
  
  if (!email || !password) {
    console.log('Usage: node createSuperAdmin.js <email> <password> <collegeName>');
    process.exit(1);
  }
  
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'Admin', cred.user.uid), {
      collegeName, email, role: 'super_admin', status: 'approved', createdAt: new Date()
    });
    console.log('Super Admin created successfully!');
    console.log('Email:', email);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createSuperAdmin();