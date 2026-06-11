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
  
  const uuid = document.getElementById('certificateUuid').value.trim();
  
  if (!uuid) {
    showAlert('Please enter a certificate UUID', { type: 'warning' });
    return;
  }
  
  try {
    const eventsSnapshot = await getDocs(collection(db, 'Events'));
    let found = false;
    
    for (const eventDoc of eventsSnapshot.docs) {
      const attendeesQuery = query(
        collection(db, 'Events', eventDoc.id, 'Attendees'),
        where('uuid', '==', uuid)
      );
      const attendeesSnapshot = await getDocs(attendeesQuery);
      
      if (!attendeesSnapshot.empty) {
        const attendee = attendeesSnapshot.docs[0].data();
        document.getElementById('certName').textContent = attendee.fullName || '';
        document.getElementById('certEvent').textContent = eventDoc.data().title || '';
        document.getElementById('certCourse').textContent = attendee.course || '';
        document.getElementById('certRole').textContent = attendee.role || '';
        document.getElementById('certDate').textContent = attendee.dateAttended || '';
        document.getElementById('certUuid').textContent = attendee.uuid || '';
        document.getElementById('verifyForm').classList.add('hidden');
        document.getElementById('result').classList.remove('hidden');
        found = true;
        break;
      }
    }
    
    if (!found) {
      showAlert('Certificate not found', { type: 'error' });
      document.getElementById('result').classList.add('hidden');
    }
  } catch (error) {
    console.error('Error verifying certificate:', error);
    showAlert('Failed to verify certificate', { type: 'error' });
  }
});