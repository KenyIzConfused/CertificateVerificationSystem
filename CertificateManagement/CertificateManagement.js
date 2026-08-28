import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const VERIFICATION_URL = 'https://certificate-verification-system-6nx90yh8u.vercel.app/CertificateVerification/CertificateVerification.html?id=';

let currentEventId = localStorage.getItem('certEventId');
let currentEvent = null;
let allAttendees = [];
let templateBytes = null;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function generateQRCode(data) {
    return new Promise((resolve, reject) => {
        QRCode.toDataURL(data, { width: 150, margin: 2 }, (err, url) => {
            if (err) reject(err);
            else resolve(url);
        });
    });
}

async function generateCertificate(attendee, templateBytes) {
    const zip = new PizZip(templateBytes);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    const renderData = {
        fullName: attendee.fullName || '',
        course: attendee.course || '',
        role: attendee.role || '',
        dateAttended: attendee.dateAttended || '',
        certificateId: attendee.certificateId || ''
    };

    doc.render(renderData);
    return doc.getZip().generate({ type: 'nodebuffer' });
}

function downloadFile(buffer, filename) {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function renderAttendees() {
    const tableBody = document.getElementById('attendeesTableBody');
    const noAttendees = document.getElementById('noAttendees');

    if (allAttendees.length === 0) {
        noAttendees.style.display = 'block';
        tableBody.innerHTML = '';
        return;
    }

    noAttendees.style.display = 'none';

    tableBody.innerHTML = allAttendees.map(attendee => {
        const qrCodeHtml = attendee.qrCode
            ? `<img src="${attendee.qrCode}" alt="QR" class="w-12 h-12">`
            : `<span class="text-green-200/50 text-xs">No QR</span>`;

        return `
            <tr class="border-b border-green-400/20 hover:bg-white/10 transition-colors">
                <td class="py-4 px-2">
                    <span class="font-medium text-green-100">${escapeHtml(attendee.fullName)}</span>
                </td>
                <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.course)}</td>
                <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.role)}</td>
                <td class="py-4 px-2">
                    <span class="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-400/30 text-blue-200">
                        ${escapeHtml(attendee.certificateId || '')}
                    </span>
                </td>
                <td class="py-4 px-2">${qrCodeHtml}</td>
                <td class="py-4 px-2">
                    <div class="flex gap-1 flex-wrap">
                        <button onclick="window.downloadCertificate('${attendee.id}')"
                            class="action-item px-2 py-1 text-xs flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3"></path>
                            </svg>
                            Download
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

window.downloadCertificate = async (attendeeId) => {
    if (!templateBytes) {
        showAlert('Please upload a certificate template first.', { type: 'warning' });
        return;
    }

    const attendee = allAttendees.find(a => a.id === attendeeId);
    if (!attendee) return;

    try {
        const certBuffer = await generateCertificate(attendee, templateBytes);
        downloadFile(certBuffer, `Certificate_${attendee.certificateId}_${attendee.fullName}.docx`);
        showToast('Certificate downloaded!');
    } catch (error) {
        console.error('Error generating certificate:', error);
        showAlert('Failed to generate certificate', { type: 'error' });
    }
};

document.getElementById('uploadTemplateBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('templateFile');
    const statusEl = document.getElementById('templateStatus');
    const file = fileInput.files[0];

    if (!file) {
        showAlert('Please select a .docx file', { type: 'warning' });
        return;
    }

    if (!file.name.toLowerCase().endsWith('.docx')) {
        showAlert('Please upload a .docx file', { type: 'error' });
        return;
    }

    try {
        templateBytes = await file.arrayBuffer();

        // Upload to Firebase Storage
        const storageRef = ref(storage, `templates/${currentEventId}/template.docx`);
        await uploadBytes(storageRef, file);

        statusEl.textContent = 'Template uploaded successfully!';
        statusEl.classList.remove('hidden');
        showToast('Template uploaded!');
    } catch (error) {
        console.error('Error uploading template:', error);
        showAlert('Failed to upload template', { type: 'error' });
    }
});

document.getElementById('generateQRCodesBtn').addEventListener('click', async () => {
    const statusEl = document.getElementById('actionStatus');
    statusEl.classList.remove('hidden');
    statusEl.textContent = 'Generating QR codes...';

    let generated = 0;

    for (const attendee of allAttendees) {
        if (!attendee.certificateId) continue;

        try {
            const verificationUrl = VERIFICATION_URL + attendee.certificateId;
            const qrCodeDataUrl = await generateQRCode(verificationUrl);

            // Save QR code to Firestore
            await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendee.id), {
                qrCode: qrCodeDataUrl,
                verificationUrl: verificationUrl
            });

            attendee.qrCode = qrCodeDataUrl;
            generated++;
        } catch (error) {
            console.error('Error generating QR for', attendee.fullName, error);
        }
    }

    statusEl.textContent = `Generated ${generated} QR codes!`;
    showToast(`Generated ${generated} QR codes!`);
    renderAttendees();
});

document.getElementById('generateAllCertsBtn').addEventListener('click', async () => {
    if (!templateBytes) {
        showAlert('Please upload a certificate template first.', { type: 'warning' });
        return;
    }

    const statusEl = document.getElementById('actionStatus');
    statusEl.classList.remove('hidden');
    statusEl.textContent = 'Generating certificates...';

    let generated = 0;

    for (const attendee of allAttendees) {
        try {
            const certBuffer = await generateCertificate(attendee, templateBytes);
            downloadFile(certBuffer, `Certificate_${attendee.certificateId}_${attendee.fullName}.docx`);
            generated++;
        } catch (error) {
            console.error('Error generating certificate for', attendee.fullName, error);
        }
    }

    statusEl.textContent = `Downloaded ${generated} certificates!`;
    showToast(`Downloaded ${generated} certificates!`);
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = '../logIn/LogInAdmin.html';
        return;
    }

    if (!currentEventId) {
        window.location.href = '../EventCRUD/EventCRUD.html';
        return;
    }

    try {
        const eventDoc = await getDoc(doc(db, 'Events', currentEventId));
        if (!eventDoc.exists()) {
            showAlert('Event not found', { type: 'error' });
            window.location.href = '../EventCRUD/EventCRUD.html';
            return;
        }

        currentEvent = { id: eventDoc.id, ...eventDoc.data() };
        document.getElementById('eventInfo').textContent = `Event: ${currentEvent.title}`;

        // Load template if exists
        try {
            const templateRef = ref(storage, `templates/${currentEventId}/template.docx`);
            const templateUrl = await getDownloadURL(templateRef);
            const response = await fetch(templateUrl);
            templateBytes = await response.arrayBuffer();
            document.getElementById('templateStatus').textContent = 'Template loaded from storage.';
            document.getElementById('templateStatus').classList.remove('hidden');
        } catch (e) {
            // No template uploaded yet
        }

        // Load attendees
        const attendeesSnap = await getDocs(collection(db, 'Events', currentEventId, 'Attendees'));
        allAttendees = [];
        attendeesSnap.forEach(docSnap => {
            allAttendees.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderAttendees();
    } catch (error) {
        console.error('Error loading event:', error);
        window.location.href = '../EventCRUD/EventCRUD.html';
    }
});