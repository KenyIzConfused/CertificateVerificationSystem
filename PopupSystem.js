let popupContainer = null;

function injectStyles() {
    if (document.head) {
        const style = document.createElement('style');
        style.textContent = `
/* Popup styles matching app theme */
.liquid-popup {
    background: rgba(22, 163, 74, 0.12);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(34, 197, 94, 0.25);
    border-radius: 1.25rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.btn-popup-primary {
    background: linear-gradient(145deg, #34d399, #22c55e, #16a34a);
    border: none;
    border-radius: 0.5rem;
    color: white;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 
        0 3px 0 #16a34a,
        0 6px 12px rgba(34, 197, 94, 0.25);
}

.btn-popup-primary:hover {
    transform: translateY(-1px);
    box-shadow: 
        0 4px 0 #16a34a,
        0 8px 15px rgba(34, 197, 94, 0.35);
}

.btn-popup-secondary {
    background: rgba(22, 163, 74, 0.15);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 0.5rem;
    color: #e0f2fe;
    font-weight: 500;
    transition: all 0.2s ease;
}

.btn-popup-secondary:hover {
    background: rgba(22, 163, 74, 0.25);
    transform: translateY(-1px);
}

.btn-popup-danger {
    background: rgba(239, 68, 68, 0.9);
    border: none;
    border-radius: 0.5rem;
    color: white;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 3px 0 #dc2626;
}
`;
        document.head.appendChild(style);
    }
}

if (document.head) {
    injectStyles();
} else {
    document.addEventListener('DOMContentLoaded', injectStyles);
}

function ensurePopupContainer() {
  if (!popupContainer) {
    popupContainer = document.createElement('div');
    popupContainer.id = 'popup-container';
    popupContainer.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
    popupContainer.style.display = 'none';
    document.body.appendChild(popupContainer);
  }
  return popupContainer;
}

function createIcon(type) {
  const icons = {
    success: '<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
    error: '<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m4 0h-8m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
    warning: '<svg class="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
    info: '<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
    confirm: '<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
  };
  return icons[type] || icons.info;
}

function showPopup(options) {
  const { type = 'info', title, message, buttons = [], autoClose = false, duration = 3000 } = options;
  ensurePopupContainer();

  const overlay = document.createElement('div');
  overlay.className = 'absolute inset-0 bg-black bg-opacity-50 backdrop-blur-md';
  overlay.style.opacity = '0';

  const popup = document.createElement('div');
  popup.style.opacity = '0';
  popup.className = 'liquid-popup max-w-sm w-full p-6 transform transition-all scale-95 mx-auto';
  popup.innerHTML = `
    <div class="flex items-start gap-4">
      <div class="flex-shrink-0">${createIcon(type)}</div>
      <div class="flex-1">
        ${title ? `<h3 class="text-lg font-semibold text-green-100 mb-1">${title}</h3>` : ''}
        ${message ? `<p class="text-green-200/80">${message}</p>` : ''}
      </div>
    </div>
    <div class="flex gap-3 mt-6 ${buttons.length === 1 ? 'justify-end' : 'justify-center'}">
      ${buttons.map((btn, i) => `
        <button data-index="${i}" class="${btn.primary ? 'btn-popup-primary' : btn.danger ? 'btn-popup-danger' : 'btn-popup-secondary'} px-4 py-2 rounded-lg transition-all font-medium">
          ${btn.text}
        </button>
      `).join('')}
    </div>
  `;

  popupContainer.appendChild(overlay);
  popupContainer.appendChild(popup);
  popupContainer.style.display = 'block';

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    popup.style.transform = 'scale(1)';
    popup.style.opacity = '1';
  });

  const closePopup = () => {
    overlay.style.opacity = '0';
    popup.style.transform = 'scale(0.95)';
    popup.style.opacity = '0';
    setTimeout(() => {
      popupContainer.removeChild(popup);
      popupContainer.removeChild(overlay);
      if (popupContainer.children.length === 0) {
        popupContainer.style.display = 'none';
      }
    }, 200);
  };

  if (autoClose) {
    setTimeout(closePopup, duration);
  }

  return new Promise(resolve => {
    const buttonHandlers = popup.querySelectorAll('button');
    buttonHandlers.forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        closePopup();
        resolve(index);
      });
    });
  });
}

export function showAlert(message, options = {}) {
  return showPopup({
    type: options.type || 'info',
    title: options.title || '',
    message: message,
    buttons: [{ text: 'OK', primary: true }],
    autoClose: options.autoClose || false
  });
}

export function showConfirm(message, options = {}) {
  return showPopup({
    type: 'confirm',
    title: options.title || 'Confirm',
    message: message,
    buttons: [
      { text: 'Cancel', primary: false },
      { text: options.confirmText || 'Confirm', primary: true, danger: options.danger || false }
    ]
  });
}

export function showToast(message, type = 'success', duration = 3000) {
  showPopup({
    type: type,
    title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Info',
    message: message,
    buttons: [],
    autoClose: true,
    duration: duration
  });
}

window.showAlert = showAlert;
window.showConfirm = showConfirm;