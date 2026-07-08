let popupContainer = null;
let loadingOverlay = null;

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

function ensureLoadingOverlay() {
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'app-loading-overlay';
    loadingOverlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm';
    loadingOverlay.style.display = 'none';
    loadingOverlay.innerHTML = `
      <div class="flex flex-col items-center gap-4">
        <div class="relative">
          <div class="w-12 h-12 border-[3px] border-green-100 rounded-full"></div>
          <div class="absolute inset-0 w-12 h-12 border-[3px] border-transparent border-t-green-600 border-r-green-600 rounded-full animate-spin"></div>
        </div>
        <p class="text-gray-700 font-semibold text-base tracking-wide">Loading, please wait...</p>
      </div>
    `;
    document.body.appendChild(loadingOverlay);
  }
  return loadingOverlay;
}

function hideLoadingIfCaller(callerId) {
  if (loadingOverlay && loadingOverlay.dataset.caller === callerId) {
    loadingOverlay.style.display = 'none';
    loadingOverlay.dataset.caller = '';
  }
}

function createIcon(type) {
  const configs = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      color: 'text-green-600',
      path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      color: 'text-red-600',
      path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m4 0h-8m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      color: 'text-amber-600',
      path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      color: 'text-blue-600',
      path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    },
    confirm: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      color: 'text-green-600',
      path: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
    }
  };

  const cfg = configs[type] || configs.info;

  return `
    <div class="flex-shrink-0 w-12 h-12 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center">
      <svg class="w-6 h-6 ${cfg.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${cfg.path}
      </svg>
    </div>
  `;
}

function getPopupTypeStyles(type) {
  const styles = {
    success: 'border-l-4 border-green-500',
    error: 'border-l-4 border-red-500',
    warning: 'border-l-4 border-amber-500',
    info: 'border-l-4 border-blue-500',
    confirm: 'border-l-4 border-green-500'
  };
  return styles[type] || styles.info;
}

function getButtonStyles(btn, index, total) {
  if (btn.danger) {
    return 'bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm hover:shadow-md';
  }
  if (btn.primary) {
    if (index === 0 && total > 1) {
      return 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md';
    }
    return 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg hover:shadow-xl';
  }
  return 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md';
}

function showPopup(options) {
  const { type = 'info', title, message, buttons = [], autoClose = false, duration = 3000 } = options;
  ensurePopupContainer();

  const overlay = document.createElement('div');
  overlay.className = 'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300';
  overlay.style.opacity = '0';

  const popup = document.createElement('div');
  popup.style.opacity = '0';
  popup.style.transform = 'translate(-50%, -50%) scale(0.92)';
  popup.className = `bg-white rounded-2xl shadow-2xl max-w-sm w-full p-0 transform transition-all duration-300 ease-out fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden ${getPopupTypeStyles(type)}`;

  const headerContent = title ? `<h3 class="text-xl font-bold text-gray-900 leading-snug">${title}</h3>` : '';
  const messageContent = message ? `<p class="text-base text-gray-600 leading-relaxed mt-1">${message}</p>` : '';

  popup.innerHTML = `
    <div class="p-6 pb-4">
      <div class="flex items-start gap-3.5">
        ${createIcon(type)}
        <div class="flex-1 min-w-0 pt-0.5">
          ${headerContent}
          ${messageContent}
        </div>
      </div>
    </div>
    ${buttons.length > 0 ? `
      <div class="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex gap-2.5 ${buttons.length === 1 ? 'justify-end' : 'justify-center'}">
        ${buttons.map((btn, i) => `
          <button data-index="${i}" class="${getButtonStyles(btn, i, buttons.length)} px-6 py-3 rounded-xl text-base font-semibold transition-all duration-200 active:scale-95">
            ${btn.text}
          </button>
        `).join('')}
      </div>
    ` : ''}
    ${autoClose ? `
      <div class="h-1 bg-gray-100">
        <div class="h-full bg-green-500 origin-left" style="animation: shrink ${duration}ms linear forwards"></div>
      </div>
    ` : ''}
  `;

  if (autoClose) {
    if (!document.getElementById('popup-styles')) {
      const style = document.createElement('style');
      style.id = 'popup-styles';
      style.textContent = `
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  popupContainer.appendChild(overlay);
  popupContainer.appendChild(popup);
  popupContainer.style.display = 'block';

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    popup.style.opacity = '1';
    popup.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  const closePopup = () => {
    overlay.style.opacity = '0';
    popup.style.opacity = '0';
    popup.style.transform = 'translate(-50%, -48%) scale(0.95)';
    setTimeout(() => {
      if (popupContainer.contains(popup)) popupContainer.removeChild(popup);
      if (popupContainer.contains(overlay)) popupContainer.removeChild(overlay);
      if (popupContainer.children.length === 0) {
        popupContainer.style.display = 'none';
      }
    }, 250);
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

export function showLoading(callerId = 'default') {
  const overlay = ensureLoadingOverlay();
  overlay.dataset.caller = callerId;
  overlay.style.display = 'flex';
}

export function hideLoading(callerId = 'default') {
  hideLoadingIfCaller(callerId);
}

window.showAlert = showAlert;
window.showConfirm = showConfirm;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
