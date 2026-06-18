import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
const db = getFirestore(app);

document.getElementById('verifyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get input and normalize to uppercase for case-insensitive search
  const certificateId = document.getElementById('certificateId').value.trim().toUpperCase();
  
  if (!certificateId) {
    showAlert('Please enter a certificate ID', { type: 'warning' });
    return;
  }
  
  try {
    const eventsSnapshot = await getDocs(collection(db, 'Events'));
    let found = false;
    
    for (const eventDoc of eventsSnapshot.docs) {
      // Query using case-insensitive comparison by fetching all and filtering
      const attendeesQuery = query(
        collection(db, 'Events', eventDoc.id, 'Attendees')
      );
      const attendeesSnapshot = await getDocs(attendeesQuery);
      
      for (const docSnap of attendeesSnapshot.docs) {
        const attendee = docSnap.data();
        if ((attendee.certificateId || '').toUpperCase() === certificateId) {
          document.getElementById('certName').textContent = attendee.fullName || '';
          document.getElementById('certCourse').textContent = attendee.course || '';
          document.getElementById('certRole').textContent = attendee.role || '';
          document.getElementById('certDateAttended').textContent = attendee.dateAttended || '';
          document.getElementById('certStatus').textContent = attendee.status ? attendee.status.charAt(0).toUpperCase() + attendee.status.slice(1) : '';
          document.getElementById('certId').textContent = attendee.certificateId || '';
          document.getElementById('certEvent').textContent = eventDoc.data().title || '';
          document.getElementById('verifyForm').classList.add('hidden');
          document.getElementById('result').classList.remove('hidden');
          found = true;
          break;
        }
      }
      
      if (found) break;
    }
    
    if (!found) {
      showAlert('Certificate Not Found', { type: 'error' });
      document.getElementById('result').classList.add('hidden');
      document.getElementById('verifyForm').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error verifying certificate:', error);
    showAlert('Failed to verify certificate', { type: 'error' });
  }
});