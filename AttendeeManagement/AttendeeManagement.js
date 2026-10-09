import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc, updateDoc, getDoc, getDocs, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { showAlert, showToast, showConfirm, setButtonLoading, registerSession, startSessionEnforcement, stopSessionEnforcement } from '../PopupSystem.js';
import { requireAdmin } from '../FirebaseAdmin.js';

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
}

function loadTheme() {
  const savedTheme = localStorage.getItem('selectedTheme');
  if (savedTheme && themes[savedTheme]) {
    applyTheme(savedTheme);
  }
}

loadTheme();

const firebaseConfig = {
    apiKey: "AIzaSyDG0BxXk1LbmmsABIYtw2SgN4guroV8nFc",
    authDomain: "ipprc-certificate-verification.firebaseapp.com",
    projectId: "ipprc-certificate-verification",
    storageBucket: "ipprc-certificate-verification.firebasestorage.app",
    messagingSenderId: "1056133117009",
    appId: "1:1056133117009:web:a1fcd175977a76d27c7470",
    measurementId: "G-R7PDE8B834"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentEventId = null;
let currentEvent = null;
let allAttendees = [];
let filteredAttendees = [];
let attendeesPage = 1;
const ATTENDEES_PER_PAGE = 5;

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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addAttendeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = document.querySelector('#addAttendeeForm button[type="submit"]');
  if (submitBtn.disabled) return;
  
  if (!currentEvent) {
    showAlert('Event not found', { type: 'error' });
    return;
  }
  
  if (currentEvent.status === 'closed') {
    showAlert('This event is closed. Attendees can no longer be added.', { type: 'error' });
    return;
  }
  
  const attendeeName = document.getElementById('attendeeName').value;
  const course = document.getElementById('course').value;
  const role = document.getElementById('role').value;
  const attendeeEmail = document.getElementById('attendeeEmail').value.trim();
  const dateAttended = getTodayDateString();

  console.log('Adding attendee:', { attendeeName, course, role, attendeeEmail, dateAttended, eventId: currentEventId });
  setButtonLoading(submitBtn, true, 'Adding...');

  try {
    const certificateId = await generateUniqueCertificateId(allAttendees);
    const attendeeData = {
      fullName: attendeeName,
      course: course,
      role: role,
      dateAttended: dateAttended,
      email: attendeeEmail,
      certificateId: certificateId
    };
    console.log('Writing to Firestore:', attendeeData);
    const docRef = await addDoc(collection(db, 'Events', currentEventId, 'Attendees'), attendeeData);
    console.log('Attendee added successfully with ID:', docRef.id);
    
    // Verify the data was written by fetching it back
    const verifyDoc = await getDoc(docRef);
    console.log('Verification - document exists:', verifyDoc.exists(), 'data:', verifyDoc.data());
    
    // Also fetch all attendees to verify
    const allDocs = await getDocs(collection(db, 'Events', currentEventId, 'Attendees'));
    console.log('Total attendees in Firestore after add:', allDocs.size);
    allDocs.forEach(d => console.log('  -', d.id, d.data()));

    document.getElementById('addAttendeeForm').reset();
    showToast('Attendee added successfully!');
    await loadAttendees();
  } catch (error) {
    console.error('Error adding attendee:', error);
    showAlert('Failed to add attendee: ' + error.message, { type: 'error' });
} finally {
    setButtonLoading(submitBtn, false);
  }
});
});

function renderAttendees(attendeesList, searchTerm = '') {
  allAttendees = attendeesList;
  const term = (searchTerm || document.getElementById('attendeesSearch')?.value || '').trim();
  if (!term) {
    filteredAttendees = allAttendees.slice();
  } else {
    filteredAttendees = filterAttendees(allAttendees, term);
  }
  if (attendeesPage > totalPagesAttendees()) attendeesPage = 1;
  renderAttendeePage();
}

function totalPagesAttendees() {
  return Math.max(1, Math.ceil(filteredAttendees.length / ATTENDEES_PER_PAGE));
}

