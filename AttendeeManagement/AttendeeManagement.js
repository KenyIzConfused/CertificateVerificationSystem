import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
<<<<<<< Updated upstream
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, getDoc, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
const OCR_API_URL = 'https://us-central1-ipprc-certificate-verification.cloudfunctions.net/ocrTextDetection';
=======
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, getDoc, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
>>>>>>> Stashed changes


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

function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

function parseOcrText(rawText) {
  const lines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const parsed = [];

  for (const line of lines) {
    let fullName = null;
    let course = '';
    let year = '';
    let section = '';
    let major = '';
    let role = 'Student';

    if (line.includes(',') || line.includes('\t')) {
      const parts = line.split(/[,\t]/).map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 1) fullName = parts[0];
      if (parts.length >= 2) course = parts[1];
      if (parts.length >= 3) year = parts[2];
      if (parts.length >= 4) section = parts[3];
      if (parts.length >= 5) major = parts[4];
      if (parts.length >= 6) role = parts[5];
    } else {
      const kvPattern = /(Full Name|Name)\s*:\s*(.+)/i;
      const coursePattern = /(Course)\s*:\s*(.+)/i;
      const yearPattern = /(Year)\s*:\s*(.+)/i;
      const sectionPattern = /(Section)\s*:\s*(.+)/i;
      const majorPattern = /(Major)\s*:\s*(.+)/i;
      const rolePattern = /(Role)\s*:\s*(.+)/i;

      const kvMatch = line.match(kvPattern);
      const courseMatch = line.match(coursePattern);
      const yearMatch = line.match(yearPattern);
      const sectionMatch = line.match(sectionPattern);
      const majorMatch = line.match(majorPattern);
      const roleMatch = line.match(rolePattern);

      if (kvMatch) fullName = kvMatch[2].trim();
      if (courseMatch) course = courseMatch[2].trim();
      if (yearMatch) year = yearMatch[2].trim();
      if (sectionMatch) section = sectionMatch[2].trim();
      if (majorMatch) major = majorMatch[2].trim();
      if (roleMatch) role = roleMatch[2].trim();
    }

    if (!fullName) continue;

    const yearNum = year.match(/\d+/);
    const cleanedYear = yearNum ? yearNum[0] : year;

    parsed.push({
      fullName,
      course,
      year: cleanedYear,
      section,
      major,
      role,
      dateAttended: getTodayDateString(),
      session: 'morning',
      status: 'present'
    });
  }

  return parsed;
}

