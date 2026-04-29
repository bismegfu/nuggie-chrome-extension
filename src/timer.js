// Timer logic — pure module, no direct chrome API calls
// Background service worker wires chrome.alarms and chrome.idle to these functions

const SETTINGS_KEY = 'settings';
const TIMER_KEY = 'timerState';

const DEFAULT_SETTINGS = {
  workIntervalMinutes: 60,
  breakDurationMinutes: 1,
  photoOrder: 'random',
};

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function setStorage(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, resolve);
  });
}

async function getSettings() {
  const result = await getStorage([SETTINGS_KEY]);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
}

async function saveSettings(settings) {
  await setStorage({ [SETTINGS_KEY]: { ...DEFAULT_SETTINGS, ...settings } });
}

async function getTimerState() {
  const result = await getStorage([TIMER_KEY]);
  return result[TIMER_KEY] || { elapsedSeconds: 0, isBreakActive: false };
}

async function saveTimerState(state) {
  await setStorage({ [TIMER_KEY]: state });
}

async function tickActiveSecond(delta = 1) {
  const state = await getTimerState();
  if (state.isBreakActive) return { triggered: false, state };

  const settings = await getSettings();
  const thresholdSeconds = settings.workIntervalMinutes * 60;
  const newElapsed = state.elapsedSeconds + delta;

  if (newElapsed >= thresholdSeconds) {
    const newState = { elapsedSeconds: 0, isBreakActive: true, breakStartedAt: Date.now() };
    await saveTimerState(newState);
    return { triggered: true, state: newState };
  }

  const newState = { ...state, elapsedSeconds: newElapsed };
  await saveTimerState(newState);
  return { triggered: false, state: newState };
}

async function resetTimer() {
  const newState = { elapsedSeconds: 0, isBreakActive: false };
  await saveTimerState(newState);
  return newState;
}

async function getRemainingBreakSeconds() {
  const [state, settings] = await Promise.all([getTimerState(), getSettings()]);
  if (!state.isBreakActive || !state.breakStartedAt) return 0;
  const elapsed = Math.floor((Date.now() - state.breakStartedAt) / 1000);
  return Math.max(0, settings.breakDurationMinutes * 60 - elapsed);
}

async function getRemainingSeconds() {
  const [state, settings] = await Promise.all([getTimerState(), getSettings()]);
  const thresholdSeconds = settings.workIntervalMinutes * 60;
  return Math.max(0, thresholdSeconds - state.elapsedSeconds);
}

export {
  getSettings,
  saveSettings,
  getTimerState,
  saveTimerState,
  tickActiveSecond,
  resetTimer,
  getRemainingSeconds,
  getRemainingBreakSeconds,
  DEFAULT_SETTINGS,
};