function renderAttendeePage() {
  const tableBody = document.getElementById('attendeesTableBody');
  const noAttendees = document.getElementById('noAttendees');
  const pagination = document.getElementById('attendeesPagination');
  const pageInfo = document.getElementById('attendeesPageInfo');
  const countEl = document.getElementById('attendeeCount');

  if (countEl) countEl.textContent = allAttendees.length;

  if (filteredAttendees.length === 0) {
    noAttendees?.classList.remove('hidden');
    noAttendees.textContent = allAttendees.length === 0 ? 'No attendees yet.' : 'No attendees match your search.';
    tableBody.innerHTML = '';
    pagination?.classList.add('hidden');
    return;
  }

  noAttendees?.classList.add('hidden');
  const start = (attendeesPage - 1) * ATTENDEES_PER_PAGE;
  const pageRows = filteredAttendees.slice(start, start + ATTENDEES_PER_PAGE).map(renderAttendeeRow).join('');
  tableBody.innerHTML = pageRows;

  const total = totalPagesAttendees();
  pagination?.classList.remove('hidden');
  if (pageInfo) pageInfo.textContent = `Page ${attendeesPage} of ${total}  •  ${filteredAttendees.length} attendee${filteredAttendees.length === 1 ? '' : 's'}`;

  const prevBtn = document.getElementById('attendeesPrevBtn');
  const nextBtn = document.getElementById('attendeesNextBtn');
  if (prevBtn) {
    prevBtn.disabled = attendeesPage === 1;
    prevBtn.classList.toggle('opacity-40', attendeesPage === 1);
    prevBtn.classList.toggle('cursor-not-allowed', attendeesPage === 1);
    prevBtn.classList.toggle('pointer-events-none', attendeesPage === 1);
  }
  if (nextBtn) {
    nextBtn.disabled = attendeesPage === total;
    nextBtn.classList.toggle('opacity-40', attendeesPage === total);
    nextBtn.classList.toggle('cursor-not-allowed', attendeesPage === total);
    nextBtn.classList.toggle('pointer-events-none', attendeesPage === total);
  }
}

window.changeAttendeePage = (dir) => {
  const total = totalPagesAttendees();
  let next = attendeesPage + dir;
  if (next < 1) next = 1;
  if (next > total) next = total;
  attendeesPage = next;
  renderAttendeePage();
  document.getElementById('attendeesTableBody').scrollIntoView({ behavior: 'smooth' });
};