function renderOcrParsedList(parsedAttendees) {
  const listEl = document.getElementById('ocrParsedList');
  listEl.innerHTML = parsedAttendees.map((a, idx) => `
    <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-green-100">
      <div class="flex-1 grid grid-cols-2 gap-2 text-sm text-gray-700">
        <span><strong>Name:</strong> ${escapeHtml(a.fullName)}</span>
        <span><strong>Course:</strong> ${escapeHtml(a.course || '-')}</span>
        <span><strong>Year:</strong> ${escapeHtml(a.year || '-')}</span>
        <span><strong>Section:</strong> ${escapeHtml(a.section || '-')}</span>
        <span><strong>Major:</strong> ${escapeHtml(a.major || '-')}</span>
        <span><strong>Role:</strong> ${escapeHtml(a.role || '-')}</span>
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
        year: attendee.year,
        section: attendee.section,
        major: attendee.major,
        role: attendee.role,
        dateAttended: attendee.dateAttended,
        session: attendee.session,
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
    renderAttendees(allAttendees, document.getElementById('morningSearch')?.value || '', document.getElementById('afternoonSearch')?.value || '');
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

function showToast(message, type = 'success') {
  const container = document.createElement('div');
  container.className = 'toast-container';

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  document.body.appendChild(container);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => {
      container.remove();
    }, 300);
  }, 3000);
}

function showSuccessModal(message, callback = null) {
  showToast(message, 'success');
}

document.getElementById('addAttendeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentEvent) {
<<<<<<< Updated upstream
    showAlert('Event not found', { type: 'warning' });
=======
    showToast('Event not found', 'error');
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  const session = document.getElementById('session').value;
  const year = document.getElementById('year').value;
  const section = document.getElementById('section').value;
  const major = document.getElementById('major').value;
  
  try {
    const certificateId = await generateUniqueCertificateId(allAttendees);
    const docRef = await addDoc(collection(db, 'Events', currentEventId, 'Attendees'), {
=======

  try {
    const attendeeUuid = generateUUID();

    await addDoc(collection(db, 'Events', currentEventId, 'Attendees'), {
>>>>>>> Stashed changes
      fullName: attendeeName,
      course: course,
      year: year,
      section: section,
      major: major,
      role: role,
      dateAttended: dateAttended,
<<<<<<< Updated upstream
      session: session,
      status: 'present',
      certificateId: certificateId,
      createdAt: serverTimestamp()
    });
    
    const newAttendee = {
      id: docRef.id,
      fullName: attendeeName,
      course: course,
      year: year,
      section: section,
      major: major,
      role: role,
      dateAttended: dateAttended,
      session: session,
      status: 'present',
      certificateId: certificateId
    };
    allAttendees.push(newAttendee);
    renderAttendees(allAttendees, document.getElementById('morningSearch')?.value || '', document.getElementById('afternoonSearch')?.value || '');
    
=======
      status: 'active',
      uuid: attendeeUuid,
      createdAt: serverTimestamp()
    });

>>>>>>> Stashed changes
    console.log('Attendee added successfully');
    document.getElementById('addAttendeeForm').reset();
    showSuccessModal('Attendee added successfully!', () => {
      document.getElementById('attendeeName').focus();
    });
  } catch (error) {
    console.error('Error adding attendee:', error);
<<<<<<< Updated upstream
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
    (a.year || '').toLowerCase().includes(term) ||
    (a.section || '').toLowerCase().includes(term) ||
    (a.major || '').toLowerCase().includes(term) ||
    (a.role || '').toLowerCase().includes(term) ||
    (a.dateAttended || '').toLowerCase().includes(term) ||
    (a.status || '').toLowerCase().includes(term) ||
    (a.certificateId || '').toLowerCase().includes(term)
  );
}

function renderTable(attendeesList, tableBodyId, noDataId) {
  const tableBody = document.getElementById(tableBodyId);
  const noData = document.getElementById(noDataId);
  
=======
    showSuccessModal('Failed to add attendee.', null);
  }
});

function renderAttendees(attendeesList) {
  const attendeesTableBody = document.getElementById('attendeesTableBody');
  const attendeeCount = document.getElementById('attendeeCount');
  const noAttendees = document.getElementById('noAttendees');
  const addAttendeeForm = document.getElementById('addAttendeeForm');
  const isEventClosed = currentEvent && currentEvent.status === 'closed';

  console.log('Rendering attendees, count:', attendeesList.length);
  attendeeCount.textContent = attendeesList.length;

  if (isEventClosed) {
    if (addAttendeeForm) {
      addAttendeeForm.style.display = 'none';
    }
  }

>>>>>>> Stashed changes
  if (attendeesList.length === 0) {
    noData.style.display = 'block';
    tableBody.innerHTML = '';
    return;
  }
<<<<<<< Updated upstream
  
  noData.style.display = 'none';
  
  tableBody.innerHTML = attendeesList.map(attendee => `
    <tr class="border-b border-gray-100 hover:bg-green-50 transition-colors">
      <td class="py-4 px-4">
        <span class="font-medium text-gray-800">${escapeHtml(attendee.fullName)}</span>
      </td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.course)}</td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.year)}</td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.section)}</td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.major)}</td>
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
=======
>>>>>>> Stashed changes

  noAttendees.style.display = 'none';

  attendeesTableBody.innerHTML = attendeesList.map(attendee => {
    const statusClass = attendee.status === 'completed' ? 'bg-green-100 text-green-800' :
                       attendee.status === 'absent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';

    return `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-3 px-4 text-sm text-gray-800">${escapeHtml(attendee.fullName)}</td>
        <td class="py-3 px-4 text-sm text-gray-800">${escapeHtml(attendee.course)}</td>
        <td class="py-3 px-4 text-sm text-gray-800">${escapeHtml(attendee.role)}</td>
        <td class="py-3 px-4 text-sm text-gray-800">${attendee.dateAttended || 'N/A'}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusClass}">
            ${escapeHtml(attendee.status)}
          </span>
        </td>
        <td class="py-3 px-4">
          <button onclick="markCompleted('${attendee.id}')" class="text-green-600 hover:text-green-700 font-medium mr-2">Complete</button>
          <button onclick="markAbsent('${attendee.id}')" class="text-red-600 hover:text-red-700 font-medium mr-2">Absent</button>
          <button onclick="deleteAttendee('${attendee.id}')" class="text-gray-400 hover:text-gray-600 font-medium">Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  console.log('Table rows updated');
}



window.markPresent = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'present'
    });
<<<<<<< Updated upstream
    console.log('Marked as present');
  } catch (error) {
    console.error('Error updating status:', error);
    showAlert('Failed to update status', { type: 'error' });
=======
    showSuccessModal('Attendee marked as completed!', null);
  } catch (error) {
    console.error('Error updating status:', error);
    showSuccessModal('Failed to update status.', null);
>>>>>>> Stashed changes
  }
};

window.markAbsent = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'absent'
    });
    showSuccessModal('Attendee marked as absent.', null);
  } catch (error) {
    console.error('Error updating status:', error);
<<<<<<< Updated upstream
    showAlert('Failed to update status', { type: 'error' });
=======
    showSuccessModal('Failed to update status.', null);
>>>>>>> Stashed changes
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
  document.getElementById('editYear').value = attendee.year || '';
  document.getElementById('editSection').value = attendee.section || '';
  document.getElementById('editMajor').value = attendee.major || '';
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
  const year = document.getElementById('editYear').value;
  const section = document.getElementById('editSection').value;
  const major = document.getElementById('editMajor').value;
  const role = document.getElementById('editRole').value;
  const dateAttended = document.getElementById('editDateAttended').value;
  const session = document.getElementById('editSession').value;
  const status = document.getElementById('editStatus').value;
  
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      fullName,
      course,
      year,
      section,
      major,
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
<<<<<<< Updated upstream
  const confirmed = await showConfirm('Are you sure you want to delete this attendee?');
  if (confirmed !== 1) return;
  
=======
  if (!confirm('Are you sure you want to delete this attendee?')) return;

>>>>>>> Stashed changes
  try {
    await deleteDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId));
    showSuccessModal('Attendee deleted.', null);
  } catch (error) {
    console.error('Error deleting attendee:', error);
<<<<<<< Updated upstream
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
          year: attendee.year,
         section: attendee.section,
         major: attendee.major,
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
    'Course, Year, Section, Major',
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
        { header: 'Course, Year, Section, Major', key: 'academicInfo', width: 45 },
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
          `${attendee.course || ''} ${attendee.year || ''} ${attendee.section || ''} ${attendee.major || ''}`.trim(),
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
  
=======
    showSuccessModal('Failed to delete attendee.', null);
  }
};

onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed:', user ? 'logged in' : 'logged out');

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      showAlert('Event not found', { type: 'warning' });
=======
      showToast('Event not found', 'error');
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

const uploadAttendanceBtn = document.getElementById('uploadAttendanceBtn');
const ocrSection = document.getElementById('ocrSection');
const ocrFileInput = document.getElementById('ocrFileInput');
const ocrPreview = document.getElementById('ocrPreview');
const ocrImage = document.getElementById('ocrImage');
const runOcrBtn = document.getElementById('runOcrBtn');
const ocrStatus = document.getElementById('ocrStatus');
const ocrRawText = document.getElementById('ocrRawText');
const ocrTextarea = document.getElementById('ocrTextarea');
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
=======
>>>>>>> Stashed changes
