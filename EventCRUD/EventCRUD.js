import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc, getDocs, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showAlert, showConfirm, showToast } from '../PopupSystem.js';

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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function toCamelCase(str) {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

function to12Hour(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':').map(Number);
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')}`;
}

function to24Hour(time12) {
  if (!time12) return '';
  const match = time12.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

const initAutoFormat = () => {
  const fields = ['eventTitle', 'eventDescription', 'eventLocation'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = smartTitleCase(el.value);
    });
  });
};

const initTimeFormat = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const roundToHalfHour = (mins) => Math.round(mins / 30) * 30;
  const currentRounded = roundToHalfHour(currentMinutes);
  const currentHour = Math.floor(currentRounded / 60) % 24;
  const currentMinute = currentRounded % 60;
  const currentTime24 = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
  
  const isMorning = currentHour < 12;
  
  const defaults = {
    morningTimeIn: isMorning ? currentTime24 : '07:00',
    morningTimeOut: isMorning ? '12:00' : '12:00',
    afternoonTimeIn: isMorning ? '13:00' : currentTime24,
    afternoonTimeOut: '17:00'
  };
  
  const timeFields = [
    { id: 'morningTimeIn', defaultVal: defaults.morningTimeIn },
    { id: 'morningTimeOut', defaultVal: defaults.morningTimeOut },
    { id: 'afternoonTimeIn', defaultVal: defaults.afternoonTimeIn },
    { id: 'afternoonTimeOut', defaultVal: defaults.afternoonTimeOut }
  ];
  
  timeFields.forEach(({ id, defaultVal }) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.value) el.value = defaultVal;
  });
};

