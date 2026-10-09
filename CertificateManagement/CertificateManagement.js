import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { showAlert, showToast, setButtonLoading, registerSession, startSessionEnforcement, stopSessionEnforcement } from '../PopupSystem.js';
import { requireAdmin } from '../FirebaseAdmin.js';

const themes = {
  green: {
    primary: '#22c55e',
    dark: '#16a34a',
    gradient: 'linear-gradient(135deg, #16a34a, #15803d, #166534)'
  },
  blue: {
    primary: '#3b82f6',
    dark: '#2563eb',
    gradient: 'linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)'
  },
  red: {
    primary: '#ef4444',
    dark: '#dc2626',
    gradient: 'linear-gradient(135deg, #dc2626, #b91c1c, #991b1b)'
  },
  orange: {
    primary: '#f97316',
    dark: '#ea580c',
    gradient: 'linear-gradient(135deg, #ea580c, #c2410c, #9f330c)'
  },
  khaki: {
    primary: '#ca8a04',
    dark: '#a16207',
    gradient: 'linear-gradient(135deg, #a16207, #854d0e, #713f12)'
  },
  white: {
    primary: '#e5e7eb',
    dark: '#9ca3af',
    gradient: 'linear-gradient(135deg, #e5e7eb, #d1d5e7, #cbd5e1)'
  },
  dark: {
    primary: '#1f2937',
    dark: '#111827',
    gradient: 'linear-gradient(135deg, #111827, #0f172a, #020617)'
  },
  purple: {
    primary: '#a855f7',
    dark: '#9333ea',
    gradient: 'linear-gradient(135deg, #9333ea, #7e22ce, #6b21a8)'
  }
};

function applyTheme(themeName) {
  const theme = themes[themeName] || themes.green;
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-dark', theme.dark);
  root.style.setProperty('--theme-gradient', theme.gradient);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('selectedTheme');
  if (savedTheme && themes[savedTheme]) {
    applyTheme(savedTheme);
  }
}

loadTheme();

