import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, getDoc, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showConfirm, showToast } from '../PopupSystem.js';

// Generate a unique 6-character uppercase alphanumeric certificate ID
function generateShortId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Check if a generated certificate ID already exists among attendees
async function isIdUnique(attendeesList, candidateId) {
  return !attendeesList.some(a => a.certificateId === candidateId);
}

// Keep generating IDs until a unique one is found
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

document.getElementById('addAttendeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentEvent) {
    showAlert('Event not found', { type: 'warning' });
    return;
  }
  
  const attendeeName = document.getElementById('attendeeName').value;
  const course = document.getElementById('course').value;
  const role = document.getElementById('role').value;
  const dateAttended = document.getElementById('dateAttended').value;
  const session = document.getElementById('session').value;
  
  try {
    const certificateId = await generateUniqueCertificateId(allAttendees);
    const docRef = await addDoc(collection(db, 'Events', currentEventId, 'Attendees'), {
      fullName: attendeeName,
      course: course,
      role: role,
      dateAttended: dateAttended,
      session: session,
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
      session: session,
      status: 'present',
      certificateId: certificateId
    };
    allAttendees.push(newAttendee);
    renderAttendees(allAttendees, document.getElementById('morningSearch')?.value || '', document.getElementById('afternoonSearch')?.value || '');
    
    console.log('Attendee added successfully');
    document.getElementById('addAttendeeForm').reset();
  } catch (error) {
    console.error('Error adding attendee:', error);
    showAlert('Failed to add attendee', { type: 'error' });
  }
});