function smartTitleCase(str) {
  return str
    .split(/(\s+)/)
    .map(word => {
      if (!word.trim() || /^[A-Z]/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

window.handleEventUpdate = (events) => {
  events.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const eventsStack = document.getElementById('eventsStack');
  const eventCount = document.getElementById('eventCount');
  const noEvents = document.getElementById('noEvents');
  
  eventCount.textContent = events.length;
  
  if (events.length === 0) {
    noEvents.style.display = 'block';
    eventsStack.innerHTML = '';
    return;
  }
  
  noEvents.style.display = 'none';
  
  eventsStack.innerHTML = events.map(event => `
    <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-800">${escapeHtml(event.title)}</h3>
          <p class="text-gray-600 mt-1">${escapeHtml(event.description)}</p>
          <div class="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            <span>📅 ${event.date}</span>
            ${event.morningTimeIn ? `<span>☀️ Morning: ${to12Hour(event.morningTimeIn)} - ${event.morningTimeOut ? to12Hour(event.morningTimeOut) : ''}</span>` : ''}
            ${event.afternoonTimeIn ? `<span>🌤️ Afternoon: ${to12Hour(event.afternoonTimeIn)} - ${event.afternoonTimeOut ? to12Hour(event.afternoonTimeOut) : ''}</span>` : ''}
            <span>📍 ${escapeHtml(event.location)}</span>
          </div>
          <span class="inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium ${event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
            ${event.status.toUpperCase()}
          </span>
        </div>
        <div class="flex gap-2 ml-4">
          <button onclick="window.editEvent('${event.id}')" 
            class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
            Edit
          </button>
          <button onclick="window.manageAttendees('${event.id}')" 
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Manage Attendees
          </button>
          <button onclick="window.exportSingleEvent('${event.id}', '${escapeHtml(event.title)}')" 
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Export to Excel
          </button>
          ${event.status === 'active' ? `
          <button onclick="window.closeEvent('${event.id}')" 
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Close Event
          </button>
          ` : ''}
          <button onclick="window.deleteEvent('${event.id}')" 
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
};

document.getElementById('createEventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentUser) {
    showAlert('Please log in first', { type: 'warning' });
    return;
  }
  
  const editId = e.target.dataset.editId;
  const confirmed = await showConfirm(editId ? 'Are you sure you want to update this event?' : 'Are you sure you want to create this event?');
  if (confirmed !== 1) return;
  
  const eventTitle = document.getElementById('eventTitle').value;
  const eventDescription = document.getElementById('eventDescription').value;
  const eventDate = document.getElementById('eventDate').value;
  const morningTimeIn = to24Hour(document.getElementById('morningTimeIn').value);
  const morningTimeOut = to24Hour(document.getElementById('morningTimeOut').value);
const afternoonTimeIn = to24Hour(document.getElementById('afternoonTimeIn').value);
  const afternoonTimeOut = to24Hour(document.getElementById('afternoonTimeOut').value);
  const eventLocation = document.getElementById('eventLocation').value;
  
  try {
    if (editId) {
      await updateDoc(doc(db, 'Events', editId), {
        title: eventTitle,
        description: eventDescription,
        date: eventDate,
        morningTimeIn,
        morningTimeOut,
        afternoonTimeIn,
        afternoonTimeOut,
        location: eventLocation
      });
      showToast('Event updated successfully!');
      delete e.target.dataset.editId;
      document.getElementById('createEventPanel').classList.add('hidden');
      document.querySelector('#createEventForm button[type="submit"]').textContent = 'Create Event';
      document.getElementById('cancelEditBtn').classList.add('hidden');
    } else {
      await addDoc(collection(db, 'Events'), {
        adminId: currentUser.uid,
        title: eventTitle,
        description: eventDescription,
        date: eventDate,
        morningTimeIn,
        morningTimeOut,
        afternoonTimeIn,
        afternoonTimeOut,
        location: eventLocation,
        status: 'active',
        createdAt: new Date()
      });
      showToast('Event created successfully!');
      document.getElementById('createEventForm').reset();
      document.getElementById('createEventPanel').classList.add('hidden');
    }
  } catch (error) {
    console.error('Error saving event:', error);
    showAlert(editId ? 'Failed to update event' : 'Failed to create event', { type: 'error' });
  }
});

window.exportSingleEvent = async (eventId, eventTitle) => {
  try {
    const eventDoc = await getDoc(doc(db, 'Events', eventId));
    const attendeesSnapshot = await getDocs(collection(db, 'Events', eventId, 'Attendees'));
    const attendees = attendeesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const headers = ['Attendee Name', 'Course', 'Role', 'Date Attended', 'Time Attended', 'Status', 'Event Name'];
    const rows = attendees.map(attendee => [
      attendee.fullName || '',
      attendee.course || '',
      attendee.role || '',
      attendee.dateAttended || '',
      attendee.timeAttended ? to12Hour(attendee.timeAttended) : '',
      attendee.status || '',
      eventTitle || ''
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

window.deleteEvent = async (eventId) => {
  const confirmed = await showConfirm('Are you sure you want to delete this event?');
  if (confirmed !== 1) return;
  
  try {
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
  const event = eventDoc.data();
  
  const panel = document.getElementById('createEventPanel');
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth' });
  
  document.getElementById('eventTitle').value = event.title || '';
  document.getElementById('eventDescription').value = event.description || '';
  document.getElementById('eventDate').value = event.date || '';
  document.getElementById('morningTimeIn').value = event.morningTimeIn || '07:00';
  document.getElementById('morningTimeOut').value = event.morningTimeOut || '12:00';
  document.getElementById('afternoonTimeIn').value = event.afternoonTimeIn || '13:00';
  document.getElementById('afternoonTimeOut').value = event.afternoonTimeOut || '17:00';
  document.getElementById('eventLocation').value = event.location || '';
  
  const form = document.getElementById('createEventForm');
  form.dataset.editId = eventId;
  
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.textContent = 'Update Event';
  
  document.getElementById('cancelEditBtn').classList.remove('hidden');
};

window.generateAccomplishmentReport = async () => {
  try {
    const eventsSnapshot = await getDocs(collection(db, 'Events'));
    const events = [];
    eventsSnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });

    if (events.length === 0) {
      showAlert('No events to generate report', { type: 'warning' });
      return;
    }

    const lines = ['Accomplishment Report', `Generated: ${new Date().toLocaleString()}`, ''];
    for (const event of events) {
      const attendeesSnapshot = await getDocs(collection(db, 'Events', event.id, 'Attendees'));
      lines.push(`Title: ${event.title || ''}`);
      lines.push(`Description: ${event.description || ''}`);
      lines.push(`Date: ${event.date || ''}`);
      lines.push(`Morning Session: ${event.morningTimeIn ? to12Hour(event.morningTimeIn) : ''} - ${event.morningTimeOut ? to12Hour(event.morningTimeOut) : ''}`);
      lines.push(`Afternoon Session: ${event.afternoonTimeIn ? to12Hour(event.afternoonTimeIn) : ''} - ${event.afternoonTimeOut ? to12Hour(event.afternoonTimeOut) : ''}`);
      lines.push(`Participants: ${attendeesSnapshot.size}`);
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Accomplishment_Report.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Accomplishment report generated', 'success');
  } catch (error) {
    console.error('Error generating report:', error);
    showAlert('Failed to generate report', { type: 'error' });
  }
};

window.cancelEdit = () => {
  const form = document.getElementById('createEventForm');
  delete form.dataset.editId;
  form.reset();
  document.getElementById('createEventPanel').classList.add('hidden');
  form.querySelector('button[type="submit"]').textContent = 'Create Event';
  document.getElementById('cancelEditBtn').classList.add('hidden');
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    initAutoFormat();
    initTimeFormat();
    updateOrgDisplay();
    
    const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
    const adminName = adminDoc.exists() ? adminDoc.data().adminName : user.email;
    document.getElementById('adminName').textContent = `Admin: ${adminName}`;
    
    const q = query(collection(db, 'Events'), where('adminId', '==', user.uid));
    onSnapshot(q, (snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      window.handleEventUpdate(events);
    });
  } else {
    window.location.href = '../logIn/LogInAdmin.html';
  }
});

window.openSettings = () => {
  const savedOrg = localStorage.getItem('orgName') || '';
  document.getElementById('orgName').value = savedOrg;
  document.getElementById('settingsModal').classList.remove('hidden');
  document.getElementById('settingsModal').classList.add('flex');
};

window.closeSettings = () => {
  document.getElementById('settingsModal').classList.add('hidden');
  document.getElementById('settingsModal').classList.remove('flex');
};

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const orgName = document.getElementById('orgName').value.trim();
  const savedOrg = localStorage.getItem('orgName') || '';
  
  if (orgName === savedOrg) {
    showAlert('Already saved', { type: 'info' });
    return;
  }
  
  const confirmed = await showConfirm('Are you sure you want to save these settings?');
  if (confirmed !== 1) return;
  
  localStorage.setItem('orgName', orgName);
  document.getElementById('orgNameDisplay').textContent = orgName || 'Information Unit';
  window.closeSettings();
  showToast('Settings saved');
});

const updateOrgDisplay = () => {
  const orgName = localStorage.getItem('orgName') || '';
  const display = document.getElementById('orgNameDisplay');
  if (display) {
    display.textContent = orgName || 'Information Unit';
  }
};