import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, getDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 7; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}


async function isIdUnique(attendeesList, candidateId) {
  return !attendeesList.some(a => a.certificateId === candidateId);
}


async function generateUniqueCertificateId(attendeesList) {
  let id = generateShortId();
  let attempts = 0;
  const maxAttempts = 50;
  while (!(await isIdUnique(attendeesList, id)) && attempts < maxAttempts) {
    id = generateShortId();
    attempts++;
  }
  return id;
}

function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

loadTheme();

document.getElementById('addAttendeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentEvent) {
    showToast('Event not found', 'error');
    return;
  }

  if (currentEvent.status === 'closed') {
    showToast('This event is closed. Attendees can no longer be added.', 'error');
    return;
  }

  const attendeeName = document.getElementById('attendeeName').value;
  const course = document.getElementById('course').value;
  const role = document.getElementById('role').value;
  const dateAttended = getTodayDateString();

  try {
    const certificateId = await generateUniqueCertificateId(allAttendees);
    const docRef = await addDoc(collection(db, 'Events', currentEventId, 'Attendees'), {
      fullName: attendeeName,
      course: course,
      role: role,
      dateAttended: dateAttended,
      status: 'present',
      certificateId: certificateId
    });

    const newAttendee = {
      id: docRef.id,
      fullName: attendeeName,
      course: course,
      role: role,
      dateAttended: dateAttended,
      status: 'present',
      certificateId: certificateId
    };
    allAttendees.push(newAttendee);
    renderAttendees(allAttendees, document.getElementById('attendeesSearch')?.value || '');

    console.log('Attendee added successfully');
    document.getElementById('addAttendeeForm').reset();
    showToast('Attendee added successfully!');
  } catch (error) {
    console.error('Error adding attendee:', error);
    showToast('Failed to add attendee. Please try again.', 'error');
  }
});

function renderAttendees(attendeesList, searchTerm = '') {
  const filtered = filterAttendees(attendeesList, searchTerm);

  console.log('Rendering attendees, count:', filtered.length);
  document.getElementById('attendeeCount').textContent = attendeesList.length;

  renderTable(filtered);
}

function filterAttendees(attendeesList, searchTerm) {
  if (!searchTerm) return attendeesList;
  const term = searchTerm.toLowerCase();
  return attendeesList.filter(a =>
    (a.fullName || '').toLowerCase().includes(term) ||
    (a.course || '').toLowerCase().includes(term) ||
    (a.role || '').toLowerCase().includes(term) ||
    (a.dateAttended || '').toLowerCase().includes(term) ||
    (a.status || '').toLowerCase().includes(term) ||
    (a.certificateId || '').toLowerCase().includes(term)
  );
}

