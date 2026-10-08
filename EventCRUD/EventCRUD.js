import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc, getDocs, writeBatch, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showConfirm, showToast, setButtonLoading, registerSession, startSessionEnforcement, stopSessionEnforcement } from '../PopupSystem.js';
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
  localStorage.setItem('selectedTheme', themeName);
}

function loadTheme() {
  const savedTheme = localStorage.getItem('selectedTheme');
  if (savedTheme && themes[savedTheme]) {
    applyTheme(savedTheme);
  }
}

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

let currentUser = null;
let currentAdminName = '';
let allEvents = [];
let filteredEvents = [];
let currentPage = 1;
const EVENTS_PER_PAGE = 2;

document.getElementById('menuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('menuDropdown');
    dropdown.classList.toggle('hidden');
});

document.addEventListener('click', () => {
    const dropdown = document.getElementById('menuDropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
    }
});

loadTheme();

const eventsSearch = document.getElementById('eventsSearch');
if (eventsSearch) {
  eventsSearch.addEventListener('input', () => {
    currentPage = 1;
    applyFilter();
  });
}
const prevPageBtn = document.getElementById('prevPageBtn');
if (prevPageBtn) prevPageBtn.addEventListener('click', () => window.changePage(-1));
const nextPageBtn = document.getElementById('nextPageBtn');
if (nextPageBtn) nextPageBtn.addEventListener('click', () => window.changePage(1));

document.addEventListener('keydown', (e) => {
  if (document.getElementById('eventsSearch') && document.activeElement === document.getElementById('eventsSearch')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); window.changePage(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); window.changePage(1); }
});

