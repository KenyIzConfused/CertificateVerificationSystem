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
  
  eventsStack.innerHTML = events.map(event => {
    const statusClass = event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    const statusLabel = (event.status || 'active').toUpperCase();

    return `
      <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
        <div>
          <h3 class="text-2xl font-bold text-gray-900">${escapeHtml(event.title)}</h3>
          <p class="text-gray-600 mt-2 leading-relaxed">${escapeHtml(event.description)}</p>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-5 text-sm">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Date</dt>
              <dd class="mt-1 text-gray-800">${escapeHtml(event.date || '')}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Time</dt>
              <dd class="mt-1 text-gray-800">${escapeHtml(event.time || '')}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Venue</dt>
              <dd class="mt-1 text-gray-800">${escapeHtml(event.location || '')}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Duration</dt>
              <dd class="mt-1 text-gray-800">${event.duration ? `${escapeHtml(event.duration)} hrs` : 'Not specified'}</dd>
            </div>
            ${event.department ? `
            <div class="sm:col-span-2">
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Department</dt>
              <dd class="mt-1 text-gray-800">${escapeHtml(event.department)}</dd>
            </div>
            ` : ''}
            ${event.speaker ? `
            <div class="sm:col-span-2">
              <dt class="text-xs font-semibold uppercase tracking-wide text-gray-500">Speaker</dt>
              <dd class="mt-1 text-gray-800">${escapeHtml(event.speaker)}</dd>
            </div>
            ` : ''}
          </dl>

          <span class="inline-block mt-5 px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
            Status: ${statusLabel}
          </span>
        </div>

        <div class="mt-6 pt-5 border-t border-green-100">
          <div class="flex flex-wrap gap-3">
            <button onclick="window.editEvent('${event.id}')" 
              class="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-semibold">
              Edit
            </button>
            <button onclick="window.manageAttendees('${event.id}')" 
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold">
              Manage Attendees
            </button>
            <button onclick="window.exportSingleEvent('${event.id}', '${escapeHtml(event.title)}')" 
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold">
              Export to Excel
            </button>
            ${event.status === 'active' ? `
            <button onclick="window.closeEvent('${event.id}')" 
              class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold">
              Close Event
            </button>
            ` : ''}
            <button onclick="window.deleteEvent('${event.id}')" 
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

document.getElementById('eventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
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
      document.querySelector('#createEventForm button[type="submit"]').textContent = 'Create Event';
      document.getElementById('cancelEditBtn').classList.add('hidden');
    } else {
      await addDoc(collection(db, 'Events'), {
        adminId: currentUser.uid,
        title: eventTitle,
        description: eventDescription,
        date: eventDate,
        time: eventTime,
        location: eventLocation,
        duration: eventDuration ? parseInt(eventDuration) : null,
        department: department,
        speaker: document.getElementById('speaker').value || '',
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

document.getElementById('showCreateFormBtn').addEventListener('click', () => {
  document.getElementById('createEventPanel').classList.remove('hidden');
  document.getElementById('createEventPanel').scrollIntoView({ behavior: 'smooth' });
});

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
  try {
    const eventDoc = await getDoc(doc(db, 'Events', eventId));
    if (!eventDoc.exists()) {
      showAlert('Event not found', { type: 'error' });
      return;
    }
    const event = eventDoc.data();
    const attendeesSnapshot = await getDocs(collection(db, 'Events', eventId, 'Attendees'));
    const attendees = attendeesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (attendees.length === 0) {
      showAlert('No attendees to generate certificates for', { type: 'warning' });
      return;
    }
    localStorage.setItem('certEventData', JSON.stringify({ id: eventId, event, attendees }));
    window.open('GenerateCertificate.html', '_blank');
  } catch (error) {
    console.error('Error generating certificates:', error);
    showAlert('Failed to generate certificates', { type: 'error' });
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

window.cancelEdit = () => {
  const form = document.getElementById('eventForm');
  delete form.dataset.editId;
  form.reset();
  document.getElementById('createEventPanel').classList.add('hidden');
  form.querySelector('button[type="submit"]').textContent = 'Create Event';
  document.getElementById('cancelEditBtn').classList.add('hidden');
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    
    const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
    const adminData = adminDoc.exists() ? adminDoc.data() : {};
    const adminName = adminData.adminName || user.email;
    const departmentName = adminData.departmentName || adminData.department || 'Information Unit';
    document.getElementById('departmentName').textContent = departmentName;
    document.title = `${departmentName}: Event CRUD`;
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