function renderTable(attendeesList) {
  const tableBody = document.getElementById('attendeesTableBody');
  const noAttendees = document.getElementById('noAttendees');

  if (attendeesList.length === 0) {
    noAttendees.style.display = 'block';
    tableBody.innerHTML = '';
    return;
  }

  noAttendees.style.display = 'none';

  tableBody.innerHTML = attendeesList.map(attendee => `
    <tr class="border-b border-green-400/20 hover:bg-white/10 transition-colors">
      <td class="py-4 px-2">
        <span class="font-medium text-green-100">${escapeHtml(attendee.fullName)}</span>
      </td>
      <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.course)}</td>
      <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.role)}</td>
      <td class="py-4 px-2 text-green-200/80">${attendee.dateAttended}</td>
      <td class="py-4 px-2">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${attendee.status === 'present' ? 'bg-green-400/30 text-green-200' : attendee.status === 'late' ? 'bg-orange-400/30 text-orange-200' : 'bg-red-400/30 text-red-200'}">
          ${attendee.status.toUpperCase()}
        </span>
      </td>
      <td class="py-4 px-2">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-400/30 text-blue-200">
          ${escapeHtml(attendee.certificateId || '')}
        </span>
      </td>
      <td class="py-4 px-2">
        <div class="flex gap-1 flex-wrap">
          <button onclick="window.markPresent('${attendee.id}')"
            class="action-item px-2 py-1 text-xs flex items-center gap-1">
            <span class="w-2 h-2 bg-green-400 rounded-full"></span>
            Present
          </button>
          <button onclick="window.markAbsent('${attendee.id}')"
            class="action-item px-2 py-1 text-xs flex items-center gap-1">
            <span class="w-2 h-2 bg-red-400 rounded-full"></span>
            Absent
          </button>
          <button onclick="window.markLate('${attendee.id}')"
            class="action-item px-2 py-1 text-xs flex items-center gap-1">
            <span class="w-2 h-2 bg-yellow-400 rounded-full"></span>
            Late
          </button>
          <button onclick="window.editAttendee('${attendee.id}')"
            class="action-item px-2 py-1 text-xs flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit
          </button>
          <button onclick="window.deleteAttendee('${attendee.id}')"
            class="action-item px-2 py-1 text-xs flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.markPresent = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'present'
    });
    showToast('Attendee marked as present');
  } catch (error) {
    console.error('Error updating status:', error);
    showToast('Failed to update status. Please try again.', 'error');
  }
};

window.markAbsent = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'absent'
    });
    showToast('Attendee marked as absent');
  } catch (error) {
    console.error('Error updating status:', error);
    showToast('Failed to update status. Please try again.', 'error');
  }
};

window.markLate = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'late'
    });
    showToast('Attendee marked as late');
  } catch (error) {
    console.error('Error updating status:', error);
    showAlert('Failed to update status. Please try again.', { type: 'error' });
  }
};

window.editAttendee = async (attendeeId) => {
  const attendee = allAttendees.find(a => a.id === attendeeId);
  if (!attendee) return;

  document.getElementById('editAttendeeId').value = attendee.id;
  document.getElementById('editName').value = attendee.fullName || '';
  document.getElementById('editCourse').value = attendee.course || '';
  document.getElementById('editRole').value = attendee.role || '';
  document.getElementById('editDateAttended').value = attendee.dateAttended || '';
  document.getElementById('editStatus').value = attendee.status || 'present';

  const modal = document.getElementById('editModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
};

window.closeEditModal = () => {
  const modal = document.getElementById('editModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};

document.getElementById('editAttendeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const attendeeId = document.getElementById('editAttendeeId').value;
  const fullName = document.getElementById('editName').value;
  const course = document.getElementById('editCourse').value;
  const role = document.getElementById('editRole').value;
  const status = document.getElementById('editStatus').value;

  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      fullName,
      course,
      role,
      status
    });
    console.log('Attendee updated');
    window.closeEditModal();
    showToast('Attendee updated');
  } catch (error) {
    console.error('Error updating attendee:', error);
    showAlert('Failed to update attendee. Please try again.', { type: 'error' });
  }
});

window.deleteAttendee = async (attendeeId) => {
  const confirmed = await showConfirm('Are you sure you want to delete this attendee?');
  if (confirmed !== 1) return;

  try {
    await deleteDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId));
    showToast('Attendee deleted');
    allAttendees = allAttendees.filter(a => a.id !== attendeeId);
    renderAttendees(allAttendees, document.getElementById('attendeesSearch')?.value || '');
  } catch (error) {
    console.error('Error deleting attendee:', error);
    showAlert('Failed to delete attendee. Please try again.', { type: 'error' });
  }
};

window.exportAttendeesToExcel = async () => {
  if (!currentEvent || allAttendees.length === 0) {
    showAlert('No attendees to export', { type: 'warning' });
    return;
  }

  const headers = [
    'Attendee Name',
    'Course',
    'Role',
    'Date Attended',
    'Status',
    'Certificate ID'
  ];

  const headerFillColor = 'FF92D050';
  const headerFontColor = 'FFFFFFFF';
  const headerFontBold = true;

  try {
    const workbook = ExcelJS.Workbook ? new ExcelJS.Workbook() : new ExcelJS.xlsx.Workbook();
    workbook.creator = 'Information Unit';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Attendees');
    worksheet.columns = [
      { header: 'Attendee Name', key: 'fullName', width: 28 },
      { header: 'Course', key: 'course', width: 20 },
      { header: 'Role', key: 'role', width: 18 },
      { header: 'Date Attended', key: 'dateAttended', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Certificate ID', key: 'certificateId', width: 18 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.values = headers;
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.font = { bold: headerFontBold, color: { argb: headerFontColor } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerFillColor }
    };
    headerRow.height = 22;

    allAttendees.forEach((attendee, index) => {
      const row = worksheet.getRow(index + 2);
      row.height = 18;
      row.values = [
        attendee.fullName || '',
        attendee.course || '',
        attendee.role || '',
        attendee.dateAttended || '',
        attendee.status || '',
        attendee.certificateId || ''
      ];
    });

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(currentEvent.title || 'event').replace(/\s+/g, '_')}_attendance.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    showAlert('Failed to export to Excel. Please try again.', { type: 'error' });
  }
};

document.getElementById('exportAttendeesBtn').addEventListener('click', window.exportAttendeesToExcel);

document.getElementById('attendeesSearch').addEventListener('input', (e) => {
  renderAttendees(allAttendees, e.target.value);
});

onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed:', user ? 'logged in' : 'logged out');

  if (!user) {
    window.location.href = '../logIn/LogInAdmin.html';
    return;
  }

  if (!currentEventId) {
    console.log('No event ID found, redirecting...');
    window.location.href = '../EventCRUD/EventCRUD.html';
    return;
  }

  try {
    const eventDoc = await getDoc(doc(db, 'Events', currentEventId));
    if (!eventDoc.exists()) {
      showToast('Event not found', 'error');
      window.location.href = '../EventCRUD/EventCRUD.html';
      return;
    }

    currentEvent = { id: eventDoc.id, ...eventDoc.data() };
    document.getElementById('eventInfo').textContent = `Event: ${currentEvent.title}`;

    console.log('Setting up listener for eventId:', currentEventId);
    const q = query(collection(db, 'Events', currentEventId, 'Attendees'));
    onSnapshot(q, (snapshot) => {
      console.log('Snapshot received, docs:', snapshot.size);
      allAttendees = [];
      snapshot.forEach((docSnap) => {
        allAttendees.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderAttendees(allAttendees, document.getElementById('attendeesSearch')?.value || '');
    });

  } catch (error) {
    console.error('Error loading event:', error);
    window.location.href = '../EventCRUD/EventCRUD.html';
  }
});

let currentEventId = localStorage.getItem('currentEventId');
let currentEvent = null;
let allAttendees = [];
