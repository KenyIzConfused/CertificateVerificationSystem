export const MAJOR_OPTIONS = {
  BSCS: [
    { value: 'GD', label: 'GD (Game Development)' },
    { value: 'ROB', label: 'ROB (Robotics)' }
  ],
  BSIS: [
    { value: 'BA', label: 'BA (Business Analytics)' }
  ],
  BSIT: [
    { value: 'WMD', label: 'WMD (Web and Mobile Development)' },
    { value: 'NDM', label: 'NDM (Network Design and Management)' }
  ]
};

export const YEAR_OPTIONS = [
  { value: '1A', label: '1A' },
  { value: '1B', label: '1B' },
  { value: '1C', label: '1C' },
  { value: '1D', label: '1D' },
  { value: '2A', label: '2A' },
  { value: '2B', label: '2B' },
  { value: '2C', label: '2C' },
  { value: '2D', label: '2D' },
  { value: '3A', label: '3A' },
  { value: '3B', label: '3B' },
  { value: '3C', label: '3C' },
  { value: '3D', label: '3D' },
  { value: '4A', label: '4A' },
  { value: '4B', label: '4B' },
  { value: '4C', label: '4C' },
  { value: '4D', label: '4D' }
];

export function updateMajorOptions(courseSelectId, majorSelectId) {
  const courseSelect = document.getElementById(courseSelectId);
  const majorSelect = document.getElementById(majorSelectId);
  if (!courseSelect || !majorSelect) return;

  const update = () => {
    const majors = MAJOR_OPTIONS[courseSelect.value] || [];
    majorSelect.innerHTML = '<option value="">Select Major</option>' +
      majors.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
  };

  courseSelect.addEventListener('change', update);
  update();
}

export function populateYearOptions(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Select Year</option>' +
    YEAR_OPTIONS.map(y => `<option value="${y.value}">${y.label}</option>`).join('');
  if (current) select.value = current;
}
