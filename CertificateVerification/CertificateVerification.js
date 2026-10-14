import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import '../AppCheck.js';
import { showAlert, setButtonLoading } from '../PopupSystem.js';

const firebaseConfig = {
    apiKey: "AIzaSyDG0BxXk1LbmmsABIYtw2SgN4guroV8nFc",
    authDomain: "ipprc-certificate-verification.firebaseauth.com",
    projectId: "ipprc-certificate-verification",
    storageBucket: "ipprc-certificate-verification.firebasestorage.app",
    messagingSenderId: "1056133117009",
    appId: "1:1056133117009:web:a1fcd175977a76d27c7470",
    measurementId: "G-R7PDE8B834"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

function getEventCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('eventCode') || params.get('code') || '').trim().toUpperCase();
}

// Direct Firestore scan by eventCode (works without Cloud Functions)
async function verifyEvent(eventCode) {
    const q = query(collection(db, 'Events'), where('eventCode', '==', eventCode.toUpperCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        return { found: false };
    }
    const eventDoc = snapshot.docs[0];
    const event = eventDoc.data();

    // Fetch attendee count
    let attendeeCount = 0;
    try {
        const attSnap = await getDocs(collection(db, 'Events', eventDoc.id, 'Attendees'));
        attendeeCount = attSnap.size;
    } catch (e) {
        console.warn('Could not fetch attendee count', e);
    }

    return {
        found: true,
        event: {
            title: event.title || '',
            description: event.description || '',
            date: event.date || '',
            time: event.time || '',
            location: event.location || '',
            duration: event.duration || null,
            department: event.department || '',
            speaker: event.speaker || '',
            organizer: event.adminName || '',
            attendeeCount: attendeeCount,
            eventCode: event.eventCode || ''
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('verifyForm');
    const verifyAnotherBtn = document.getElementById('verifyAnotherBtn');
    const verifyBtn = form.querySelector('button[type="submit"]');

    // Auto-verify if eventCode is in the URL
    const urlEventCode = getEventCodeFromUrl();
    if (urlEventCode) {
        document.getElementById('eventCode').value = urlEventCode;
        form.requestSubmit();
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const eventCode = document.getElementById('eventCode').value.trim().toUpperCase();

            if (!eventCode) {
                showAlert('Please enter an event code', { type: 'warning' });
                return;
            }

            if (eventCode.length > 20 || !/^[A-Z0-9-]+$/.test(eventCode)) {
                showAlert('Invalid event code format', { type: 'warning' });
                return;
            }

            setButtonLoading(verifyBtn, true, 'Verifying...');

            try {
                const result = await verifyEvent(eventCode);

                if (!result.found) {
                    showAlert('Event Not Found', { type: 'error' });
                    return;
                }

                const event = result.event || {};

                document.getElementById('eventName').textContent = event.title || '';
                document.getElementById('eventDate').textContent = event.date || '';
                document.getElementById('eventTime').textContent = event.time || '';
                document.getElementById('eventLocation').textContent = event.location || '';
                document.getElementById('eventDescription').textContent = event.description || '';
                document.getElementById('eventOrganizer').textContent = event.organizer || '';
                document.getElementById('eventAttendeeCount').textContent = event.attendeeCount || 0;
                document.getElementById('eventCodeDisplay').textContent = event.eventCode || '';

                document.getElementById('verifyForm').classList.add('hidden');
                document.getElementById('result').classList.remove('hidden');
            } catch (error) {
                console.error('Error verifying event:', error);
                const message = (error && error.message) ? error.message : 'Unknown error';
                showAlert(`Failed to verify event: ${message}`, { type: 'error' });
            } finally {
                setButtonLoading(verifyBtn, false);
            }
        });
    }

    if (verifyAnotherBtn) {
        verifyAnotherBtn.addEventListener('click', () => {
            document.getElementById('result').classList.add('hidden');
            document.getElementById('verifyForm').classList.remove('hidden');
            document.getElementById('eventCode').value = '';
        });
    }
});