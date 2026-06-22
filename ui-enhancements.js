const pageMeta = [
  {
    match: (path) => path.endsWith('/logIn/LogInAdmin.html'),
    title: 'College Admin Login',
    subtitle: 'Certificate Verification System',
    links: [
      { label: 'Sign Up', href: '../SignUp/SignUpAdmin.html' },
      { label: 'System Admin Login', href: 'LogInSuperAdmin.html' }
    ]
  },
  {
    match: (path) => path.endsWith('/logIn/LogInSuperAdmin.html'),
    title: 'System Admin Login',
    subtitle: 'Certificate Verification System',
    links: [
      { label: 'College Admin Login', href: 'LogInAdmin.html' },
      { label: 'System Admin Sign Up', href: '../SignUp/SignUpSuperAdmin.html' }
    ]
  },
  {
    match: (path) => path.endsWith('/SignUp/SignUpAdmin.html'),
    title: 'College Admin Sign Up',
    subtitle: 'Request access for your organization',
    links: [
      { label: 'College Admin Login', href: '../logIn/LogInAdmin.html' },
      { label: 'System Admin Login', href: '../logIn/LogInSuperAdmin.html' }
    ]
  },
  {
    match: (path) => path.endsWith('/SignUp/SignUpSuperAdmin.html'),
    title: 'System Admin Sign Up',
    subtitle: 'Restricted administrator registration',
    links: [
      { label: 'System Admin Login', href: '../logIn/LogInSuperAdmin.html' },
      { label: 'College Admin Login', href: '../logIn/LogInAdmin.html' }
    ]
  },
  {
    match: (path) => path.endsWith('/CreateAdmin.html'),
    title: 'Create System Admin',
    subtitle: 'Restricted setup',
    links: [{ label: 'Back to Login', href: 'logIn/LogInSuperAdmin.html' }]
  },
  {
    match: (path) => path.endsWith('/EventCRUD/EventCRUD.html'),
    title: 'Event Management',
    subtitle: 'Create, manage, and report events'
  },
  {
    match: (path) => path.endsWith('/AttendeeManagement/AttendeeManagement.html'),
    title: 'Attendee Management',
    subtitle: 'Manage event attendance records'
  },
  {
    match: (path) => path.endsWith('/SuperAdminDashboard/SuperAdminDashboard.html'),
    title: 'Super Admin Dashboard',
    subtitle: 'Manage college admin approvals',
    links: [{ label: 'Logout', href: '../logIn/LogInSuperAdmin.html' }]
  }
];

function getPath() {
  return window.location.pathname.replace(/\\/g, '/');
}

function getMeta() {
  const path = getPath();
  return pageMeta.find((item) => item.match(path)) || {
    title: 'Certificate Verification System',
    subtitle: 'Information Unit',
    links: []
  };
}

function createHeader(meta) {
  const header = document.createElement('header');
  header.className = 'app-header';

  const inner = document.createElement('div');
  inner.className = 'app-header__inner';

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = getHomeHref();

  const mark = document.createElement('span');
  mark.className = 'brand-mark';
  mark.textContent = 'CV';

  const brandText = document.createElement('span');
  brandText.className = 'brand-text';

  const title = document.createElement('span');
  title.className = 'brand-title';
  title.textContent = meta.title;

  const subtitle = document.createElement('span');
  subtitle.className = 'brand-subtitle';
  subtitle.textContent = meta.subtitle;

  brandText.append(title, subtitle);
  brand.append(mark, brandText);

  const actions = document.createElement('div');
  actions.className = 'app-header__actions';
  meta.links.forEach((link) => {
    const action = document.createElement('a');
    action.className = 'header-link';
    action.href = link.href;
    action.textContent = link.label;
    actions.appendChild(action);
  });

  inner.append(brand, actions);
  header.appendChild(inner);
  return header;
}

function getHomeHref() {
  return '#';
}

function ensureHeader() {
  const existing = document.querySelector('body > header, .max-w-4xl.mx-auto > header, .glass.w-full > header');
  if (existing) {
    existing.classList.add('app-header');
    ensureHeaderInner(existing);
    moveHeaderBeforeContent(existing);
    enhanceHeaderLinks(existing);
    return;
  }

  document.body.prepend(createHeader(getMeta()));
}

function ensureHeaderInner(header) {
  let inner = header.querySelector(':scope > .app-header__inner');
  if (inner) return inner;

  inner = document.createElement('div');
  inner.className = 'app-header__inner';
  Array.from(header.childNodes).forEach((node) => inner.appendChild(node));
  header.appendChild(inner);
  return inner;
}

function moveHeaderBeforeContent(header) {
  const parent = header.parentElement;
  if (!parent || parent === document.body) return;

  if (parent.classList.contains('page-content') || parent.matches('.max-w-4xl.mx-auto, .max-w-2xl.mx-auto')) {
    parent.classList.add('page-content');
    parent.insertBefore(header, parent.firstChild);
  }
}

function enhanceHeaderLinks(header) {
  const inner = header.querySelector(':scope > .app-header__inner');
  if (!inner) return;

  inner.querySelectorAll('a').forEach((link) => {
    if (!link.classList.contains('brand')) link.classList.add('header-link');
  });
}

function ensureContentContainer() {
  const candidates = [
    document.querySelector('.max-w-4xl.mx-auto'),
    document.querySelector('.max-w-2xl.mx-auto'),
    document.querySelector('body > .glass.w-full'),
    document.querySelector('body > .glass-strong.w-full')
  ];

  const container = candidates.find((element) => element && !element.classList.contains('app-header__inner'));
  if (container) container.classList.add('page-content');
}

function enhanceMenu() {
  const menuButton = document.getElementById('menuBtn');
  if (!menuButton) return;

  const wrapper = menuButton.closest('.relative');
  const header = document.querySelector('.app-header');
  if (!wrapper || !header) return;

  menuButton.classList.add('header-icon-button');

  let inner = header.querySelector(':scope > .app-header__inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'app-header__inner';
    header.appendChild(inner);
  }

  let actions = inner.querySelector('.app-header__actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'app-header__actions';
    inner.appendChild(actions);
  }

  actions.prepend(wrapper);
}

function enhanceControls() {
  document.querySelectorAll('input, select, textarea').forEach((control) => {
    if (!control.matches('[type="hidden"], [type="button"], [type="submit"], [type="checkbox"], [type="radio"]')) {
      control.classList.add('form-control');
    }
  });

  document.querySelectorAll('button').forEach((button) => {
    if (button.classList.contains('header-icon-button')) return;
    if (!button.className.trim()) button.classList.add('btn-primary');
  });

  document.querySelectorAll('.bg-white.rounded-2xl, .bg-white.rounded-xl, .bg-white.rounded-3xl, .glass, .glass-strong').forEach((card) => {
    if (!card.closest('.app-header')) card.classList.add('ui-card');
  });
}

function init() {
  ensureHeader();
  ensureContentContainer();
  enhanceMenu();
  enhanceControls();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
