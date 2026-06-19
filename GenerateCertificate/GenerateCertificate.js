import { showAlert } from '../PopupSystem.js';

let eventData = null;
let attendees = [];

document.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('certEventData');
  if (!stored) {
    showAlert('No event data found. Please generate from Event CRUD.', { type: 'warning' });
    window.location.href = '../EventCRUD/EventCRUD.html';
    return;
  }

  eventData = JSON.parse(stored);
  attendees = eventData.attendees || [];
  document.getElementById('eventInfo').textContent = `Event: ${eventData.event.title || ''}`;

  if (attendees.length === 0) {
    document.getElementById('certificatesGrid').innerHTML = '<p class="text-green-200/60 text-center py-8 liquid-panel p-6 rounded-xl">No attendees found.</p>';
    return;
  }

  const grid = document.getElementById('certificatesGrid');
  attendees.forEach((attendee, index) => {
    const certDiv = document.createElement('div');
    certDiv.className = 'liquid-panel p-8 border border-green-400/30';
    certDiv.id = `cert-${index}`;
    certDiv.innerHTML = `
      <div class="text-center mb-6">
        <p class="text-lg font-bold text-green-100/90 uppercase tracking-wide">${escapeHtml(eventData.event.department || 'Information Unit')}</p>
        <h2 class="text-3xl font-bold text-green-100 mt-2">Certificate of Attendance</h2>
        <div class="w-24 h-1 bg-green-400 mx-auto mt-3 rounded-full"></div>
      </div>
      <div class="text-center space-y-4">
        <p class="text-green-200/70">This is to certify that</p>
        <p class="text-2xl font-bold text-green-200">${escapeHtml(attendee.fullName || '')}</p>
        <p class="text-green-200/70">has attended the event</p>
        <p class="text-xl font-semibold text-green-100">${escapeHtml(eventData.event.title || '')}</p>
        <div class="pt-4 space-y-2 text-sm text-green-200/80">
          <p><strong>Course:</strong> ${escapeHtml(attendee.course || '')}</p>
          <p><strong>Role:</strong> ${escapeHtml(attendee.role || '')}</p>
          <p><strong>Date:</strong> ${attendee.dateAttended || ''}</p>
        </div>
        <div class="pt-6">
          <p class="text-sm text-green-200/60">Certificate ID: <strong class="text-green-200">${escapeHtml(attendee.certificateId || '')}</strong></p>
        </div>
      </div>
    `;
    grid.appendChild(certDiv);
  });

  document.getElementById('printAllBtn').addEventListener('click', () => window.print());
  
  document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function exportToExcel() {
  if (!eventData || attendees.length === 0) {
    showAlert('No data to export', { type: 'warning' });
    return;
  }

  try {
    const workbook = ExcelJS.Workbook ? new ExcelJS.Workbook() : new ExcelJS.xlsx.Workbook();
    workbook.creator = 'Information Unit';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Certificates');
    ws.columns = [
      { header: 'Attendee Name', key: 'fullName', width: 28 },
      { header: 'Course', key: 'course', width: 20 },
      { header: 'Role', key: 'role', width: 18 },
      { header: 'Date Attended', key: 'dateAttended', width: 18 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Certificate ID', key: 'certificateId', width: 18 }
    ];

    attendees.forEach((a, i) => {
      const row = ws.getRow(i + 1);
      row.height = 18;
      row.values = [
        a.fullName || '',
        a.course || '',
        a.role || '',
        a.dateAttended || '',
        a.status || '',
        a.certificateId || ''
      ];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(eventData.event.title || 'event').replace(/\s+/g, '_')}_certificates.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting certificates:', error);
    showAlert('Failed to export certificates', { type: 'error' });
  }
}

// Print styles - hide everything except certificate cards
const style = document.createElement('style');
style.textContent = `
  @media print {
    body * { visibility: hidden !important; }
    #certificatesGrid, #certificatesGrid * { visibility: visible !important; }
    #certificatesGrid { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; }
    #certificatesGrid > div { break-inside: avoid; page-break-inside: avoid; margin-bottom: 20px; }
    header, #exportExcelBtn { display: none !important; }
  }
`;
document.head.appendChild(style);