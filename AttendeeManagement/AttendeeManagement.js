import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, getDoc, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const OCR_API_URL = 'https://us-central1-ipprc-certificate-verification.cloudfunctions.net/mistralOCR';


function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
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

function parseOcrText(rawText) {
  const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const parsed = [];

  // Get bulk defaults from UI
  const defaultCourse = document.getElementById('bulkCourse')?.value?.trim() || '';
  const defaultRole = document.getElementById('bulkRole')?.value?.trim() || 'Student';

  for (const line of lines) {
    let fullName = null;
    let course = defaultCourse;
    let role = defaultRole;

    if (line.includes(',') || line.includes('\t')) {
      const parts = line.split(/[,\t]/).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 1) fullName = parts[0];
      if (parts.length >= 2 && !defaultCourse) course = parts[1];
      if (parts.length >= 3 && !defaultRole) role = parts[2];
    } else {
      const kvPattern = /(Full Name|Name)\s*:\s*(.+)/i;
      const coursePattern = /(Course)\s*:\s*(.+)/i;
      const rolePattern = /(Role)\s*:\s*(.+)/i;

      const kvMatch = line.match(kvPattern);
      const courseMatch = line.match(coursePattern);
      const roleMatch = line.match(rolePattern);

      if (kvMatch) fullName = kvMatch[2].trim();
      if (courseMatch && !defaultCourse) course = courseMatch[2].trim();
      if (roleMatch && !defaultRole) role = roleMatch[2].trim();
    }

    if (!fullName) continue;

    parsed.push({
      fullName,
      course,
      role,
      dateAttended: getTodayDateString(),
      status: 'present'
    });
  }

  return parsed;
}

function renderOcrParsedList(parsedAttendees) {
  const listEl = document.getElementById('ocrParsedList');
  listEl.innerHTML = parsedAttendees.map((a, idx) => `
    <div class="flex items-center justify-between px-4 py-3 rounded-lg bg-white/10 border border-green-400/20">
      <div class="flex-1 grid grid-cols-2 gap-2 text-sm text-green-100">
        <span><strong class="text-green-200/80">Name:</strong> ${escapeHtml(a.fullName)}</span>
        <span><strong class="text-green-200/80">Course:</strong> ${escapeHtml(a.course || '-')}</span>
        <span><strong class="text-green-200/80">Role:</strong> ${escapeHtml(a.role || '-')}</span>
      </div>
    </div>
  `).join('');
}