async function loadAttendees() {
  if (!currentEventId) return;
  console.log('Reloading attendees for eventId:', currentEventId);
  try {
    const attendeesSnap = await getDocs(collection(db, 'Events', currentEventId, 'Attendees'));
    allAttendees = [];
    attendeesSnap.forEach((docSnap) => {
      allAttendees.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderAttendees(allAttendees, document.getElementById('attendeesSearch')?.value || '');
  } catch (error) {
    console.error('Error reloading attendees:', error);
  }
}

function filterAttendees(attendeesList, searchTerm) {
  if (!searchTerm) return attendeesList;
  const term = searchTerm.toLowerCase();
  return attendeesList.filter(a =>
    (a.fullName || '').toLowerCase().includes(term) ||
    (a.course || '').toLowerCase().includes(term) ||
    (a.role || '').toLowerCase().includes(term) ||
    (a.dateAttended || '').toLowerCase().includes(term) ||
    ((a.status || '') + '').toLowerCase().includes(term) ||
    (a.certificateId || '').toLowerCase().includes(term)
  );
}

function renderAttendeeRow(attendee) {
  let statusClass = 'bg-gray-400/30 text-gray-200';
  let statusLabel = 'PENDING';
  const isStatusMarked = !!attendee.status;

  if (attendee.status === 'present') {
    statusClass = 'bg-green-400/30 text-green-200';
    statusLabel = 'PRESENT';
  } else if (attendee.status === 'late') {
    statusClass = 'bg-orange-400/30 text-orange-200';
    statusLabel = 'LATE';
  } else if (attendee.status === 'absent') {
    statusClass = 'bg-red-400/30 text-red-200';
    statusLabel = 'ABSENT';
  }

  const statusButtons = isStatusMarked ? '' : `
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
    `;

  return `
      <tr class="border-b border-green-400/20 hover:bg-white/10 transition-colors">
        <td class="py-4 px-2">
          <span class="font-medium text-green-100">${escapeHtml(attendee.fullName)}</span>
        </td>
        <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.course)}</td>
        <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.role)}</td>
        <td class="py-4 px-2 text-green-200/80">${escapeHtml(attendee.email || '')}</td>
        <td class="py-4 px-2 text-green-200/80">${attendee.dateAttended}</td>
        <td class="py-4 px-2">
          <span class="inline-block px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
            ${statusLabel}
          </span>
        </td>
        <td class="py-4 px-2">
          <span class="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-400/30 text-blue-200">
            ${escapeHtml(attendee.certificateId || '')}
          </span>
        </td>
        <td class="py-4 px-2">
          <div class="flex gap-1 flex-wrap">
            ${statusButtons}
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
    `;
}

window.markPresent = async (attendeeId) => {
  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      status: 'present'
    });
    showToast('Attendee marked as present');
    await loadAttendees();
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
    showToast('Attendee marked as absent');
    await loadAttendees();
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
    showToast('Attendee marked as late');
    await loadAttendees();
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
  document.getElementById('editEmail').value = attendee.email || '';
  document.getElementById('editDateAttended').value = attendee.dateAttended || '';
  document.getElementById('editStatus').value = attendee.status || '';

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

  const editSubmitBtn = document.querySelector('#editAttendeeForm button[type="submit"]');
  const attendeeId = document.getElementById('editAttendeeId').value;
  const fullName = document.getElementById('editName').value;
  const course = document.getElementById('editCourse').value;
  const role = document.getElementById('editRole').value;
  const email = document.getElementById('editEmail').value;
  const status = document.getElementById('editStatus').value;
  
  setButtonLoading(editSubmitBtn, true, 'Updating...');

  try {
    await updateDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId), {
      fullName,
      course,
      role,
      email,
      status
    });
    console.log('Attendee updated');
    window.closeEditModal();
    showToast('Attendee updated');
    await loadAttendees();
  } catch (error) {
    console.error('Error updating attendee:', error);
    showAlert('Failed to update attendee', { type: 'error' });
  } finally {
    setButtonLoading(editSubmitBtn, false);
  }
});

