import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
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
const functions = getFunctions(app);
const verifyEventFn = httpsCallable(functions, 'verifyEvent');

function getEventCodeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (params.get('eventCode') || params.get('code') || '').trim().toUpperCase();
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
                const result = await verifyEventFn({ eventCode });
                const data = result.data || {};

                if (!data.found) {
                    showAlert('Event Not Found', { type: 'error' });
                    return;
                }

                const event = data.event || {};

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
                if (message.includes('not-found') || message.includes('unavailable') || message.includes('unimplemented')) {
                    showAlert('Verification service unavailable. The Cloud Function "verifyEvent" must be deployed for public verification to work.', { type: 'error' });
                } else {
                    showAlert(`Failed to verify event: ${message}`, { type: 'error' });
                }
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