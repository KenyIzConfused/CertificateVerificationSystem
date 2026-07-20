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
    const scanQRBtn = document.getElementById('scanQRBtn');
    const stopScanBtn = document.getElementById('stopScanBtn');
    const qrReader = document.getElementById('qrReader');
    let html5QrcodeScanner = null;

    if (scanQRBtn) {
        scanQRBtn.addEventListener('click', () => {
            qrReader.classList.remove('hidden');
            qrReader.classList.add('block');
            
            if (!html5QrcodeScanner) {
                html5QrcodeScanner = new Html5QrcodeScanner('qr-reader', {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                });
                
                html5QrcodeScanner.render((decodedText) => {
                    document.getElementById('certificateId').value = decodedText.toUpperCase();
                    qrReader.classList.add('hidden');
                    qrReader.classList.remove('block');
                    if (html5QrcodeScanner) {
                        html5QrcodeScanner.clear().catch(() => {});
                        html5QrcodeScanner = null;
                    }
                    form.dispatchEvent(new Event('submit'));
                }, (errorMessage) => {
                    console.log('QR scan error:', errorMessage);
                });
            }
        });
    }

    if (stopScanBtn) {
        stopScanBtn.addEventListener('click', () => {
            qrReader.classList.add('hidden');
            qrReader.classList.remove('block');
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear().catch(() => {});
                html5QrcodeScanner = null;
            }
        });
    }
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const certificateId = document.getElementById('certificateId').value.trim().toUpperCase();
            
            if (!certificateId) {
                showAlert('Please enter a certificate ID or scan a QR code', { type: 'warning' });
                return;
            }
            
            try {
                const result = await searchAllEventsForAttendee(certificateId);
                
                if (!result.found) {
                    showAlert('Certificate Not Found', { type: 'error' });
                    return;
                }
                
                document.getElementById('certName').textContent = result.attendee.fullName || '';
                document.getElementById('certEvent').textContent = result.eventTitle || '';
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