document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = document.querySelector('#eventForm button[type="submit"]');
  if (submitBtn.disabled) return;
  
  if (!currentUser) {
    showAlert('Please log in first', { type: 'warning' });
    return;
  }
  
  const eventTitle = document.getElementById('eventTitle').value;
  const eventDescription = document.getElementById('eventDescription').value;
  const eventDate = document.getElementById('eventDate').value;
  const eventTime = document.getElementById('eventTime').value;
  const eventLocation = document.getElementById('eventLocation').value;
  const eventDuration = document.getElementById('eventDuration').value;
  const department = document.getElementById('department').value;
  
  const editId = e.target.dataset.editId;
  
  try {
    if (editId) {
      setButtonLoading(submitBtn, true, 'Updating...');
      await updateDoc(doc(db, 'Events', editId), {
        title: eventTitle,
        description: eventDescription,
        date: eventDate,
        time: eventTime,
        location: eventLocation,
        duration: eventDuration ? parseInt(eventDuration) : null,
        department: department,
        speaker: document.getElementById('speaker').value || ''
      });
      showToast('Event updated successfully!');
      delete e.target.dataset.editId;
      document.getElementById('createEventPanel').classList.add('hidden');
      document.querySelector('#eventForm button[type="submit"]').textContent = 'Create Event';
      document.getElementById('cancelEditBtn').classList.add('hidden');
    } else {
      setButtonLoading(submitBtn, true, 'Creating...');
      const eventCode = await generateUniqueEventCode(allEvents);
      await addDoc(collection(db, 'Events'), {
        adminId: currentUser.uid,
        adminName: currentAdminName,
        title: eventTitle,
        description: eventDescription,
        date: eventDate,
        time: eventTime,
        location: eventLocation,
        duration: eventDuration ? parseInt(eventDuration) : null,
        department: department,
        speaker: document.getElementById('speaker').value || '',
        eventCode: eventCode,
        status: 'active',
        createdAt: new Date()
      });
      showToast('Event created successfully!');
      document.getElementById('eventForm').reset();
      document.getElementById('createEventPanel').classList.add('hidden');
    }
  } catch (error) {
    console.error('Error saving event:', error);
    showAlert(editId ? 'Failed to update event' : 'Failed to create event', { type: 'error' });
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

document.getElementById('showCreateFormBtn').addEventListener('click', () => {
  document.getElementById('createEventPanel').classList.remove('hidden');
  document.getElementById('createEventPanel').scrollIntoView({ behavior: 'smooth' });
});

function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 7; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

async function isEventCodeUnique(eventsList, candidateCode) {
  return !eventsList.some(e => e.eventCode === candidateCode);
}

async function generateUniqueEventCode(eventsList) {
  let code = generateShortId();
  let attempts = 0;
  const maxAttempts = 50;
  while (!(await isEventCodeUnique(eventsList, code)) && attempts < maxAttempts) {
    code = generateShortId();
    attempts++;
  }
  return code;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderEventCard(event) {
  const statusClass = event.status === 'active' ? 'bg-green-400/30 text-green-200' : 'bg-gray-400/30 text-gray-200';
  const statusLabel = (event.status || 'active').toUpperCase();

  return `
      <div class="liquid-panel p-6 border-l-4 border-green-400/50">
        <div>
          <h3 class="text-2xl font-bold text-green-100">${escapeHtml(event.title)}</h3>
          <p class="text-green-200/70 mt-2 leading-relaxed">${escapeHtml(event.description)}</p>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-5 text-sm">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-green-200/60">Date</dt>
              <dd class="mt-1 text-green-200">${escapeHtml(event.date || '')}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-green-200/60">Time</dt>
              <dd class="mt-1 text-green-200">${escapeHtml(event.time || '')}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-green-200/60">Venue</dt>
              <dd class="mt-1 text-green-200">${escapeHtml(event.location || '')}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-green-200/60">Duration</dt>
              <dd class="mt-1 text-green-200">${event.duration ? `${escapeHtml(event.duration)} hrs` : 'Not specified'}</dd>
            </div>
            ${event.department ? `
            <div class="sm:col-span-2">
              <dt class="text-xs font-semibold uppercase tracking-wide text-green-200/60">Department</dt>
              <dd class="mt-1 text-green-200">${escapeHtml(event.department)}</dd>
            </div>
            ` : ''}
            ${event.speaker ? `
            <div class="sm:col-span-2">
              <dt class="text-xs font-semibold uppercase tracking-wide text-green-200/60">Speaker</dt>
              <dd class="mt-1 text-green-200">${escapeHtml(event.speaker)}</dd>
            </div>
            ` : ''}
          </dl>

          <span class="inline-block mt-5 px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
            Status: ${statusLabel}
          </span>
          <span class="inline-block mt-5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-400/30 text-blue-200 ml-2">
            Attendees: ${event.attendeeCount || 0}
          </span>
          ${event.eventCode ? `
          <span class="inline-block mt-5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/30 text-amber-200 ml-2" title="Event Code">
            Code: ${escapeHtml(event.eventCode)}
          </span>
          ` : ''}
          ${event.adminName ? `
          <span class="inline-block mt-5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-400/30 text-purple-200 ml-2" title="Created by">
            By ${escapeHtml(event.adminName)}
          </span>
          ` : ''}
        </div>

        <div class="mt-6 pt-5 border-t border-green-400/20">
          <div class="flex flex-wrap gap-3">
            <button onclick="window.editEvent('${event.id}')" 
              class="btn-glass px-4 py-2 text-sm font-semibold flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              Edit
            </button>
            <button onclick="window.manageAttendees('${event.id}')" 
              class="btn-3d text-white px-4 py-2 text-sm font-semibold flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Manage Attendees
            </button>
            <button onclick="window.certificateManagement('${event.id}')"
              class="btn-glass px-4 py-2 text-sm font-semibold flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
              </svg>
              Certificate Management
            </button>
            <button onclick="window.closeEvent('${event.id}')" 
              class="btn-glass px-4 py-2 text-sm font-semibold flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Close Event
            </button>
            <button onclick="window.deleteEvent('${event.id}')" 
              class="btn-glass px-4 py-2 text-sm font-semibold flex items-center gap-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
}

function applyFilter() {
  const q = (document.getElementById('eventsSearch')?.value || '').toLowerCase().trim();
  if (!q) {
    filteredEvents = allEvents.slice();
  } else {
    filteredEvents = allEvents.filter(e =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.location || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q) ||
      (e.speaker || '').toLowerCase().includes(q) ||
      (e.adminName || '').toLowerCase().includes(q)
    );
  }
  // Newest first (oldest last)
  filteredEvents.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  if (currentPage > totalPages()) currentPage = 1;
  renderPage();
}

function totalPages() {
  return Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
}

function renderPage() {
  const eventsStack = document.getElementById('eventsStack');
  const eventCount = document.getElementById('eventCount');
  const noEvents = document.getElementById('noEvents');
  const paginationControls = document.getElementById('paginationControls');
  const pageInfo = document.getElementById('pageInfo');

  eventCount.textContent = allEvents.length;

  if (filteredEvents.length === 0) {
    noEvents?.classList.remove('hidden');
    noEvents.textContent = allEvents.length === 0
      ? 'No events created yet.'
      : 'No events match your search.';
    eventsStack.innerHTML = '';
    paginationControls?.classList.add('hidden');
    return;
  }

  noEvents?.classList.add('hidden');
  const start = (currentPage - 1) * EVENTS_PER_PAGE;
  const pageEvents = filteredEvents.slice(start, start + EVENTS_PER_PAGE);
  eventsStack.innerHTML = pageEvents.map(renderEventCard).join('');

  const total = totalPages();
  paginationControls?.classList.remove('hidden');
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${total}  •  ${filteredEvents.length} event${filteredEvents.length === 1 ? '' : 's'}`;

  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
    prevBtn.classList.toggle('opacity-40', currentPage === 1);
    prevBtn.classList.toggle('cursor-not-allowed', currentPage === 1);
    prevBtn.classList.toggle('pointer-events-none', currentPage === 1);
  }
  if (nextBtn) {
    nextBtn.disabled = currentPage === total;
    nextBtn.classList.toggle('opacity-40', currentPage === total);
    nextBtn.classList.toggle('cursor-not-allowed', currentPage === total);
    nextBtn.classList.toggle('pointer-events-none', currentPage === total);
  }
}

window.handleEventUpdate = (events) => {
  allEvents = events;
  applyFilter();
};

window.changePage = (dir) => {
  const total = totalPages();
  let next = currentPage + dir;
  if (next < 1) next = 1;
  if (next > total) next = total;
  currentPage = next;
  renderPage();
  document.getElementById('eventsStack').scrollIntoView({ behavior: 'smooth' });
};

window.exportSingleEvent = async (eventId, eventTitle) => {
  try {
    const eventDoc = await getDoc(doc(db, 'Events', eventId));
    const attendeesSnapshot = await getDocs(collection(db, 'Events', eventId, 'Attendees'));
    const attendees = attendeesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const headers = ['Attendee Name', 'Course', 'Role', 'Date Attended', 'Status', 'Event Name', 'Certificate ID'];
    const rows = attendees.map(attendee => [
      attendee.fullName || '',
      attendee.course || '',
      attendee.role || '',
      attendee.dateAttended || '',
      attendee.status || '',
      eventTitle || '',
      attendee.certificateId || ''
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventTitle.replace(/\s+/g, '_')}_attendees.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting event:', error);
    showAlert('Failed to export event', { type: 'error' });
  }
};

window.generateCertificates = async (eventId) => {
  showAlert('Certificate generation by email requires Cloud Functions, which is not available on this free plan. Use the Certificate Management page to download certificates individually instead.', { type: 'warning' });
};

window.addCertificateFormat = async (eventId) => {
  showAlert('Uploading certificate templates to the cloud requires Firebase Storage (paid plan). Use the Certificate Management page instead, which stores templates in your browser.', { type: 'warning' });
};

window.closeCertFormatModal = () => {
  const modal = document.getElementById('certFormatModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};
window.deleteEvent = async (eventId) => {
  const confirmed = await showConfirm('Are you sure you want to delete this event?');
  if (confirmed !== 1) return;

  try {
    const eventDoc = await getDoc(doc(db, 'Events', eventId));
    if (!eventDoc.exists()) {
      showAlert('Event not found', { type: 'error' });
      return;
    }
    if (eventDoc.data().adminId !== currentUser.uid) {
      showAlert('Access denied.', { type: 'error' });
      return;
    }
    const attendeesQuery = query(collection(db, 'Events', eventId, 'Attendees'));
    const snapshot = await getDocs(attendeesQuery);
    
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    
    await deleteDoc(doc(db, 'Events', eventId));
    showToast('Event and all associated attendees deleted');
  } catch (error) {
    console.error('Error deleting event:', error);
    showAlert('Failed to delete event', { type: 'error' });
  }
};

window.closeEvent = async (eventId) => {
  const confirmed = await showConfirm('Are you sure you want to close this event? This will mark it as completed.');
  if (confirmed !== 1) return;

  try {
    const eventDoc = await getDoc(doc(db, 'Events', eventId));
    if (!eventDoc.exists()) {
      showAlert('Event not found', { type: 'error' });
      return;
    }
    if (eventDoc.data().adminId !== currentUser.uid) {
      showAlert('Access denied.', { type: 'error' });
      return;
    }
    await updateDoc(doc(db, 'Events', eventId), {
      status: 'completed',
      closedAt: new Date()
    });
    showToast('Event closed successfully');
  } catch (error) {
    console.error('Error closing event:', error);
    showAlert('Failed to close event', { type: 'error' });
  }
};

window.manageAttendees = (eventId) => {
  localStorage.setItem('currentEventId', eventId);
  window.location.href = '../AttendeeManagement/AttendeeManagement.html';
};

window.editEvent = async (eventId) => {
  const eventDoc = await getDoc(doc(db, 'Events', eventId));
  if (!eventDoc.exists()) {
    showAlert('Event not found', { type: 'error' });
    return;
  }
  if (eventDoc.data().adminId !== currentUser.uid) {
    showAlert('Access denied.', { type: 'error' });
    return;
  }
  const event = eventDoc.data();
  
  const panel = document.getElementById('createEventPanel');
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth' });
  
  document.getElementById('eventTitle').value = event.title || '';
  document.getElementById('eventDescription').value = event.description || '';
  document.getElementById('eventDate').value = event.date || '';
  document.getElementById('eventTime').value = event.time || '';
  document.getElementById('eventLocation').value = event.location || '';
  document.getElementById('eventDuration').value = event.duration || '';
  document.getElementById('department').value = event.department || '';
  document.getElementById('speaker').value = event.speaker || '';
  
  const form = document.getElementById('eventForm');
  form.dataset.editId = eventId;
  
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Update Event';
  
  document.getElementById('cancelEditBtn').classList.remove('hidden');
};

window.certificateManagement = (eventId) => {
  localStorage.setItem('certEventId', eventId);
  window.location.href = '../CertificateManagement/CertificateManagement.html';
};

window.cancelEdit = () => {
  const form = document.getElementById('eventForm');
  delete form.dataset.editId;
  form.reset();
  document.getElementById('createEventPanel').classList.add('hidden');
  form.querySelector('button[type="submit"]').textContent = 'Create Event';
  document.getElementById('cancelEditBtn').classList.add('hidden');
};

async function backfillAdminNames(adminUid, adminName) {
  try {
    const snap = await getDocs(query(collection(db, 'Events'), where('adminId', '==', adminUid)));
    const batch = writeBatch(db);
    let changed = 0;
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.adminName) {
        batch.update(docSnap.ref, { adminName: adminName });
        changed++;
      }
    });
    if (changed > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Error backfilling admin names:', error);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (!(await requireAdmin())) {
      window.location.href = '../logIn/LogInAdmin.html';
      return;
    }

    currentUser = user;
    await registerSession(user);
    startSessionEnforcement(user);
    
    const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
    const adminData = adminDoc.exists() ? adminDoc.data() : {};
    const adminName = adminData.adminName || user.email;
    currentAdminName = adminName;
    const departmentName = adminData.departmentName || adminData.department || 'Information Unit';
    document.getElementById('departmentName').textContent = departmentName;
    document.title = `${departmentName}: Event CRUD`;
    document.getElementById('adminName').textContent = `Admin: ${adminName}`;
    
    if (adminData.selectedTheme) {
      applyTheme(adminData.selectedTheme);
    }
    
    backfillAdminNames(user.uid, currentAdminName);

    const q = query(collection(db, 'Events'), where('adminId', '==', user.uid));
    onSnapshot(q, async (snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });

      const eventsWithCounts = await Promise.all(events.map(async (event) => {
        try {
          const attendeesSnapshot = await getDocs(collection(db, 'Events', event.id, 'Attendees'));
          return { ...event, attendeeCount: attendeesSnapshot.size };
        } catch (error) {
          console.error('Error fetching attendee count for event', event.id, error);
          return { ...event, attendeeCount: 0 };
        }
      }));

      window.handleEventUpdate(eventsWithCounts);
    });
  } else {
    stopSessionEnforcement();
    window.location.href = '../logIn/LogInAdmin.html';
  }
});