import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, getDoc, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showConfirm, showToast } from '../PopupSystem.js';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
  const idNumber = document.getElementById('idNumber').value;
  const course = document.getElementById('course').value;
  const role = document.getElementById('role').value;
  const dateAttended = document.getElementById('dateAttended').value;
  const session = document.getElementById('session').value;
  
  try {
    const certificateUuid = generateUUID();
    
    await addDoc(collection(db, 'Events', currentEventId, 'Attendees'), {
      fullName: attendeeName,
      idNumber: idNumber,
      course: course,
      role: role,
      dateAttended: dateAttended,
      session: session,
      status: 'present',
      uuid: certificateUuid,
      createdAt: serverTimestamp()
    });
    
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
    (a.idNumber || '').toLowerCase().includes(term) ||
    (a.course || '').toLowerCase().includes(term) ||
    (a.role || '').toLowerCase().includes(term) ||
    (a.dateAttended || '').toLowerCase().includes(term) ||
    (a.status || '').toLowerCase().includes(term)
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
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.idNumber || '')}</td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.course)}</td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.role)}</td>
      <td class="py-4 px-4 text-gray-600">${attendee.dateAttended}</td>
      <td class="py-4 px-4">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${attendee.status === 'present' ? 'bg-green-100 text-green-800' : attendee.status === 'late' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}">
          ${attendee.status.toUpperCase()}
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
        uuid: generateUUID(),
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

window.exportAttendeesToExcel = () => {
  if (!currentEvent || allAttendees.length === 0) {
    showAlert('No attendees to export', { type: 'warning' });
    return;
  }
  
  const morningAttendees = allAttendees.filter(a => a.session === 'morning');
  const afternoonAttendees = allAttendees.filter(a => a.session === 'afternoon');
  
  const headers = ['Attendee Name', 'ID Number', 'Course', 'Role', 'Date Attended', 'Status', 'Certificate UUID'];
  
  let csvContent = `Event: ${currentEvent.title}\n\n`;
  
  csvContent += '=== MORNING SESSION ===\n';
  
  const sortedMorning = [...morningAttendees].sort((a, b) => a.course?.localeCompare(b.course) || a.fullName?.localeCompare(b.fullName));
  const morningByCourse = {};
  sortedMorning.forEach(a => {
    const course = a.course || 'Unknown';
    if (!morningByCourse[course]) morningByCourse[course] = [];
    morningByCourse[course].push(a);
  });
  
  Object.keys(morningByCourse).sort().forEach(course => {
    csvContent += `\n--- ${course} ---\n`;
    csvContent += headers.join(',') + '\n';
    morningByCourse[course].forEach(attendee => {
      const row = [
        attendee.fullName || '',
        attendee.idNumber || '',
        attendee.course || '',
        attendee.role || '',
        attendee.dateAttended || '',
        attendee.status || '',
        attendee.uuid || ''
      ];
      csvContent += row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
  });
  
  csvContent += '\n=== AFTERNOON SESSION ===\n';
  
  const sortedAfternoon = [...afternoonAttendees].sort((a, b) => a.course?.localeCompare(b.course) || a.fullName?.localeCompare(b.fullName));
  const afternoonByCourse = {};
  sortedAfternoon.forEach(a => {
    const course = a.course || 'Unknown';
    if (!afternoonByCourse[course]) afternoonByCourse[course] = [];
    afternoonByCourse[course].push(a);
  });
  
  Object.keys(afternoonByCourse).sort().forEach(course => {
    csvContent += `\n--- ${course} ---\n`;
    csvContent += headers.join(',') + '\n';
    afternoonByCourse[course].forEach(attendee => {
      const row = [
        attendee.fullName || '',
        attendee.idNumber || '',
        attendee.course || '',
        attendee.role || '',
        attendee.dateAttended || '',
        attendee.status || '',
        attendee.uuid || ''
      ];
      csvContent += row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentEvent.title.replace(/\s+/g, '_')}_attendance_report.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