async function saveOcrAttendees(parsedAttendees) {
  if (!currentEventId || !currentEvent) {
    showAlert('Event not found', { type: 'warning' });
    return;
  }

  if (parsedAttendees.length === 0) {
    showAlert('No attendees to save', { type: 'warning' });
    return;
  }

  try {
    const batch = writeBatch(db);

    for (const attendee of parsedAttendees) {
      const certificateId = await generateUniqueCertificateId(allAttendees);
      const ref = doc(collection(db, 'Events', currentEventId, 'Attendees'));
      batch.set(ref, {
        fullName: attendee.fullName,
        course: attendee.course,
        role: attendee.role,
        dateAttended: attendee.dateAttended,
        status: attendee.status,
        certificateId,
        createdAt: serverTimestamp()
      });
      allAttendees.push({
        id: ref.id,
        ...attendee,
        certificateId
      });
    }

    await batch.commit();
    showToast(`Successfully saved ${parsedAttendees.length} attendee(s)`);
    document.getElementById('ocrParsedSection').classList.add('hidden');
    document.getElementById('ocrSection').classList.add('hidden');
    document.getElementById('ocrRawText').classList.add('hidden');
    document.getElementById('ocrPreview').classList.add('hidden');
    document.getElementById('ocrFileInput').value = '';
    renderAttendees(allAttendees, document.getElementById('attendeesSearch')?.value || '');
  } catch (error) {
    console.error('Error saving OCR attendees:', error);
    showAlert('Failed to save attendees', { type: 'error' });
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

let currentEventId = localStorage.getItem('currentEventId');
let currentEvent = null;
let allAttendees = [];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
  const dateAttended = document.getElementById('dateAttended').value;

  try {
    const certificateId = await generateUniqueCertificateId(allAttendees);
    const docRef = await addDoc(collection(db, 'Events', currentEventId, 'Attendees'), {
      fullName: attendeeName,
      course: course,
      role: role,
      dateAttended: dateAttended,
      status: 'present',
      certificateId: certificateId,
      createdAt: serverTimestamp()
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
    showToast('Failed to add attendee.', 'error');
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
    showToast('Failed to update status', 'error');
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
    showToast('Failed to update status', 'error');
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
    showAlert('Failed to update status', { type: 'error' });
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
  const dateAttended = document.getElementById('editDateAttended').value;
  const status = document.getElementById('editStatus').value;

  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      fullName,
      course,
      role,
      dateAttended,
      status
    });
    console.log('Attendee updated');
    window.closeEditModal();
    showToast('Attendee updated');
  } catch (error) {
    console.error('Error updating attendee:', error);
    showAlert('Failed to update attendee', { type: 'error' });
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
    showAlert('Failed to delete attendee', { type: 'error' });
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
    showAlert('Failed to export to Excel', { type: 'error' });
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

const uploadAttendanceBtn = document.getElementById('uploadAttendanceBtn');
const ocrSection = document.getElementById('ocrSection');
const ocrFileInput = document.getElementById('ocrFileInput');
const ocrPreview = document.getElementById('ocrPreview');
const ocrImage = document.getElementById('ocrImage');
const runOcrBtn = document.getElementById('runOcrBtn');
const ocrStatus = document.getElementById('ocrStatus');
const ocrRawText = document.getElementById('ocrRawText');
const ocrParsedSection = document.getElementById('ocrParsedSection');
const ocrParsedList = document.getElementById('ocrParsedList');
const saveOcrAttendeesBtn = document.getElementById('saveOcrAttendeesBtn');
const cancelOcrBtn = document.getElementById('cancelOcrBtn');

let currentOcrParsedAttendees = [];

if (uploadAttendanceBtn) {
  uploadAttendanceBtn.addEventListener('click', () => {
    if (!ocrSection) return;
    ocrSection.classList.toggle('hidden');
    if (!ocrSection.classList.contains('hidden')) {
      ocrSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

if (ocrFileInput) {
  ocrFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      ocrImage.src = event.target.result;
      ocrPreview.classList.remove('hidden');
      ocrRawText.classList.add('hidden');
      ocrParsedSection.classList.add('hidden');
      ocrStatus.classList.add('hidden');
    };
    reader.readAsDataURL(file);
  });
}

if (runOcrBtn) {
  runOcrBtn.addEventListener('click', async () => {
    if (!ocrImage.src || ocrImage.src === window.location.href) {
      showAlert('Please select an image first', { type: 'warning' });
      return;
    }

    ocrStatus.classList.remove('hidden');
    ocrStatus.textContent = 'Uploading and processing...';
    runOcrBtn.disabled = true;

    try {
      const base64 = ocrImage.src.split(',')[1];

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'OCR request failed');
      }

      const rawText = (data.fullText || '').trim();
      ocrTextarea.value = rawText;
      ocrRawText.classList.remove('hidden');
      ocrStatus.textContent = 'OCR complete';

      currentOcrParsedAttendees = parseOcrText(rawText);
      if (currentOcrParsedAttendees.length > 0) {
        renderOcrParsedList(currentOcrParsedAttendees);
        ocrParsedSection.classList.remove('hidden');
      } else {
        showAlert('No valid attendee entries detected.', { type: 'warning', title: 'Parsing Issue' });
        ocrParsedSection.classList.add('hidden');
      }
    } catch (error) {
      console.error('OCR error:', error);
      showAlert('Failed to process image.', { type: 'error' });
      ocrStatus.textContent = 'OCR failed';
    } finally {
      runOcrBtn.disabled = false;
    }
  });
}

if (saveOcrAttendeesBtn) {
  saveOcrAttendeesBtn.addEventListener('click', () => {
    saveOcrAttendees(currentOcrParsedAttendees);
  });
}

if (cancelOcrBtn) {
  cancelOcrBtn.addEventListener('click', () => {
    ocrSection.classList.add('hidden');
    ocrPreview.classList.add('hidden');
    ocrRawText.classList.add('hidden');
    ocrParsedSection.classList.add('hidden');
    ocrStatus.classList.add('hidden');
    ocrFileInput.value = '';
    currentOcrParsedAttendees = [];
  });
}