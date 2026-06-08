import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

document.getElementById('createEventForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!currentUser) {
    alert('Please log in first');
    return;
  }
  
  const eventTitle = document.getElementById('eventTitle').value;
  const eventDescription = document.getElementById('eventDescription').value;
  const eventDate = document.getElementById('eventDate').value;
  const eventTime = document.getElementById('eventTime').value;
  const eventLocation = document.getElementById('eventLocation').value;
  
  try {
    await addDoc(collection(db, 'Events'), {
      adminId: currentUser.uid,
      title: eventTitle,
      description: eventDescription,
      date: eventDate,
      time: eventTime,
      location: eventLocation,
      status: 'active',
      createdAt: new Date()
    });
    
    alert('Event created successfully!');
    document.getElementById('createEventForm').reset();
    document.getElementById('createEventPanel').classList.add('hidden');
  } catch (error) {
    console.error('Error creating event:', error);
    alert('Failed to create event');
  }
});

document.getElementById('showCreateFormBtn').addEventListener('click', () => {
  document.getElementById('createEventPanel').classList.remove('hidden');
  document.getElementById('createEventPanel').scrollIntoView({ behavior: 'smooth' });
});

async function renderEvents(events) {
  const eventsStack = document.getElementById('eventsStack');
  const eventCount = document.getElementById('eventCount');
  const noEvents = document.getElementById('noEvents');
  
  eventCount.textContent = events.length;
  
  if (events.length === 0) {
    noEvents.style.display = 'block';
    return;
  }
  
  noEvents.style.display = 'none';
  
      events.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      eventsStack.innerHTML = events.map(event => `
    <div class="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-800">${escapeHtml(event.title)}</h3>
          <p class="text-gray-600 mt-1">${escapeHtml(event.description)}</p>
          <div class="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
            <span>📅 ${event.date}</span>
            <span>⏰ ${event.time}</span>
            <span>📍 ${escapeHtml(event.location)}</span>
          </div>
          <span class="inline-block mt-3 px-3 py-1 rounded-full text-xs font-medium ${event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
            ${event.status.toUpperCase()}
          </span>
        </div>
        <div class="flex gap-2 ml-4">
          <button onclick="window.manageAttendees('${event.id}')" 
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            Manage Attendees
          </button>
          <button onclick="window.closeEvent('${event.id}')" 
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Close Event
          </button>
          <button onclick="window.deleteEvent('${event.id}')" 
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.deleteEvent = async (eventId) => {
  if (!confirm('Are you sure you want to delete this event?')) return;
  
  try {
    await deleteDoc(doc(db, 'Events', eventId));
    alert('Event deleted');
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Failed to delete event');
  }
};

window.closeEvent = async (eventId) => {
  if (!confirm('Are you sure you want to close this event? This will mark it as completed.')) return;
  
  try {
    await updateDoc(doc(db, 'Events', eventId), {
      status: 'completed',
      closedAt: new Date()
    });
    alert('Event closed successfully');
  } catch (error) {
    console.error('Error closing event:', error);
    alert('Failed to close event');
  }
};

window.manageAttendees = (eventId) => {
  localStorage.setItem('currentEventId', eventId);
  window.location.href = '../AttendeeManagement/AttendeeManagement.html';
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    
    const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
    const adminName = adminDoc.exists() ? adminDoc.data().adminName : user.email;
    document.getElementById('adminName').textContent = `Admin: ${adminName}`;
    
    const q = query(collection(db, 'Events'), where('adminId', '==', user.uid));
    onSnapshot(q, (snapshot) => {
      const events = [];
      snapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });
      renderEvents(events);
    });
  } else {
    window.location.href = '../logIn/LogInAdmin.html';
  }
});