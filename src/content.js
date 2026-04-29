const OVERLAY_ID = 'nuggie-overlay';
const SKIP_UNLOCK_SECONDS = 15;
const CSS_ID = 'nuggie-styles';

function ensureStyles() {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.id = CSS_ID;
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('src/overlay.css');
  document.head.appendChild(link);
}

let overlayState = null; // { countdownInterval, skipTimeout }

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SHOW_OVERLAY') {
    showOverlay(message.photo, message.remainingSeconds ?? null);
  }
  if (message.type === 'HIDE_OVERLAY') {
    removeOverlay();
  }
});

function getBreakDurationSeconds() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      resolve((settings.breakDurationMinutes || 1) * 60);
    });
  });
}

function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.dataUrl) return photo.dataUrl;
  if (photo.path) return chrome.runtime.getURL(photo.path);
  return null;
}

async function showOverlay(photo, remainingSeconds = null) {
  if (document.getElementById(OVERLAY_ID)) return;
  ensureStyles();

  const breakDurationSeconds = remainingSeconds ?? await getBreakDurationSeconds();
  const photoUrl = getPhotoUrl(photo);
  const fromRight = Math.random() < 0.5;
  const side = fromRight ? 'right' : 'left';

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <div id="nuggie-cat" class="nuggie-cat nuggie-cat-${side}">
      ${photoUrl ? `<img src="${photoUrl}" alt="Your cat" />` : '<div class="nuggie-cat-placeholder">🐱</div>'}
    </div>
    <div id="nuggie-message">
      <p>Time for a break!</p>
      <div id="nuggie-timer">${formatTime(breakDurationSeconds)}</div>
      <button id="nuggie-skip">Skip</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Trigger walk-in animation after paint
  requestAnimationFrame(() => {
    const cat = overlay.querySelector('#nuggie-cat');
    if (cat) cat.classList.add(`nuggie-walk-in-${side}`);
  });

  let remaining = breakDurationSeconds;
  const timerEl = overlay.querySelector('#nuggie-timer');
  const skipBtn = overlay.querySelector('#nuggie-skip');

  const skipTimeout = setTimeout(() => {
    if (skipBtn) skipBtn.classList.add('nuggie-skip-ready');
  }, SKIP_UNLOCK_SECONDS * 1000);

  const countdownInterval = setInterval(() => {
    remaining -= 1;
    if (timerEl) timerEl.textContent = formatTime(remaining);
    if (remaining <= 0) {
      clearInterval(countdownInterval);
      dismissOverlay(overlay, side);
    }
  }, 1000);

  const doSkip = () => {
    if (!skipBtn.classList.contains('nuggie-skip-ready')) return;
    clearInterval(countdownInterval);
    clearTimeout(skipTimeout);
    document.removeEventListener('keydown', onKeyDown);
    dismissOverlay(overlay, side);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') doSkip();
  };

  document.addEventListener('keydown', onKeyDown);
  skipBtn.addEventListener('click', doSkip);

  overlayState = { countdownInterval, skipTimeout, onKeyDown };
}

function dismissOverlay(overlay, side) {
  const cat = overlay.querySelector('#nuggie-cat');
  if (cat) {
    cat.classList.remove(`nuggie-walk-in-${side}`);
    cat.classList.add(`nuggie-scurry-${side}`);
  }

  setTimeout(() => {
    removeOverlay();
    try { chrome.runtime.sendMessage({ type: 'BREAK_DISMISSED' }); } catch { /* extension reloaded */ }
  }, 400);
}

function removeOverlay() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) existing.remove();
  if (overlayState) {
    clearInterval(overlayState.countdownInterval);
    clearTimeout(overlayState.skipTimeout);
    if (overlayState.onKeyDown) document.removeEventListener('keydown', overlayState.onKeyDown);
    overlayState = null;
  }
}

function formatTime(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Expose for testing
if (typeof module !== 'undefined') {
  module.exports = { formatTime, getPhotoUrl, SKIP_UNLOCK_SECONDS };
}