function renderAttendees(attendeesList, morningSearchTerm = '', afternoonSearchTerm = '') {
  const morningList = attendeesList.filter(a => a.session === 'morning');
  const afternoonList = attendeesList.filter(a => a.session === 'afternoon');
  
  const filteredMorning = filterAttendees(morningList, morningSearchTerm);
  const filteredAfternoon = filterAttendees(afternoonList, afternoonSearchTerm);
  
  console.log('Rendering attendees, morning:', filteredMorning.length, 'afternoon:', filteredAfternoon.length);
  document.getElementById('attendeeCount').textContent = attendeesList.length;
  document.getElementById('morningCount').textContent = filteredMorning.length;
  document.getElementById('afternoonCount').textContent = filteredAfternoon.length;
  
  renderTable(filteredMorning, 'morningTableBody', 'noMorning');
  renderTable(filteredAfternoon, 'afternoonTableBody', 'noAfternoon');
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

function renderTable(attendeesList, tableBodyId, noDataId) {
  const tableBody = document.getElementById(tableBodyId);
  const noData = document.getElementById(noDataId);
  
  if (attendeesList.length === 0) {
    noData.style.display = 'block';
    tableBody.innerHTML = '';
    return;
  }
  
  noData.style.display = 'none';
  
  tableBody.innerHTML = attendeesList.map(attendee => `
    <tr class="border-b border-gray-100 hover:bg-green-50 transition-colors">
      <td class="py-4 px-4">
        <span class="font-medium text-gray-800">${escapeHtml(attendee.fullName)}</span>
      </td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.course)}</td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.role)}</td>
      <td class="py-4 px-4 text-gray-600">${attendee.dateAttended}</td>
      <td class="py-4 px-4">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${attendee.status === 'present' ? 'bg-green-100 text-green-800' : attendee.status === 'late' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}">
          ${attendee.status.toUpperCase()}
        </span>
      </td>
      <td class="py-4 px-4">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          ${escapeHtml(attendee.certificateId || '')}
        </span>
      </td>
      <td class="py-4 px-4">
        ${attendee.locked ? `
          <span class="text-gray-400 text-xs italic">Locked</span>
        ` : `
          <div class="flex gap-1 flex-wrap">
            <button onclick="window.markPresent('${attendee.id}')" 
              class="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs">
              Present
            </button>
            <button onclick="window.markAbsent('${attendee.id}')" 
              class="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs">
              Absent
            </button>
            <button onclick="window.markLate('${attendee.id}')" 
              class="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-xs">
              Late
            </button>
            <button onclick="window.editAttendee('${attendee.id}')" 
              class="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-xs">
              Edit
            </button>
            <button onclick="window.deleteAttendee('${attendee.id}')" 
              class="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-xs">
              Delete
            </button>
          </div>
        `}
      </td>
    </tr>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}



window.markPresent = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'present'
    });
    console.log('Marked as present');
  } catch (error) {
    console.error('Error updating status:', error);
    showAlert('Failed to update status', { type: 'error' });
  }
};

window.markAbsent = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'absent'
    });
    console.log('Marked as absent');
  } catch (error) {
    console.error('Error updating status:', error);
    showAlert('Failed to update status', { type: 'error' });
  }
};

window.markLate = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'late'
    });
    console.log('Marked as late');
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
  document.getElementById('editSession').value = attendee.session || 'morning';
  document.getElementById('editStatus').value = attendee.status || 'present';
  
  document.getElementById('editModal').classList.remove('hidden');
  document.getElementById('editModal').classList.add('flex');
};

window.closeEditModal = () => {
  document.getElementById('editModal').classList.add('hidden');
  document.getElementById('editModal').classList.remove('flex');
};

document.getElementById('editAttendeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const attendeeId = document.getElementById('editAttendeeId').value;
  const fullName = document.getElementById('editName').value;
  const course = document.getElementById('editCourse').value;
  const role = document.getElementById('editRole').value;
  const dateAttended = document.getElementById('editDateAttended').value;
  const session = document.getElementById('editSession').value;
  const status = document.getElementById('editStatus').value;
  
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      fullName,
      course,
      role,
      dateAttended,
      session,
      status
    });
    console.log('Attendee updated');
    window.closeEditModal();
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
    console.log('Attendee deleted');
  } catch (error) {
    console.error('Error deleting attendee:', error);
    showAlert('Failed to delete attendee', { type: 'error' });
  }
};

window.copyMorningToAfternoon = async () => {
  const morningAttendees = allAttendees.filter(a => a.session === 'morning' && !a.locked);
  
  if (morningAttendees.length === 0) {
    showAlert('No new morning attendees to save', { type: 'info' });
    return;
  }
  
  const confirmed = await showConfirm(`Save ${morningAttendees.length} new morning attendee(s) to afternoon?\nStatus will be reset to Present.`);
  if (confirmed !== 1) return;
  
  try {
    const batch = writeBatch(db);
    
    morningAttendees.forEach(attendee => {
      const ref = doc(collection(db, 'Events', currentEventId, 'Attendees'));
      batch.set(ref, {
        fullName: attendee.fullName,
        course: attendee.course,
        role: attendee.role,
        dateAttended: attendee.dateAttended,
        session: 'afternoon',
        status: 'present',
        certificateId: generateShortId(),
        createdAt: serverTimestamp()
      });
      batch.update(doc(db, 'Events', currentEventId, 'Attendees', attendee.id), {
        locked: true
      });
    });
    
    await batch.commit();
    showToast(`Successfully saved ${morningAttendees.length} attendee(s) to afternoon`, 'success');
    console.log('Morning attendees saved to afternoon');
  } catch (error) {
    console.error('Error saving attendees:', error);
    showAlert('Failed to save attendees', { type: 'error' });
  }
};

window.lockAfternoon = async () => {
  const afternoonAttendees = allAttendees.filter(a => a.session === 'afternoon');
  
  if (afternoonAttendees.length === 0) {
    showAlert('No afternoon attendees to lock', { type: 'warning' });
    return;
  }
  
  const confirmed = await showConfirm(`Lock all ${afternoonAttendees.length} afternoon attendee(s)?\nThis will remove all action buttons.`);
  if (confirmed !== 1) return;
  
  try {
    const batch = writeBatch(db);
    afternoonAttendees.forEach(attendee => {
      batch.update(doc(db, 'Events', currentEventId, 'Attendees', attendee.id), {
        locked: true
      });
    });
    
    await batch.commit();
    showToast(`Successfully locked ${afternoonAttendees.length} afternoon attendee(s)`, 'success');
    console.log('Afternoon attendees locked');
  } catch (error) {
    console.error('Error locking attendees:', error);
    showAlert('Failed to lock attendees', { type: 'error' });
  }
};

// Build and export attendance data to a real .xlsx workbook using ExcelJS
window.exportAttendeesToExcel = async () => {
  if (!currentEvent || allAttendees.length === 0) {
    showAlert('No attendees to export', { type: 'warning' });
    return;
  }

  // Segregate attendees by session
  const morningAttendees = allAttendees.filter(a => a.session === 'morning');
  const afternoonAttendees = allAttendees.filter(a => a.session === 'afternoon');

  // Derive headers required by the spec
  const headers = [
    'Attendee Name',
    'Course',
    'Role',
    'Date Attended',
    'Session',
    'Status',
    'Certificate ID'
  ];

  // Workbook + worksheet header styling constants
  const headerFillColor = 'FF92D050';
  const headerFontColor = 'FFFFFFFF';
  const headerFontBold = true;

  try {
    const workbook = ExcelJS.Workbook ? new ExcelJS.Workbook() : new ExcelJS.xlsx.Workbook();
    workbook.creator = 'Information Unit';
    workbook.created = new Date();

    // Helper: build a worksheet for a given session
    const buildWorksheet = (sessionName, attendeesList) => {
      const worksheet = workbook.addWorksheet(sessionName);

      // Columns definition: name and width only
      worksheet.columns = [
        { header: 'Attendee Name', key: 'fullName', width: 28 },
        { header: 'Course', key: 'course', width: 18 },
        { header: 'Role', key: 'role', width: 18 },
        { header: 'Date Attended', key: 'dateAttended', width: 18 },
        { header: 'Session', key: 'session', width: 14 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Certificate ID', key: 'certificateId', width: 18 }
      ];

      // Row 1 = headers, apply styling
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

      // Populate data rows
      attendeesList.forEach((attendee, index) => {
        const row = worksheet.getRow(index + 2);
        row.height = 18;

        row.values = [
          attendee.fullName || '',
          attendee.course || '',
          attendee.role || '',
          attendee.dateAttended || '',
          attendee.session || '',
          attendee.status || '',
          attendee.certificateId || ''
        ];
      });

      // Freeze header for easier navigation
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    };

    // Build both session worksheets
    buildWorksheet('Morning Session', morningAttendees);
    buildWorksheet('Afternoon Session', afternoonAttendees);

    // Trigger browser download
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

const initSearch = () => {
  const morningSearch = document.getElementById('morningSearch');
  const afternoonSearch = document.getElementById('afternoonSearch');
  if (morningSearch) {
    morningSearch.addEventListener('input', () => {
      renderAttendees(allAttendees, morningSearch.value, afternoonSearch?.value || '');
    });
  }
  if (afternoonSearch) {
    afternoonSearch.addEventListener('input', () => {
      renderAttendees(allAttendees, morningSearch?.value || '', afternoonSearch.value);
    });
  }
};

onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed:', user ? 'logged in' : 'logged out');
  
  initSearch();
  
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
      showAlert('Event not found', { type: 'warning' });
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
      renderAttendees(allAttendees, document.getElementById('morningSearch')?.value || '', document.getElementById('afternoonSearch')?.value || '');
    });
    
  } catch (error) {
    console.error('Error loading event:', error);
    window.location.href = '../EventCRUD/EventCRUD.html';
  }
});