window.deleteAttendee = async (attendeeId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this attendee?');
    if (confirmed !== 1) return;

    try {
        await deleteDoc(doc(db, 'Events', currentEventId, 'Attendees', attendeeId));
        showToast('Attendee deleted');
        await loadAttendees();
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

function getCellValue(values, colIndex) {
  if (!colIndex || colIndex >= values.length) return '';
  const val = values[colIndex];
  if (val === undefined || val === null) return '';
  return val.toString().trim();
}

function parseImportDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return val.toString().trim();
}

async function generateUniqueCertificateIdForBatch(baseList, usedIds) {
  let id = generateShortId();
  let attempts = 0;
  const maxAttempts = 50;
  while ((baseList.some(a => a.certificateId === id) || usedIds.has(id)) && attempts < maxAttempts) {
    id = generateShortId();
    attempts++;
  }
  return id;
}

async function parseAttendeesFromSheet(file) {
  const workbook = new ExcelJS.Workbook();
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    await workbook.csv.load(file);
  } else {
    await workbook.xlsx.load(file);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    showAlert('No worksheet found in the file.', { type: 'error' });
    return null;
  }

  const rowCount = worksheet.rowCount;
  const rows = worksheet.getRows(2, rowCount - 1);
  if (!rows || rows.length === 0) {
    showAlert('The sheet contains no data rows.', { type: 'error' });
    return null;
  }

  const headerValues = worksheet.getRow(1).values;
  const columnIndex = {};
  headerValues.forEach((val, idx) => {
    if (idx === 0 || !val) return;
    const header = val.toString().toLowerCase().trim();
    if (header.includes('name') || header.includes('attendee')) {
      columnIndex.fullName = idx;
    } else if (header.includes('email') || header.includes('mail')) {
      columnIndex.email = idx;
    } else if (header.includes('course')) {
      columnIndex.course = idx;
    } else if (header.includes('role')) {
      columnIndex.role = idx;
    } else if (header.includes('date')) {
      columnIndex.dateAttended = idx;
    } else if (header.includes('status')) {
      columnIndex.status = idx;
    } else if (header.includes('cert')) {
      columnIndex.certificateId = idx;
    }
  });

  if (!columnIndex.fullName) {
    showAlert('Could not detect an attendee "Name" column. Expected headers such as "Full Name" or "Attendee Name".', { type: 'error' });
    return null;
  }

  const usedIds = new Set(allAttendees.map(a => a.certificateId).filter(Boolean));
  const attendeesToImport = [];

  rows.forEach((row) => {
    if (!row) return;
    const values = row.values;
    const allEmpty = values.slice(1).every(v => v === undefined || v === null || (typeof v === 'string' && v.trim() === ''));
    if (allEmpty) return;

    const fullName = getCellValue(values, columnIndex.fullName);
    if (!fullName) return;

    let certificateId = getCellValue(values, columnIndex.certificateId);
    if (!certificateId) {
      certificateId = generateShortId();
    }
    while ((allAttendees.some(a => a.certificateId === certificateId) || usedIds.has(certificateId))) {
      certificateId = generateShortId();
    }
    usedIds.add(certificateId);

    const statusRaw = columnIndex.status ? getCellValue(values, columnIndex.status) : '';
    let status = '';
    if (statusRaw) {
      const s = statusRaw.toLowerCase();
      if (s === 'present' || s === 'absent' || s === 'late') status = s;
    }

    const dateValue = columnIndex.dateAttended ? values[columnIndex.dateAttended] : undefined;
    const dateAttended = parseImportDate(dateValue) || getTodayDateString();

    const attendee = {
      fullName: fullName,
      course: getCellValue(values, columnIndex.course),
      role: getCellValue(values, columnIndex.role),
      email: getCellValue(values, columnIndex.email),
      dateAttended: dateAttended,
      certificateId: certificateId
    };
    if (status) attendee.status = status;
    attendeesToImport.push(attendee);
  });

  if (attendeesToImport.length === 0) {
    showAlert('No valid attendee rows were found to import.', { type: 'warning' });
    return null;
  }

  return attendeesToImport;
}

document.addEventListener('DOMContentLoaded', () => {
  const importSheetInput = document.getElementById('importSheetInput');
  const importSheetBtn = document.getElementById('importSheetBtn');

  importSheetBtn.addEventListener('click', () => {
  importSheetInput.value = '';
  importSheetInput.click();
});

importSheetInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls', 'xlsb', 'csv'].includes(ext)) {
    showAlert('Unsupported file type. Please upload an Excel (.xlsx/.xls/.xlsb) or CSV (.csv) file.', { type: 'error' });
    importSheetInput.value = '';
    return;
  }

   try {
    setButtonLoading(importSheetBtn, true, 'Reading file...');

    const attendeesToImport = await parseAttendeesFromSheet(file);
    if (!attendeesToImport) {
      setButtonLoading(importSheetBtn, false);
      return;
    }

    importSheetBtn.dataset.originalText = `<span class="spinner"></span>Loaded ${attendeesToImport.length} rows`;
    importSheetBtn.innerHTML = importSheetBtn.dataset.originalText;

    if (!currentEvent) {
      showAlert('No event is selected. Cannot import attendees.', { type: 'error' });
      setButtonLoading(importSheetBtn, false);
      return;
    }
    if (currentEvent.status === 'closed') {
      showAlert('This event is closed. Attendees can no longer be imported.', { type: 'error' });
      setButtonLoading(importSheetBtn, false);
      return;
    }

    const confirmed = await showConfirm(attendeesToImport.length + ' attendees found. Add them to the database?');
    if (confirmed !== 1) {
      setButtonLoading(importSheetBtn, false);
      importSheetInput.value = '';
      return;
    }

    const batch = writeBatch(db);
    attendeesToImport.forEach((attendee) => {
      const docRef = doc(collection(db, 'Events', currentEventId, 'Attendees'));
      batch.set(docRef, attendee);
    });
    await batch.commit();

    showToast(attendeesToImport.length + ' attendees imported successfully!');
    await loadAttendees();
  } catch (error) {
    console.error('Error importing sheet:', error);
    let msg = 'Failed to import sheet. Please try again.';
    if (error.message && (error.message.includes('Signature') || error.message.includes('Invalid'))) {
      msg = 'Invalid or unsupported Excel file. Please upload a valid .xlsx file.';
    }
    showAlert(msg, { type: 'error' });
  } finally {
    setButtonLoading(importSheetBtn, false);
    importSheetInput.value = '';
  }
});
});

