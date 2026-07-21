import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, getDoc, serverTimestamp, writeBatch, getDocs, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showConfirm, showToast, showLoading, hideLoading } from '../PopupSystem.js';
import { auth, db } from '../firebase.js';

function calculateStatus(attendee, event) {
  if (attendee.status === 'absent') return 'absent';
  
  const session = attendee.session;
  const timeAttended = attendee.timeAttended;
  
  if (!timeAttended) return 'present';
  
  let scheduledTimeIn = '';
  if (session === 'morning') {
    scheduledTimeIn = event.morningTimeIn;
  } else if (session === 'afternoon') {
    scheduledTimeIn = event.afternoonTimeIn;
  }
  
  if (!scheduledTimeIn) return 'present';
  
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const attendedMinutes = timeToMinutes(timeAttended);
  const scheduledMinutes = timeToMinutes(scheduledTimeIn);
  const gracePeriod = 15;
  
  if (attendedMinutes <= scheduledMinutes + gracePeriod) {
    return 'present';
  } else {
    return 'late';
  }
}

function formatTime12Hour(time24) {
  if (!time24) return '-';
  const [hours, minutes] = time24.split(':').map(Number);
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')}`;
}

function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`
  };
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function isEventStarted(eventDate) {
  if (!eventDate) return true;
  const now = getCurrentDateTime();
  return now.date >= eventDate;
}

let currentUser = null;
let currentEventId = localStorage.getItem('currentEventId');
let currentEvent = null;
let allAttendees = [];

document.getElementById('setCurrentTimeBtn').addEventListener('click', () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;
  document.getElementById('timeAttended').value = currentTime;
  
  if (hours < 12) {
    document.getElementById('session').value = 'morning';
  } else {
    document.getElementById('session').value = 'afternoon';
  }
});

document.getElementById('fetchStudentBtn').addEventListener('click', async () => {
  const idNumber = document.getElementById('idNumber').value.trim();
  if (!idNumber) {
    showAlert('Please enter an ID number', { type: 'warning' });
    return;
  }
  
  try {
    showLoading('fetchStudent');
    const q = query(collection(db, 'RegisteredStudents'), where('idNumber', '==', idNumber), where('adminId', '==', currentUser?.uid || ''));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      hideLoading('fetchStudent');
      showAlert('Student not found in registered students', { type: 'warning' });
      document.getElementById('studentInfoDisplay').classList.add('hidden');
      return;
    }
    
    const student = snapshot.docs[0].data();
    document.getElementById('attendeeName').value = student.fullName || '';
    document.getElementById('course').value = (student.course || '').split('-')[0] || '';
    document.getElementById('major').value = (student.course || '').split('-')[1] || '';
    document.getElementById('year').value = (student.course || '').split('-')[2] || '';
    document.getElementById('role').value = student.role || 'Student';
    
    document.getElementById('fetchedStudentName').textContent = student.fullName || '';
    document.getElementById('fetchedStudentCourse').textContent = student.course || '';
    document.getElementById('studentInfoDisplay').classList.remove('hidden');
    hideLoading('fetchStudent');
  } catch (error) {
    hideLoading('fetchStudent');
    console.error('Error fetching student:', error);
    showAlert('Failed to fetch student', { type: 'error' });
  }
});

document.getElementById('addAttendeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentEvent) {
    showAlert('Event not found', { type: 'warning' });
    return;
  }
  
  const confirmed = await showConfirm('Are you sure you want to add this attendee?');
  if (confirmed !== 1) return;
  
  const attendeeName = document.getElementById('attendeeName').value;
  const idNumber = document.getElementById('idNumber').value;
  const course = document.getElementById('course').value.trim();
  const major = document.getElementById('major').value.trim();
  const year = document.getElementById('year').value.trim();
  const role = document.getElementById('role').value;
  const timeAttended = document.getElementById('timeAttended').value;
  const session = document.getElementById('session').value;
  
  const parts = [course, major, year].filter(Boolean);
  const combinedCourse = parts.join('-');
  
  try {
    showLoading('addAttendee');
    const certificateUuid = generateUUID();
    
    const attendeeData = {
      fullName: attendeeName,
      idNumber: idNumber,
      course: combinedCourse,
      role: role,
      dateAttended: currentEvent.date,
      timeAttended: timeAttended,
      session: session,
      uuid: certificateUuid,
      adminId: currentUser?.uid || '',
      createdAt: serverTimestamp()
    };
    
    const tempAttendee = { ...attendeeData, status: 'present' };
    const computedStatus = calculateStatus(tempAttendee, currentEvent);
    attendeeData.status = computedStatus;
    
    await addDoc(collection(db, 'Events', currentEventId, 'Attendees'), attendeeData);
    
    console.log('Attendee added successfully');
    hideLoading('addAttendee');
    document.getElementById('addAttendeeForm').reset();
    document.getElementById('timeAttended').value = '';
  } catch (error) {
    hideLoading('addAttendee');
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

function getDisplayStatus(attendee) {
  const computed = calculateStatus(attendee, currentEvent);
  return computed;
}

function filterAttendees(attendeesList, searchTerm) {
  if (!searchTerm) return attendeesList;
  const term = searchTerm.toLowerCase();
  return attendeesList.filter(a => 
    (a.fullName || '').toLowerCase().includes(term) ||
    (a.idNumber || '').toLowerCase().includes(term) ||
    (a.course || '').toLowerCase().includes(term) ||
    (getDisplayStatus(a) || '').toLowerCase().includes(term)
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
  
  const enrichedAttendees = attendeesList.map(attendee => ({
    ...attendee,
    displayStatus: getDisplayStatus(attendee)
  }));
  
  tableBody.innerHTML = enrichedAttendees.map(attendee => `
    <tr class="border-b border-gray-100 hover:bg-green-50 transition-colors">
      <td class="py-4 px-4">
        <span class="font-medium text-gray-800">${escapeHtml(attendee.fullName)}</span>
      </td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.idNumber || '')}</td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.course)}</td>
      <td class="py-4 px-4 text-gray-600">${formatTime12Hour(attendee.timeAttended)}</td>
      <td class="py-4 px-4">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${attendee.displayStatus === 'present' ? 'bg-green-100 text-green-800' : attendee.displayStatus === 'late' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}">
          ${attendee.displayStatus.toUpperCase()}
        </span>
      </td>
      <td class="py-4 px-4">
        ${attendee.locked ? `
          <span class="text-gray-400 text-xs italic">Locked</span>
        ` : `
          <div class="flex gap-1 flex-wrap">
            <button onclick="window.markAbsent('${attendee.id}')" 
              class="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs">
              Absent
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

window.markAbsent = async (attendeeId) => {
  const confirmed = await showConfirm('Are you sure you want to mark this attendee as absent?');
  if (confirmed !== 1) return;
  
  try {
    showLoading('markAbsent');
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'absent'
    });
    hideLoading('markAbsent');
    console.log('Attendee marked as absent');
    showToast('Attendee marked as absent');
  } catch (error) {
    hideLoading('markAbsent');
    console.error('Error marking absent:', error);
    showAlert('Failed to mark absent', { type: 'error' });
  }
};

window.editAttendee = async (attendeeId) => {
  const attendee = allAttendees.find(a => a.id === attendeeId);
  if (!attendee) return;
  
  document.getElementById('editAttendeeId').value = attendeeId;
  document.getElementById('editName').value = attendee.fullName || '';
  
  const parts = (attendee.course || '').split('-');
  document.getElementById('editCourse').value = parts[0] || '';
  document.getElementById('editMajor').value = parts[1] || '';
  document.getElementById('editYear').value = parts[2] || '';
  
  document.getElementById('editTimeAttended').value = attendee.timeAttended || '';
  document.getElementById('editSession').value = attendee.session || 'morning';
  document.getElementById('editStatus').value = 'auto';
  
  document.getElementById('editModal').classList.remove('hidden');
  document.getElementById('editModal').classList.add('flex');
};

window.closeEditModal = () => {
  document.getElementById('editModal').classList.add('hidden');
  document.getElementById('editModal').classList.remove('flex');
};

document.getElementById('setEditCurrentTimeBtn').addEventListener('click', () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;
  document.getElementById('editTimeAttended').value = currentTime;
  
  if (hours < 12) {
    document.getElementById('editSession').value = 'morning';
  } else {
    document.getElementById('editSession').value = 'afternoon';
  }
});

document.getElementById('editAttendeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const attendeeId = document.getElementById('editAttendeeId').value;
  const fullName = document.getElementById('editName').value;
  const course = document.getElementById('editCourse').value.trim();
  const major = document.getElementById('editMajor').value.trim();
  const year = document.getElementById('editYear').value.trim();
  const timeAttended = document.getElementById('editTimeAttended').value;
  const session = document.getElementById('editSession').value;
  const statusValue = document.getElementById('editStatus').value;
  
  const parts = [course, major, year].filter(Boolean);
  const combinedCourse = parts.join('-');
  let finalStatus = statusValue;
  if (statusValue === 'auto') {
    const tempAttendee = {
      session,
      timeAttended,
      status: 'present'
    };
    finalStatus = calculateStatus(tempAttendee, currentEvent);
  }
  
  const confirmed = await showConfirm('Save changes to this attendee?');
  if (confirmed !== 1) return;
  
  try {
    showLoading('editAttendee');
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      fullName,
      course: combinedCourse,
      timeAttended,
      session,
      status: finalStatus
    });
    hideLoading('editAttendee');
    console.log('Attendee updated');
    window.closeEditModal();
    showToast('Attendee updated');
  } catch (error) {
    hideLoading('editAttendee');
    console.error('Error updating attendee:', error);
    showAlert('Failed to update attendee', { type: 'error' });
  }
});

window.deleteAttendee = async (attendeeId) => {
  const confirmed = await showConfirm('Are you sure you want to delete this attendee?');
  if (confirmed !== 1) return;
  
  try {
    showLoading('deleteAttendee');
    await deleteDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId));
    hideLoading('deleteAttendee');
    console.log('Attendee deleted');
  } catch (error) {
    hideLoading('deleteAttendee');
    console.error('Error deleting attendee:', error);
    showAlert('Failed to delete attendee', { type: 'error' });
  }
};

window.lockMorning = async () => {
  const morningAttendees = allAttendees.filter(a => a.session === 'morning');
  
  if (morningAttendees.length === 0) {
    showAlert('No morning attendees to lock', { type: 'warning' });
    return;
  }
  
  const unlockedCount = morningAttendees.filter(a => !a.locked).length;
  if (unlockedCount === 0) {
    showAlert('Already saved', { type: 'info' });
    return;
  }
  
  const confirmed = await showConfirm(`Lock all ${morningAttendees.length} morning attendee(s)?\nThis will remove all action buttons.`);
  if (confirmed !== 1) return;
  
  try {
    showLoading('lockMorning');
    const batch = writeBatch(db);
    morningAttendees.forEach(attendee => {
      batch.update(doc(db, 'Events', currentEventId, 'Attendees', attendee.id), {
        locked: true
      });
    });
    
    await batch.commit();
    hideLoading('lockMorning');
    showToast(`Successfully locked ${morningAttendees.length} morning attendee(s)`, 'success');
    console.log('Morning attendees locked');
  } catch (error) {
    hideLoading('lockMorning');
    console.error('Error locking attendees:', error);
    showAlert('Failed to lock attendees', { type: 'error' });
  }
};

window.lockAfternoon = async () => {
  const afternoonAttendees = allAttendees.filter(a => a.session === 'afternoon');
  
  if (afternoonAttendees.length === 0) {
    showAlert('No afternoon attendees to lock', { type: 'warning' });
    return;
  }
  
  const unlockedCount = afternoonAttendees.filter(a => !a.locked).length;
  if (unlockedCount === 0) {
    showAlert('Already saved', { type: 'info' });
    return;
  }
  
  const confirmed = await showConfirm(`Lock all ${afternoonAttendees.length} afternoon attendee(s)?\nThis will remove all action buttons.`);
  if (confirmed !== 1) return;
  
  try {
    showLoading('lockAfternoon');
    const batch = writeBatch(db);
    afternoonAttendees.forEach(attendee => {
      batch.update(doc(db, 'Events', currentEventId, 'Attendees', attendee.id), {
        locked: true
      });
    });
    
    await batch.commit();
    hideLoading('lockAfternoon');
    showToast(`Successfully locked ${afternoonAttendees.length} afternoon attendee(s)`, 'success');
    console.log('Afternoon attendees locked');
  } catch (error) {
    hideLoading('lockAfternoon');
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
  
  const headers = ['Attendee Name', 'ID Number', 'Course', 'Time Attended', 'Status'];
  
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
        attendee.timeAttended ? formatTime12Hour(attendee.timeAttended) : '',
        attendee.status || ''
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
        attendee.timeAttended ? formatTime12Hour(attendee.timeAttended) : '',
        attendee.status || ''
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

const initAutoFormat = () => {
  const uppercaseFields = ['course', 'major', 'year', 'editCourse', 'editMajor', 'editYear'];
  const titleFields = ['attendeeName', 'role', 'editName', 'editRole'];
  
  uppercaseFields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = el.value.toUpperCase();
    });
  });
  
  titleFields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = toTitleCase(el.value);
    });
  });
};

function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function initDynamicDropdowns() {
  import('./form-options.js').then(({ updateMajorOptions, populateYearOptions }) => {
    updateMajorOptions('course', 'major');
    updateMajorOptions('editCourse', 'editMajor');
    populateYearOptions('year');
    populateYearOptions('editYear');
  });
}

function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed:', user ? 'logged in' : 'logged out');
  currentUser = user;
  
  initSearch();
  initAutoFormat();
  initDynamicDropdowns();
  
  if (!user) {
    window.location.href = '../logIn/LogInAdmin.html';
    return;
  }
  
  const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
  const adminData = adminDoc.exists() ? adminDoc.data() : {};
  
  const isSystemAdmin = adminData.role === 'system_admin' || adminData.role === 'super_admin';
  
  if (adminData.status === 'rejected') {
    await showAlert('Account Rejected');
    await auth.signOut();
    window.location.href = '../logIn/LogInAdmin.html';
    return;
  }
  
  if (adminData.status !== 'approved') {
    await auth.signOut();
    window.location.href = '../logIn/LogInAdmin.html';
    return;
  }
  
  const headerOrgName = document.getElementById('headerOrgName');
  if (headerOrgName) {
    headerOrgName.textContent = isSystemAdmin ? 'System Admin' : (localStorage.getItem('orgName') || '');
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
    
    const started = isEventStarted(currentEvent.date);
    const addAttendeeWrapper = document.getElementById('addAttendeeWrapper');
    const lockOverlay = document.getElementById('addAttendeeLockOverlay');
    if (!started) {
      addAttendeeWrapper.classList.add('opacity-40', 'pointer-events-none');
      lockOverlay.classList.remove('hidden');
      lockOverlay.classList.add('flex');
      document.getElementById('lockEventDate').textContent = `Opens: ${currentEvent.date}`;
    } else {
      addAttendeeWrapper.classList.remove('opacity-40', 'pointer-events-none');
      lockOverlay.classList.add('hidden');
      lockOverlay.classList.remove('flex');
    }
    
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
  
  if (currentEvent.date && isEventStarted(currentEvent.date)) {
    setupAutoLock();
  }
});

let autoLockInterval = null;

window.setupAutoLock = () => {
  if (autoLockInterval) clearInterval(autoLockInterval);
  let morningLocked = false;
  let afternoonLocked = false;
  autoLockInterval = setInterval(() => {
    if (!currentEvent) return;
    const now = getCurrentDateTime();
    if (now.date !== currentEvent.date) {
      morningLocked = false;
      afternoonLocked = false;
      return;
    }
    const [nowH, nowM] = now.time.split(':').map(Number);
    const currentTotalMinutes = nowH * 60 + nowM;
    if (currentEvent.morningTimeOut && !morningLocked) {
      const [h, m] = currentEvent.morningTimeOut.split(':').map(Number);
      if (currentTotalMinutes >= h * 60 + m) {
        window.lockMorning();
        morningLocked = true;
      }
    }
    if (currentEvent.afternoonTimeOut && !afternoonLocked) {
      const [h, m] = currentEvent.afternoonTimeOut.split(':').map(Number);
      if (currentTotalMinutes >= h * 60 + m) {
        window.lockAfternoon();
        afternoonLocked = true;
      }
    }
  }, 30000);
};

window.openSettings = async () => {
  const adminDoc = await getDoc(doc(db, 'Admin', currentUser.uid));
  const adminData = adminDoc.exists() ? adminDoc.data() : {};
  const isSystemAdmin = adminData.role === 'system_admin' || adminData.role === 'super_admin';
  const savedOrg = isSystemAdmin ? (adminData.fullName || adminData.collegeName || '') : (localStorage.getItem('orgName') || '');
  const orgNameInput = document.getElementById('orgName');
  const label = document.getElementById('settingsLabel');
  if (label) label.textContent = isSystemAdmin ? 'Full Name' : 'College Name';
  if (orgNameInput) orgNameInput.value = savedOrg;
  document.getElementById('settingsModal').classList.remove('hidden');
  document.getElementById('settingsModal').classList.add('flex');
};

window.closeSettings = () => {
  document.getElementById('settingsModal').classList.add('hidden');
  document.getElementById('settingsModal').classList.remove('flex');
};

window.backToEvents = () => {
  window.location.href = '../EventCRUD/EventCRUD.html';
};

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const adminDoc = await getDoc(doc(db, 'Admin', currentUser.uid));
  const adminData = adminDoc.exists() ? adminDoc.data() : {};
  const isSystemAdmin = adminData.role === 'system_admin' || adminData.role === 'super_admin';
  const orgName = document.getElementById('orgName').value.trim();
  const currentName = isSystemAdmin ? (adminData.fullName || adminData.collegeName || '') : (localStorage.getItem('orgName') || '');
  if (orgName === currentName) {
    showAlert('Already saved', { type: 'info' });
    return;
  }
  
  const confirmed = await showConfirm('Are you sure you want to save these settings?');
  if (confirmed !== 1) return;
  
  try {
    showLoading('saveSettings');
    await updateDoc(doc(db, 'Admin', currentUser.uid), {
      collegeName: orgName
    });
    localStorage.setItem('orgName', orgName);
    hideLoading('saveSettings');
    window.closeSettings();
    showToast('Settings saved');
  } catch (error) {
    hideLoading('saveSettings');
    console.error('Error saving settings:', error);
    showAlert('Failed to save settings', { type: 'error' });
  }
});

window.handleLogout = async () => {
  try {
    await auth.signOut();
    sessionStorage.removeItem('adminLoggedIn');
    sessionStorage.removeItem('systemAdminLoggedIn');
    localStorage.removeItem('orgName');
  } catch (error) {
    console.error('Logout error:', error);
  }
  window.location.href = '../logIn/LogInAdmin.html?v=' + Date.now();
};
