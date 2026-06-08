import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

document.getElementById('addAttendeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentEvent) {
    alert('Event not found');
    return;
  }
  
  const attendeeName = document.getElementById('attendeeName').value;
  const course = document.getElementById('course').value;
  const role = document.getElementById('role').value;
  const dateAttended = document.getElementById('dateAttended').value;
  
  try {
    const certificateUuid = generateUUID();
    
    await addDoc(collection(db, 'Certificates'), {
      eventId: currentEventId,
      eventTitle: currentEvent.title,
      fullName: attendeeName,
      course: course,
      role: role,
      dateAttended: dateAttended,
      status: 'active',
      uuid: certificateUuid,
      createdAt: serverTimestamp()
    });
    
    console.log('Attendee added successfully');
    document.getElementById('addAttendeeForm').reset();
  } catch (error) {
    console.error('Error adding attendee:', error);
    alert('Failed to add attendee');
  }
});

function renderAttendees(attendeesList) {
  const attendeesTableBody = document.getElementById('attendeesTableBody');
  const attendeeCount = document.getElementById('attendeeCount');
  const noAttendees = document.getElementById('noAttendees');
  
  console.log('Rendering attendees, count:', attendeesList.length);
  attendeeCount.textContent = attendeesList.length;
  
  if (attendeesList.length === 0) {
    noAttendees.style.display = 'block';
    attendeesTableBody.innerHTML = '';
    return;
  }
  
  noAttendees.style.display = 'none';
  
  attendeesTableBody.innerHTML = attendeesList.map(attendee => `
    <tr class="border-b border-gray-100 hover:bg-green-50 transition-colors">
      <td class="py-4 px-4">
        <span class="font-medium text-gray-800">${escapeHtml(attendee.fullName)}</span>
      </td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.course)}</td>
      <td class="py-4 px-4 text-gray-600">${escapeHtml(attendee.role)}</td>
      <td class="py-4 px-4 text-gray-600">${attendee.dateAttended}</td>
      <td class="py-4 px-4">
        <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${attendee.status === 'active' ? 'bg-green-100 text-green-800' : attendee.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}">
          ${attendee.status.toUpperCase()}
        </span>
      </td>
      <td class="py-4 px-4">
        <div class="flex gap-2">
          ${attendee.status === 'active' ? `
            <button onclick="window.markCompleted('${attendee.id}')" 
              class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm">
              Complete
            </button>
            <button onclick="window.markAbsent('${attendee.id}')" 
              class="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm">
              Absent
            </button>
          ` : ''}
          <button onclick="window.deleteAttendee('${attendee.id}')" 
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  console.log('Table rows updated');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.markCompleted = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Certificates', attendeeId), {
      status: 'completed'
    });
    console.log('Marked as completed');
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update status');
  }
};

window.markAbsent = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Certificates', attendeeId), {
      status: 'absent'
    });
    console.log('Marked as absent');
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update status');
  }
};

window.deleteAttendee = async (attendeeId) => {
  if (!confirm('Are you sure you want to delete this attendee?')) return;
  
  try {
    await deleteDoc(doc(db, 'Certificates', attendeeId));
    console.log('Attendee deleted');
  } catch (error) {
    console.error('Error deleting attendee:', error);
    alert('Failed to delete attendee');
  }
};

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
      alert('Event not found');
      window.location.href = '../EventCRUD/EventCRUD.html';
      return;
    }
    
    currentEvent = { id: eventDoc.id, ...eventDoc.data() };
    document.getElementById('eventInfo').textContent = `Event: ${currentEvent.title}`;
    
    console.log('Setting up listener for eventId:', currentEventId);
    const q = query(collection(db, 'Certificates'), where('eventId', '==', currentEventId));
    onSnapshot(q, (snapshot) => {
      console.log('Snapshot received, docs:', snapshot.size);
      const attendeesList = [];
      snapshot.forEach((docSnap) => {
        attendeesList.push({ id: docSnap.id, ...docSnap.data() });
      });
      renderAttendees(attendeesList);
    });
    
  } catch (error) {
    console.error('Error loading event:', error);
    window.location.href = '../EventCRUD/EventCRUD.html';
  }
});