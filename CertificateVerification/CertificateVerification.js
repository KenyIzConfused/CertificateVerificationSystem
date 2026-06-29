import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert } from '../PopupSystem.js';

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

async function searchAllEventsForAttendee(certificateId) {
    const searchId = certificateId.toUpperCase();
    const eventsSnapshot = await getDocs(collection(db, 'Events'));
    
    for (const eventDoc of eventsSnapshot.docs) {
        const attendeesSnapshot = await getDocs(collection(db, 'Events', eventDoc.id, 'Attendees'));
        
        for (const attendeeDoc of attendeesSnapshot.docs) {
            const attendee = attendeeDoc.data();
            const storedId = (attendee.certificateId || '').toUpperCase();
            
            if (storedId === searchId) {
                return {
                    attendee: attendee,
                    eventId: eventDoc.id,
                    eventTitle: eventDoc.data().title || '',
                    found: true
                };
            }
        }
    }
    return { found: false };
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('verifyForm');
    const verifyAnotherBtn = document.getElementById('verifyAnotherBtn');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const certificateId = document.getElementById('certificateId').value.trim().toUpperCase();
            
            if (!certificateId) {
                showAlert('Please enter a certificate ID', { type: 'warning' });
                return;
            }
            
            try {
                const result = await searchAllEventsForAttendee(certificateId);
                
                if (!result.found) {
                    showAlert('Certificate Not Found', { type: 'error' });
                    return;
                }
                
                document.getElementById('certName').textContent = result.attendee.fullName || '';
                document.getElementById('certCourse').textContent = result.attendee.course || '';
                document.getElementById('certRole').textContent = result.attendee.role || '';
                document.getElementById('certDateAttended').textContent = result.attendee.dateAttended || '';
                document.getElementById('certStatus').textContent = result.attendee.status ? result.attendee.status.charAt(0).toUpperCase() + result.attendee.status.slice(1) : '';
                document.getElementById('certId').textContent = result.attendee.certificateId || '';
                document.getElementById('certEvent').textContent = result.eventTitle;
                document.getElementById('verifyForm').classList.add('hidden');
                document.getElementById('result').classList.remove('hidden');
            } catch (error) {
                console.error('Error verifying certificate:', error);
                showAlert(`Failed to verify certificate: ${error.message || 'Unknown error'}`, { type: 'error' });
            }
        });
    }
    
    if (verifyAnotherBtn) {
        verifyAnotherBtn.addEventListener('click', () => {
            document.getElementById('result').classList.add('hidden');
            document.getElementById('verifyForm').classList.remove('hidden');
            document.getElementById('certificateId').value = '';
        });
    }
});