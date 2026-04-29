import { getRemainingSeconds } from '../src/timer.js';

function formatCountdown(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

async function render() {
  const countdownEl = document.getElementById('countdown');
  const statusEl = document.getElementById('status');
  const breakActiveEl = document.getElementById('break-active');

  const state = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TIMER_STATE' }, resolve);
  });

  if (state?.isBreakActive) {
    statusEl.classList.add('hidden');
    breakActiveEl.classList.remove('hidden');
  } else {
    const remaining = await getRemainingSeconds();
    countdownEl.textContent = formatCountdown(remaining);
    statusEl.classList.remove('hidden');
    breakActiveEl.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  render();

  document.getElementById('settingsLink').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Refresh every second while popup is open
  setInterval(render, 1000);
});

// Expose for testing
if (typeof module !== 'undefined') {
  module.exports = { formatCountdown };
}