const firebaseConfig = {
    apiKey: "AIzaSyDG0BxXk1LbmmsABIYtw2SgN4guroV8nFc",
    authDomain: "ipprc-certificate-verification.firebaseapp.com",
    projectId: "ipprc-certificate-verification",
    storageBucket: "ipprc-certificate-verification.firebasestorage.app",
    messagingSenderId: "1056133117009",
    appId: "1:1056133117009:web:a1fcd175977a76d27c7470",
    measurementId: "G-R7PDE8B834"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Firebase Storage removed - using IndexedDB instead (no billing required)

const VERIFICATION_URL = 'https://certificate-verification-system-6nx90yh8u.vercel.app/verify-event?code=';

let currentEventId = null;
let currentEvent = null;
let allAttendees = [];
let filteredCertAttendees = [];
let certPage = 1;
const CERTS_PER_PAGE = 5;
let templateBytes = null;

const EMAILJS_CONFIG = {
    publicKey: 'saBe1zZZOBcdCCo2d',
    serviceId: 'service_abpazhd',
    templateId: 'template_d8urv77'
};

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function getTemplateCacheKey(eventId) {
    return `cert_template_${eventId}`;
}

function openTemplateDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CertificateTemplates', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('templates')) {
                db.createObjectStore('templates', { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveTemplateToIndexedDb(eventId, buffer) {
    const db = await openTemplateDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('templates', 'readwrite');
        const store = tx.objectStore('templates');
        store.put({ id: getTemplateCacheKey(eventId), data: buffer, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getTemplateFromIndexedDb(eventId) {
    const db = await openTemplateDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('templates', 'readonly');
        const store = tx.objectStore('templates');
        const request = store.get(getTemplateCacheKey(eventId));
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => reject(request.error);
    });
}

async function generateCertificate(attendee, templateBytes) {
    const zip = new window.PizZip(templateBytes);
    const doc = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    const renderData = {
        name: attendee.fullName || '',
        fullName: attendee.fullName || '',
        course: attendee.course || '',
        role: attendee.role || '',
        dateAttended: attendee.dateAttended || '',
        certificateId: attendee.certificateId || '',
        eventCode: currentEvent.eventCode || '',
        eventTitle: currentEvent.title || '',
        eventDate: currentEvent.date || '',
        eventLocation: currentEvent.location || ''
    };

    doc.render(renderData);
    return doc.getZip().generate({ type: 'uint8array' });
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

function renderCertAttendeeRow(attendee) {
    return `
        <tr class="border-b border-green-400/20 hover:bg-white/10 transition-colors">
            <td class="py-4 px-2">
                <span class="font-medium text-green-100">${escapeHtml(attendee.fullName)}</span>
            </td>
            <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.course)}</td>
            <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.role)}</td>
            <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.email || '')}</td>
            <td class="py-4 px-2">
                <span class="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-400/30 text-blue-200">
                    ${escapeHtml(attendee.certificateId || '')}
                </span>
            </td>
            <td class="py-4 px-2">
                <div class="flex gap-1 flex-wrap">
                    <button onclick="window.downloadCertificate('${attendee.id}', this)"
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
}

function filterCertAttendees(searchTerm) {
    if (!searchTerm) return allAttendees.slice();
    const term = searchTerm.toLowerCase();
    return allAttendees.filter(a =>
        (a.fullName || '').toLowerCase().includes(term) ||
        (a.course || '').toLowerCase().includes(term) ||
        (a.role || '').toLowerCase().includes(term) ||
        (a.email || '').toLowerCase().includes(term) ||
        (a.certificateId || '').toLowerCase().includes(term)
    );
}

function totalPagesCert() {
    return Math.max(1, Math.ceil(filteredCertAttendees.length / CERTS_PER_PAGE));
}

function renderCertAttendees() {
    const tableBody = document.getElementById('attendeesTableBody');
    const noAttendees = document.getElementById('noAttendees');
    const pagination = document.getElementById('certPagination');
    const pageInfo = document.getElementById('certPageInfo');
    const searchEl = document.getElementById('certSearch');

    const term = (searchEl?.value || '').trim();
    filteredCertAttendees = filterCertAttendees(term);

    if (filteredCertAttendees.length === 0) {
        noAttendees?.classList.remove('hidden');
        noAttendees.textContent = allAttendees.length === 0 ? 'No attendees yet.' : 'No attendees match your search.';
        tableBody.innerHTML = '';
        pagination?.classList.add('hidden');
        return;
    }

    noAttendees?.classList.add('hidden');
    if (certPage > totalPagesCert()) certPage = 1;
    const start = (certPage - 1) * CERTS_PER_PAGE;
    const pageRows = filteredCertAttendees.slice(start, start + CERTS_PER_PAGE).map(renderCertAttendeeRow).join('');
    tableBody.innerHTML = pageRows;

    const total = totalPagesCert();
    pagination?.classList.remove('hidden');
    if (pageInfo) pageInfo.textContent = `Page ${certPage} of ${total}  •  ${filteredCertAttendees.length} attendee${filteredCertAttendees.length === 1 ? '' : 's'}`;

    const prevBtn = document.getElementById('certPrevBtn');
    const nextBtn = document.getElementById('certNextBtn');
    if (prevBtn) {
        prevBtn.disabled = certPage === 1;
        prevBtn.classList.toggle('opacity-40', certPage === 1);
        prevBtn.classList.toggle('cursor-not-allowed', certPage === 1);
        prevBtn.classList.toggle('pointer-events-none', certPage === 1);
    }
    if (nextBtn) {
        nextBtn.disabled = certPage === total;
        nextBtn.classList.toggle('opacity-40', certPage === total);
        nextBtn.classList.toggle('cursor-not-allowed', certPage === total);
        nextBtn.classList.toggle('pointer-events-none', certPage === total);
    }
}

window.changeCertPage = (dir) => {
    const total = totalPagesCert();
    let next = certPage + dir;
    if (next < 1) next = 1;
    if (next > total) next = total;
    certPage = next;
    renderCertAttendees();
    document.getElementById('attendeesTableBody').scrollIntoView({ behavior: 'smooth' });
};

window.downloadCertificate = async (attendeeId, btn) => {
    if (btn) setButtonLoading(btn, true, 'Generating...');
    if (!templateBytes) {
        showAlert('Please upload a certificate template first.', { type: 'warning' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    const attendee = allAttendees.find(a => a.id === attendeeId);
    if (!attendee) {
        if (btn) setButtonLoading(btn, false);
        return;
    }

    try {
        const certBuffer = await generateCertificate(attendee, templateBytes);
        downloadFile(certBuffer, `Certificate_${attendee.certificateId}_${attendee.fullName}.docx`);
        showToast('Certificate downloaded!');
    } catch (error) {
        console.error('Error generating certificate:', error);
        showAlert('Failed to generate certificate', { type: 'error' });
    } finally {
        if (btn) setButtonLoading(btn, false);
    }
};

window.sendSingleCertificate = async (attendeeId, btn) => {
    if (btn) setButtonLoading(btn, true, 'Generating...');
    window.closeSelectModal();
    window.closeSendEmailModal();

    if (!templateBytes) {
        showAlert('Please upload a certificate template first.', { type: 'warning' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    const attendee = allAttendees.find(a => a.id === attendeeId);
    if (!attendee) {
        showAlert('Attendee not found.', { type: 'error' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    if (!attendee.email) {
        showAlert(`${attendee.fullName} does not have an email address.`, { type: 'warning' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    const statusEl = document.getElementById('actionStatus');
    statusEl.classList.remove('hidden');
    statusEl.textContent = `Generating certificate for ${attendee.fullName}...`;

    try {
        const certBuffer = await generateCertificate(attendee, templateBytes);
        const verificationUrl = `${VERIFICATION_URL}${currentEvent.eventCode || ''}`;

        const templateParams = {
            to_email: attendee.email,
            to_name: attendee.fullName,
            event_title: currentEvent.title,
            certificate_id: attendee.certificateId,
            event_code: currentEvent.eventCode || '',
            course: attendee.course || '',
            role: attendee.role || '',
            date_attended: attendee.dateAttended || '',
            verification_url: verificationUrl
        };

        if (EMAILJS_CONFIG.publicKey && EMAILJS_CONFIG.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
            try {
                emailjs.init(EMAILJS_CONFIG.publicKey);
                await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams);
                statusEl.textContent = `Certificate sent to ${attendee.fullName}!`;
                showToast(`Certificate sent to ${attendee.fullName}!`);
            } catch (emailError) {
                console.error('EmailJS error:', emailError);
                throw emailError;
            }
        } else {
            const subject = encodeURIComponent(`Your Certificate - ${currentEvent.title}`);
            const body = encodeURIComponent(`Dear ${attendee.fullName},\n\nPlease find your certificate for "${currentEvent.title}" attached to this email.\n\nCertificate ID: ${attendee.certificateId}\n\nVerification URL: ${verificationUrl}\n\nBest regards,\nInformation Unit (IPPRC)`);
            const mailtoLink = `mailto:${encodeURIComponent(attendee.email)}?subject=${subject}&body=${body}`;
            setTimeout(() => { window.location.href = mailtoLink; }, 500);
            statusEl.textContent = `Certificate generated for ${attendee.fullName}! Check your email client.`;
            showToast('Certificate generated! Your email client should open shortly.');
        }
    } catch (error) {
        console.error('Error generating certificate:', error);
        showAlert('Failed to generate certificate: ' + error.message, { type: 'error' });
        statusEl.textContent = 'Failed to generate certificate.';
    } finally {
        if (btn) setButtonLoading(btn, false);
    }
};

window.openSendEmailModal = () => {
    if (!templateBytes) {
        showAlert('Please upload a certificate template first.', { type: 'warning' });
        return;
    }

    const list = document.getElementById('sendEmailList');
    const attendeesWithEmail = allAttendees.filter(a => a.email);

    if (attendeesWithEmail.length === 0) {
        showAlert('No attendees with email addresses found.', { type: 'warning' });
        return;
    }

    list.innerHTML = attendeesWithEmail.map(attendee => `
        <button onclick="window.sendSingleCertificate('${attendee.id}', this)" class="action-item w-full p-3 text-left flex items-center justify-between hover:bg-green-400/20">
            <div>
                <div class="font-medium text-green-100">${escapeHtml(attendee.fullName)}</div>
                <div class="text-xs text-green-200/60">${escapeHtml(attendee.email)} • ${escapeHtml(attendee.course || '')} • ${escapeHtml(attendee.role || '')}</div>
            </div>
            <span class="text-xs px-2 py-1 rounded-full bg-blue-400/30 text-blue-200">${escapeHtml(attendee.certificateId || '')}</span>
        </button>
    `).join('');

    const statusEl = document.getElementById('sendEmailStatus');
    statusEl.textContent = `Select an attendee to send their certificate via email (${attendeesWithEmail.length} with email):`;

    const modal = document.getElementById('sendEmailModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeSendEmailModal = () => {
    const modal = document.getElementById('sendEmailModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.sendAllEmails = async (btn) => {
    if (btn) setButtonLoading(btn, true, 'Sending...');
    window.closeSendEmailModal();

    if (!templateBytes) {
        showAlert('Please upload a certificate template first.', { type: 'warning' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    const attendeesWithEmail = allAttendees.filter(a => a.email);
    if (attendeesWithEmail.length === 0) {
        showAlert('No attendees with email addresses found.', { type: 'warning' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    const statusEl = document.getElementById('actionStatus');
    statusEl.classList.remove('hidden');
    statusEl.textContent = `Generating ${attendeesWithEmail.length} certificates...`;

    const zip = new window.JSZip();
    let generated = 0;

    for (const attendee of attendeesWithEmail) {
        try {
            const certBuffer = await generateCertificate(attendee, templateBytes);
            const filename = `Certificate_${attendee.certificateId}_${attendee.fullName}.docx`;
            zip.file(filename, certBuffer);

            const verificationUrl = `${VERIFICATION_URL}${currentEvent.eventCode || ''}`;

            const templateParams = {
                to_email: attendee.email,
                to_name: attendee.fullName,
                event_title: currentEvent.title,
                certificate_id: attendee.certificateId,
                event_code: currentEvent.eventCode || '',
                course: attendee.course || '',
                role: attendee.role || '',
                date_attended: attendee.dateAttended || '',
                verification_url: verificationUrl
            };

            if (EMAILJS_CONFIG.publicKey && EMAILJS_CONFIG.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
                try {
                    emailjs.init(EMAILJS_CONFIG.publicKey);
                    await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, templateParams);
                } catch (emailError) {
                    console.error('EmailJS error for', attendee.fullName, emailError);
                }
            } else {
                const subject = encodeURIComponent(`Your Certificate - ${currentEvent.title}`);
                const body = encodeURIComponent(`Dear ${attendee.fullName},\n\nPlease find your certificate for "${currentEvent.title}" attached to this email.\n\nCertificate ID: ${attendee.certificateId}\n\nVerification URL: ${verificationUrl}\n\nBest regards,\nInformation Unit (IPPRC)`);
                const mailtoLink = `mailto:${encodeURIComponent(attendee.email)}?subject=${subject}&body=${body}`;
                setTimeout(() => { window.location.href = mailtoLink; }, generated * 800);
            }

            generated++;
        } catch (error) {
            console.error('Error generating certificate for', attendee.fullName, error);
        }
    }

    try {
        statusEl.textContent = 'Creating ZIP file...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `${(currentEvent.title || 'certificates').replace(/\s+/g, '_')}_certificates.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl);

        statusEl.textContent = `Downloaded ${generated} certificates as ZIP!`;
        showToast(`Downloaded ${generated} certificates as ZIP!`);
    } catch (error) {
        console.error('Error creating ZIP:', error);
        statusEl.textContent = 'Failed to create ZIP.';
        showAlert('Failed to create ZIP file', { type: 'error' });
    } finally {
        if (btn) setButtonLoading(btn, false);
    }
};

const uploadBtn = document.getElementById('uploadTemplateBtn');
if (uploadBtn) uploadBtn.addEventListener('click', async () => {
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

        setButtonLoading(uploadBtn, true, 'Uploading...');

        try {
            templateBytes = await file.arrayBuffer();

            try {
                await saveTemplateToIndexedDb(currentEventId, templateBytes);
            } catch (idbError) {
                console.error('Failed to cache template in IndexedDB:', idbError);
            }

            statusEl.textContent = 'Template uploaded successfully!';
            statusEl.classList.remove('hidden');
            showToast('Template uploaded!');
        } catch (error) {
            console.error('Error uploading template:', error);
            showAlert('Failed to upload template', { type: 'error' });
        } finally {
            setButtonLoading(uploadBtn, false);
        }
    });

window.openSelectAttendeeModal = () => {
    if (!templateBytes) {
        showAlert('Please upload a certificate template first.', { type: 'warning' });
        return;
    }

    const list = document.getElementById('attendeeSelectList');
    if (allAttendees.length === 0) {
        showAlert('No attendees to generate certificates for.', { type: 'warning' });
        return;
    }

    list.innerHTML = allAttendees.map(attendee => `
        <button onclick="window.generateSingleCertificate('${attendee.id}', this)" class="action-item w-full p-3 text-left flex items-center justify-between hover:bg-green-400/20">
            <div>
                <div class="font-medium text-green-100">${escapeHtml(attendee.fullName)}</div>
                <div class="text-xs text-green-200/60">${escapeHtml(attendee.course || '')} • ${escapeHtml(attendee.role || '')}</div>
            </div>
            <span class="text-xs px-2 py-1 rounded-full bg-blue-400/30 text-blue-200">${escapeHtml(attendee.certificateId || '')}</span>
        </button>
    `).join('');

    const modal = document.getElementById('selectAttendeeModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeSelectModal = () => {
    const modal = document.getElementById('selectAttendeeModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.generateAllFromModal = async (btn) => {
    if (btn) setButtonLoading(btn, true, 'Generating...');
    window.closeSelectModal();

    if (!templateBytes) {
        showAlert('Please upload a certificate template first.', { type: 'warning' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    if (allAttendees.length === 0) {
        showAlert('No attendees to generate certificates for.', { type: 'warning' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    const statusEl = document.getElementById('actionStatus');
    statusEl.classList.remove('hidden');
    statusEl.textContent = `Generating ${allAttendees.length} certificates...`;

    const zip = new window.JSZip();
    let generated = 0;

    for (const attendee of allAttendees) {
        try {
            const certBuffer = await generateCertificate(attendee, templateBytes);
            const filename = `Certificate_${attendee.certificateId}_${attendee.fullName}.docx`;
            zip.file(filename, certBuffer);
            generated++;
        } catch (error) {
            console.error('Error generating certificate for', attendee.fullName, error);
        }
    }

    try {
        statusEl.textContent = 'Creating ZIP file...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = zipUrl;
        a.download = `${(currentEvent.title || 'certificates').replace(/\s+/g, '_')}_certificates.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(zipUrl);

        statusEl.textContent = `Downloaded ${generated} certificates as ZIP!`;
        showToast(`Downloaded ${generated} certificates as ZIP!`);
    } catch (error) {
        console.error('Error creating ZIP:', error);
        statusEl.textContent = 'Failed to create ZIP.';
        showAlert('Failed to create ZIP file', { type: 'error' });
    } finally {
        if (btn) setButtonLoading(btn, false);
    }
};

window.generateSingleCertificate = async (attendeeId, btn) => {
    if (btn) setButtonLoading(btn, true, 'Generating...');
    window.closeSelectModal();

    if (!templateBytes) {
        showAlert('Please upload a certificate template first.', { type: 'warning' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    const attendee = allAttendees.find(a => a.id === attendeeId);
    if (!attendee) {
        showAlert('Attendee not found.', { type: 'error' });
        if (btn) setButtonLoading(btn, false);
        return;
    }

    const statusEl = document.getElementById('actionStatus');
    statusEl.classList.remove('hidden');
    statusEl.textContent = `Generating certificate for ${attendee.fullName}...`;

    try {
        const certBuffer = await generateCertificate(attendee, templateBytes);
        const blob = new Blob([certBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const previewWindow = window.open(url, '_blank');

        if (!previewWindow) {
            downloadFile(certBuffer, `Certificate_${attendee.certificateId}_${attendee.fullName}.docx`);
        }

        setTimeout(() => URL.revokeObjectURL(url), 60000);

        statusEl.textContent = `Certificate generated for ${attendee.fullName}!`;
        showToast('Certificate generated! Check the new tab or your downloads.');
    } catch (error) {
        console.error('Error generating certificate:', error);
        showAlert('Failed to generate certificate: ' + error.message, { type: 'error' });
        statusEl.textContent = 'Failed to generate certificate.';
    } finally {
        if (btn) setButtonLoading(btn, false);
    }
};

document.getElementById('generateSingleCertBtn').addEventListener('click', window.openSelectAttendeeModal);
document.getElementById('sendSingleCertBtn').addEventListener('click', window.openSendEmailModal);

const certSearchEl = document.getElementById('certSearch');
if (certSearchEl) {
    certSearchEl.addEventListener('input', () => {
        certPage = 1;
        renderCertAttendees();
    });
}
const certPrevBtn = document.getElementById('certPrevBtn');
if (certPrevBtn) certPrevBtn.addEventListener('click', () => window.changeCertPage(-1));
const certNextBtn = document.getElementById('certNextBtn');
if (certNextBtn) certNextBtn.addEventListener('click', () => window.changeCertPage(1));

document.addEventListener('keydown', (e) => {
    const searchEl = document.getElementById('certSearch');
    if (searchEl && document.activeElement === searchEl) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); window.changeCertPage(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); window.changeCertPage(1); }
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        stopSessionEnforcement();
        window.location.href = '../logIn/LogInAdmin.html';
        return;
    }

    if (!(await requireAdmin())) {
        window.location.href = '../logIn/LogInAdmin.html';
        return;
    }

    // Load theme from Firestore if available
    const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
    const adminData = adminDoc.exists() ? adminDoc.data() : {};
    if (adminData.selectedTheme) {
        applyTheme(adminData.selectedTheme);
    }

    await registerSession(user);
    startSessionEnforcement(user);

    // Re-read event ID after auth state is confirmed
    currentEventId = localStorage.getItem('certEventId');

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

        if (eventDoc.data().adminId !== user.uid) {
            showAlert('Access denied: this event belongs to another admin.', { type: 'error' });
            window.location.href = '../EventCRUD/EventCRUD.html';
            return;
        }

        currentEvent = { id: eventDoc.id, ...eventDoc.data() };
        document.getElementById('eventInfo').textContent = `Event: ${currentEvent.title}`;

        // Load template - check IndexedDB cache first (avoids Firebase Storage CORS fetch)
        const cachedTemplate = await getTemplateFromIndexedDb(currentEventId);
        if (cachedTemplate) {
            templateBytes = cachedTemplate;
            document.getElementById('templateStatus').textContent = 'Template loaded from cache.';
            document.getElementById('templateStatus').classList.remove('hidden');
        } else {
            // No template available - user needs to upload one
            document.getElementById('templateStatus').textContent = 'No template cached. Please upload a template.';
            document.getElementById('templateStatus').classList.remove('hidden');
        }

        // Load attendees
        const attendeesSnap = await getDocs(collection(db, 'Events', currentEventId, 'Attendees'));
        allAttendees = [];
        attendeesSnap.forEach(docSnap => {
            allAttendees.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderCertAttendees();
    } catch (error) {
        console.error('Error loading event:', error);
        window.location.href = '../EventCRUD/EventCRUD.html';
    }
});