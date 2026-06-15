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
    document.getElementById('certificatesGrid').innerHTML = '<p class="text-gray-500 text-center py-8 col-span-2">No attendees found.</p>';
    return;
  }

  const grid = document.getElementById('certificatesGrid');
  attendees.forEach((attendee, index) => {
    const certDiv = document.createElement('div');
    certDiv.className = 'bg-white rounded-2xl shadow-xl p-8 border border-gray-200';
    certDiv.id = `cert-${index}`;
    certDiv.innerHTML = `
      <div class="text-center mb-6">
        <p class="text-lg font-bold text-gray-800 uppercase tracking-wide">${escapeHtml(eventData.event.department || '')}</p>
        <h2 class="text-3xl font-bold text-gray-800 mt-2">Certificate of Attendance</h2>
        <div class="w-24 h-1 bg-green-500 mx-auto mt-3"></div>
      </div>
      <div class="text-center space-y-4">
        <p class="text-gray-600">This is to certify that</p>
        <p class="text-2xl font-bold text-green-700">${escapeHtml(attendee.fullName || '')}</p>
        <p class="text-gray-600">has attended the event</p>
        <p class="text-xl font-semibold text-gray-800">${escapeHtml(eventData.event.title || '')}</p>
        <div class="pt-4 space-y-1 text-sm text-gray-600">
          <p><strong>Course:</strong> ${escapeHtml(attendee.course || '')}</p>
          <p><strong>Year:</strong> ${escapeHtml(attendee.year || '')} &nbsp; <strong>Section:</strong> ${escapeHtml(attendee.section || '')}</p>
          <p><strong>Major:</strong> ${escapeHtml(attendee.major || '')}</p>
          <p><strong>Role:</strong> ${escapeHtml(attendee.role || '')}</p>
          <p><strong>Session:</strong> ${attendee.session === 'morning' ? 'Morning' : 'Afternoon'}</p>
          <p><strong>Date:</strong> ${attendee.dateAttended || ''}</p>
        </div>
        <div class="pt-4">
          <p class="text-sm text-gray-500">Certificate ID: <strong>${escapeHtml(attendee.certificateId || '')}</strong></p>
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

  const morningAttendees = attendees.filter(a => a.session === 'morning');
  const afternoonAttendees = attendees.filter(a => a.session === 'afternoon');

  const headers = [
    'Attendee Name',
    'ID Number',
    'Course, Year, Section, Major',
    'Role',
    'Date Attended',
    'Session',
    'Status',
    'Certificate ID'
  ];

  const headerFillColor = 'FF92D050';
  const headerFontColor = 'FFFFFFFF';

  try {
    const workbook = ExcelJS.Workbook ? new ExcelJS.Workbook() : new ExcelJS.xlsx.Workbook();
    workbook.creator = 'Information Unit';
    workbook.created = new Date();

    const buildSheet = (sessionName, list) => {
      const ws = workbook.addWorksheet(sessionName);
      ws.columns = [
        { header: 'Attendee Name', key: 'fullName', width: 28 },
        { header: 'ID Number', key: 'idNumber', width: 18 },
        { header: 'Course, Year, Section, Major', key: 'academicInfo', width: 45 },
        { header: 'Role', key: 'role', width: 18 },
        { header: 'Date Attended', key: 'dateAttended', width: 18 },
        { header: 'Session', key: 'session', width: 14 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Certificate ID', key: 'certificateId', width: 18 }
      ];

      const hRow = ws.getRow(1);
      hRow.values = headers;
      hRow.alignment = { vertical: 'middle', horizontal: 'center' };
      hRow.font = { bold: true, color: { argb: headerFontColor } };
      hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFillColor } };
      hRow.height = 22;

      list.forEach((a, i) => {
        const row = ws.getRow(i + 2);
        row.height = 18;
        row.values = [
          a.fullName || '',
          a.idNumber || '',
          `${a.course || ''} ${a.year || ''} ${a.section || ''} ${a.major || ''}`.trim(),
          a.role || '',
          a.dateAttended || '',
          a.session === 'morning' ? 'Morning' : 'Afternoon',
          a.status || '',
          a.certificateId || ''
        ];
      });

      ws.views = [{ state: 'frozen', ySplit: 1 }];
    };

    buildSheet('Morning Session', morningAttendees);
    buildSheet('Afternoon Session', afternoonAttendees);

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
