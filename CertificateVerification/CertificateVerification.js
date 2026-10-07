import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
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
const verifyCertificateFn = httpsCallable(functions, 'verifyCertificate');

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
                const result = await verifyCertificateFn({ certificateId });
                const data = result.data || {};
                
                if (!data.found) {
                    showAlert('Certificate Not Found', { type: 'error' });
                    return;
                }
                
                const attendee = data.attendee || {};
                
                document.getElementById('certName').textContent = attendee.fullName || '';
                document.getElementById('certCourse').textContent = attendee.course || '';
                document.getElementById('certRole').textContent = attendee.role || '';
                document.getElementById('certDateAttended').textContent = attendee.dateAttended || '';
                document.getElementById('certStatus').textContent = attendee.status ? attendee.status.charAt(0).toUpperCase() + attendee.status.slice(1) : '';
                document.getElementById('certId').textContent = attendee.certificateId || '';
                document.getElementById('certEvent').textContent = data.eventTitle || '';
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
