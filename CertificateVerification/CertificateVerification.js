import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, query, where, getDocs, getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
    console.log('Using fallback: searching all events...');
    const eventsSnapshot = await getDocs(collection(db, 'Events'));
    console.log('Found', eventsSnapshot.docs.length, 'events');
    
    for (const eventDoc of eventsSnapshot.docs) {
        const attendeesSnapshot = await getDocs(collection(db, 'Events', eventDoc.id, 'Attendees'));
        console.log(`Event ${eventDoc.id} has ${attendeesSnapshot.docs.length} attendees`);
        
        for (const attendeeDoc of attendeesSnapshot.docs) {
            const attendee = attendeeDoc.data();
            const searchId = certificateId.toUpperCase();
            const storedId = (attendee.certificateId || '').toUpperCase();
            
            console.log(`Comparing: searching for "${searchId}" against "${storedId}"`);
            
            if (storedId === searchId) {
                console.log('Match found!');
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
    console.log('DOM loaded, setting up form handlers');
    const form = document.getElementById('verifyForm');
    const verifyAnotherBtn = document.getElementById('verifyAnotherBtn');
    
    console.log('Form found:', !!form);
    console.log('Verify Another button found:', !!verifyAnotherBtn);
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const certificateId = document.getElementById('certificateId').value.trim();
            console.log('Searching for certificate ID:', certificateId);
            
            if (!certificateId) {
                showAlert('Please enter a certificate ID', { type: 'warning' });
                return;
            }
            
            try {
                console.log('Starting search...');
                const result = await searchAllEventsForAttendee(certificateId);
                
                if (!result.found) {
                    showAlert('Certificate Not Found', { type: 'error' });
                    return;
                }
                
                console.log('Search complete. Result:', result);
                
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
    } else {
        console.error('verifyAnotherBtn not found in DOM');
    }
});