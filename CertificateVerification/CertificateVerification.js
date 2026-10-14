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
            eventId: eventDoc.id,
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

    // Participants panel elements
    const seeParticipantsBtn = document.getElementById('seeParticipantsBtn');
    const participantsPanel = document.getElementById('participantsPanel');
    const participantSearch = document.getElementById('participantSearch');
    const participantSearchClear = document.getElementById('participantSearchClear');
    const participantDropdown = document.getElementById('participantDropdown');
    const participantsList = document.getElementById('participantsList');
    const participantsCount = document.getElementById('participantsCount');

    let currentVerifiedEventId = null;
    let allParticipants = [];
    let participantsLoaded = false;

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    function participantName(p) {
        return (p.fullName || '').trim() || 'Unnamed participant';
    }

    function resetParticipantsPanel() {
        allParticipants = [];
        participantsLoaded = false;
        participantsPanel.classList.add('hidden');
        participantSearch.value = '';
        participantSearchClear.classList.add('hidden');
        participantDropdown.classList.add('hidden');
        participantDropdown.innerHTML = '';
        participantsList.innerHTML = '';
        participantsCount.textContent = '';
        seeParticipantsBtn.textContent = 'See All Participants';
    }

    async function loadParticipants() {
        setButtonLoading(seeParticipantsBtn, true, 'Loading...');
        try {
            const snapshot = await getDocs(collection(db, 'Events', currentVerifiedEventId, 'Attendees'));
            allParticipants = snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .sort((a, b) => participantName(a).localeCompare(participantName(b), undefined, { sensitivity: 'base' }));
            allParticipants.forEach((p, i) => { p.position = i + 1; });
            participantsLoaded = true;
            return true;
        } catch (error) {
            console.error('Error loading participants:', error);
            showAlert('Failed to load participants. Please try again.', { type: 'error' });
            return false;
        } finally {
            setButtonLoading(seeParticipantsBtn, false);
        }
    }

    function filterParticipants(filter) {
        const q = (filter || '').trim().toLowerCase();
        return q
            ? allParticipants.filter((p) => participantName(p).toLowerCase().includes(q))
            : allParticipants;
    }

    function renderParticipants(filter) {
        const visible = filterParticipants(filter);
        participantsCount.textContent = visible.length === allParticipants.length
            ? `${allParticipants.length} participant${allParticipants.length === 1 ? '' : 's'} (A–Z)`
            : `${visible.length} of ${allParticipants.length} participants`;

        if (!visible.length) {
            participantsList.innerHTML = `<p class="text-center text-green-200/60 py-6">${allParticipants.length ? 'No participants match your search.' : 'No participants recorded for this event yet.'}</p>`;
            return;
        }

        participantsList.innerHTML = visible.map((p) => `
            <div class="result-item participant-row flex items-start justify-between gap-3" data-id="${escapeHtml(p.id)}">
                <div class="min-w-0">
                    <p class="font-semibold text-green-100 truncate">${escapeHtml(participantName(p))}</p>
                    <p class="text-green-200/70 text-sm truncate">${escapeHtml([p.course, p.role].filter(Boolean).join(' • ')) || '—'}</p>
                </div>
                <div class="text-right shrink-0">
                    <span class="text-xs font-mono text-green-300/80 block">${escapeHtml(p.certificateId || '')}</span>
                    <span class="text-xs text-green-200/40">#${p.position}</span>
                </div>
            </div>`).join('');
    }

    function renderDropdown(filter) {
        const visible = filterParticipants(filter);
        if (!visible.length) {
            participantDropdown.innerHTML = '<p class="px-3 py-2 text-green-200/60 text-sm">No participants found</p>';
            return;
        }
        participantDropdown.innerHTML = visible.map((p) => `
            <button type="button" class="participant-option w-full text-left px-3 py-2 text-green-100 hover:bg-green-400/20 rounded-md transition-colors text-sm truncate" data-id="${escapeHtml(p.id)}">
                ${escapeHtml(participantName(p))}
            </button>`).join('');
    }

    function selectParticipant(id) {
        const participant = allParticipants.find((p) => p.id === id);
        if (!participant) return;
        participantSearch.value = participantName(participant);
        participantSearchClear.classList.remove('hidden');
        participantDropdown.classList.add('hidden');
        renderParticipants(participantSearch.value);
        const row = participantsList.querySelector(`[data-id="${CSS.escape(id)}"]`);
        if (row) {
            row.classList.add('ring-2', 'ring-green-300');
            row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

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

                currentVerifiedEventId = event.eventId || null;
                resetParticipantsPanel();

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
            currentVerifiedEventId = null;
            resetParticipantsPanel();
            document.getElementById('result').classList.add('hidden');
            document.getElementById('verifyForm').classList.remove('hidden');
            document.getElementById('eventCode').value = '';
        });
    }

    if (seeParticipantsBtn) {
        seeParticipantsBtn.addEventListener('click', async () => {
            if (!currentVerifiedEventId) {
                showAlert('Verify an event first to see its participants.', { type: 'warning' });
                return;
            }
            if (!participantsPanel.classList.contains('hidden')) {
                participantsPanel.classList.add('hidden');
                participantDropdown.classList.add('hidden');
                seeParticipantsBtn.textContent = 'See All Participants';
                return;
            }
            if (!participantsLoaded) {
                const loaded = await loadParticipants();
                if (!loaded) return;
            }
            renderParticipants(participantSearch.value);
            renderDropdown(participantSearch.value);
            participantsPanel.classList.remove('hidden');
            participantDropdown.classList.remove('hidden');
            seeParticipantsBtn.textContent = 'Hide Participants';
        });
    }

    if (participantSearch) {
        participantSearch.addEventListener('input', () => {
            const value = participantSearch.value;
            participantSearchClear.classList.toggle('hidden', !value);
            renderParticipants(value);
            renderDropdown(value);
            participantDropdown.classList.remove('hidden');
        });

        participantSearch.addEventListener('focus', () => {
            if (participantsLoaded) participantDropdown.classList.remove('hidden');
        });

        participantSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                participantDropdown.classList.add('hidden');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const matches = filterParticipants(participantSearch.value);
                if (matches.length === 1) selectParticipant(matches[0].id);
            }
        });
    }

    if (participantSearchClear) {
        participantSearchClear.addEventListener('click', () => {
            participantSearch.value = '';
            participantSearchClear.classList.add('hidden');
            renderParticipants('');
            renderDropdown('');
            participantSearch.focus();
        });
    }

    if (participantDropdown) {
        participantDropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.participant-option');
            if (option) selectParticipant(option.dataset.id);
        });
    }

    document.addEventListener('click', (e) => {
        if (!participantDropdown || participantDropdown.classList.contains('hidden')) return;
        if (!participantDropdown.contains(e.target) && e.target !== participantSearch && !participantSearchClear.contains(e.target)) {
            participantDropdown.classList.add('hidden');
        }
    });
});