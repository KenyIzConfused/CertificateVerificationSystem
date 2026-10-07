import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import '../AppCheck.js';
import { showAlert, setButtonLoading } from '../PopupSystem.js';

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
const functions = getFunctions(app);
const db = getFirestore(app);
const verifyCertificateFn = httpsCallable(functions, 'verifyCertificate');

// Fallback scan, used only when the verifyCertificate Cloud
// Function is unavailable (not deployed). Reads documents
// directly from Firestore.
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

// Primary path: the verifyCertificate Cloud Function (returns
// only display fields - never emails). If the function is not
// deployed, falls back to a direct Firestore scan.
async function verifyCertificate(certificateId) {
    try {
        const result = await verifyCertificateFn({ certificateId });
        const data = result.data || {};
        return {
            found: !!data.found,
            eventTitle: data.eventTitle || '',
            attendee: data.attendee || {}
        };
    } catch (error) {
        console.warn('verifyCertificate function unavailable, falling back to local scan:', error);
        return searchAllEventsForAttendee(certificateId);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('verifyForm');
    const verifyAnotherBtn = document.getElementById('verifyAnotherBtn');
    const verifyBtn = form.querySelector('button[type="submit"]');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const certificateId = document.getElementById('certificateId').value.trim().toUpperCase();
            
            if (!certificateId) {
                showAlert('Please enter a certificate ID', { type: 'warning' });
                return;
            }
            
            setButtonLoading(verifyBtn, true, 'Verifying...');

            try {
                const result = await verifyCertificate(certificateId);
                
                if (!result.found) {
                    showAlert('Certificate Not Found', { type: 'error' });
                    return;
                }
                
                const attendee = result.attendee || {};
                
                document.getElementById('certName').textContent = attendee.fullName || '';
                document.getElementById('certCourse').textContent = attendee.course || '';
                document.getElementById('certRole').textContent = attendee.role || '';
                document.getElementById('certDateAttended').textContent = attendee.dateAttended || '';
                document.getElementById('certStatus').textContent = attendee.status ? attendee.status.charAt(0).toUpperCase() + attendee.status.slice(1) : '';
                document.getElementById('certId').textContent = attendee.certificateId || '';
                document.getElementById('certEvent').textContent = result.eventTitle || '';
                document.getElementById('verifyForm').classList.add('hidden');
                document.getElementById('result').classList.remove('hidden');
            } catch (error) {
                console.error('Error verifying certificate:', error);
                const message = (error && error.message) ? error.message : 'Unknown error';
                showAlert(`Failed to verify certificate: ${message}`, { type: 'error' });
            } finally {
                setButtonLoading(verifyBtn, false);
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
