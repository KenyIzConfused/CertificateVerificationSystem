import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
const db = getFirestore(app);

document.querySelector('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  try {
    const adminDoc = await getDoc(doc(db, 'Admin', 'Admin1'));
    
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      if (email === data.email && password === data.password) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        alert('Login successful');
      } else {
        alert('Invalid email or password');
      }
    } else {
      alert('Admin account not found');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Login failed');
  }
});