document.getElementById('attendeesSearch').addEventListener('input', (e) => {
  attendeesPage = 1;
  renderAttendees(allAttendees, e.target.value);
});

const attendeesPrevBtn = document.getElementById('attendeesPrevBtn');
if (attendeesPrevBtn) attendeesPrevBtn.addEventListener('click', () => window.changeAttendeePage(-1));
const attendeesNextBtn = document.getElementById('attendeesNextBtn');
if (attendeesNextBtn) attendeesNextBtn.addEventListener('click', () => window.changeAttendeePage(1));

document.addEventListener('keydown', (e) => {
  const searchEl = document.getElementById('attendeesSearch');
  if (searchEl && document.activeElement === searchEl) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); window.changeAttendeePage(-1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); window.changeAttendeePage(1); }
});

onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed:', user ? 'logged in' : 'logged out');

  if (!user) {
    stopSessionEnforcement();
    window.location.href = '../logIn/LogInAdmin.html';
    return;
  }

  if (!(await requireAdmin())) {
    window.location.href = '../logIn/LogInAdmin.html';
    return;
  }

  // Load theme from Firestore if available
  const adminDoc = await getDoc(doc(db, 'Admin', user.uid));
  const adminData = adminDoc.exists() ? adminDoc.data() : {};
  if (adminData.selectedTheme) {
    applyTheme(adminData.selectedTheme);
  }

  await registerSession(user);
  startSessionEnforcement(user);

  // Re-read event ID after auth state is confirmed
  currentEventId = localStorage.getItem('currentEventId');

  if (!currentEventId) {
    console.log('No event ID found, redirecting...');
    window.location.href = '../EventCRUD/EventCRUD.html';
    return;
  }

try {
    const eventDoc = await getDoc(doc(db, 'Events', currentEventId));
    if (!eventDoc.exists()) {
      showAlert('Event not found', { type: 'error' });
      window.location.href = '../EventCRUD/EventCRUD.html';
      return;
    }

    if (eventDoc.data().adminId !== user.uid) {
      showAlert('Access denied: this event belongs to another admin.', { type: 'error' });
      window.location.href = '../EventCRUD/EventCRUD.html';
      return;
    }

    currentEvent = { id: eventDoc.id, ...eventDoc.data() };
    document.getElementById('eventInfo').textContent = `Event: ${currentEvent.title}`;

    console.log('Loading attendees for eventId:', currentEventId);
    try {
      const attendeesSnap = await getDocs(collection(db, 'Events', currentEventId, 'Attendees'));
      console.log('Attendees snapshot, docs:', attendeesSnap.size);
      allAttendees = [];
      attendeesSnap.forEach((docSnap) => {
        allAttendees.push({ id: docSnap.id, ...docSnap.data() });
      });
      console.log('All attendees loaded:', allAttendees);
      renderAttendees(allAttendees, document.getElementById('attendeesSearch')?.value || '');
    } catch (attendeeError) {
      console.error('Error loading attendees:', attendeeError);
      showAlert('Failed to load attendees: ' + attendeeError.message, { type: 'error' });
    }

  } catch (error) {
    console.error('Error loading event:', error);
    window.location.href = '../EventCRUD/EventCRUD.html';
  }
});
