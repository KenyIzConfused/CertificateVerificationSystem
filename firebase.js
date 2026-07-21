import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
export const auth = getAuth(app);
export const db = getFirestore(app);
