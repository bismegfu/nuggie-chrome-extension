import { tickActiveSecond, resetTimer, getTimerState, getRemainingBreakSeconds } from './timer.js';
import { getNextPhoto, initDefaultPhotos } from './photoManager.js';

const TICK_ALARM = 'nuggie_tick';
const IDLE_THRESHOLD_SECONDS = 300; // 5 minutes

let isIdle = false;
let breakActiveTabIds = new Set();
let breakPhoto = null; // same photo shown across all tabs during a break

chrome.runtime.onInstalled.addListener(async () => {
  await initDefaultPhotos();
  await resetTimer(); // seeds startedAt on fresh install
});

// Init default photos on every startup in case storage was cleared
initDefaultPhotos();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== TICK_ALARM) return;
  if (isIdle) return;

  // Alarm fires every minute; advance timer by 60 seconds in one step
  const { triggered } = await tickActiveSecond(60);
  if (triggered) {
    await notifyActiveTab();
  }
});

chrome.idle.onStateChanged.addListener((state) => {
  isIdle = state === 'idle' || state === 'locked';
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const state = await getTimerState();
  if (!state.isBreakActive) return;
  const tab = await chrome.tabs.get(tabId);
  if (!isInjectableTab(tab)) return;
  breakActiveTabIds.add(tabId);
  await sendOverlayTrigger(tabId, breakPhoto);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  const state = await getTimerState();
  if (!state.isBreakActive) return;

  // Get the active tab in the newly focused window
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (!tab || !isInjectableTab(tab)) return;
  breakActiveTabIds.add(tab.id);
  await sendOverlayTrigger(tab.id, breakPhoto);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BREAK_DISMISSED') {
    handleBreakDismissed();
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_TIMER_STATE') {
    getTimerState().then((state) => sendResponse(state));
    return true; // async response
  }
});

async function notifyActiveTab() {
  breakPhoto = await getNextPhoto(); // pick photo once for the whole break

  // Prefer the active tab in the focused window
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && isInjectableTab(activeTab)) {
    breakActiveTabIds.add(activeTab.id);
    await sendOverlayTrigger(activeTab.id, breakPhoto);
    return;
  }

  // Fallback: find the most recently active injectable tab across all windows
  const allTabs = await chrome.tabs.query({ active: true });
  const injectableTab = allTabs.find(isInjectableTab);
  if (injectableTab) {
    breakActiveTabIds.add(injectableTab.id);
    await sendOverlayTrigger(injectableTab.id, breakPhoto);
  }
}

function isInjectableTab(tab) {
  return tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'));
}

async function sendOverlayTrigger(tabId, photo = null) {
  if (!photo) photo = await getNextPhoto();
  const remainingSeconds = await getRemainingBreakSeconds();

  // If break already expired by the time we switch tabs, just dismiss
  if (remainingSeconds <= 0) {
    await handleBreakDismissed();
    return;
  }

  const message = { type: 'SHOW_OVERLAY', photo, remainingSeconds };
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script not yet injected — inject it now
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/content.js'],
      });
      await chrome.tabs.sendMessage(tabId, message);
    } catch {
      // chrome:// or other restricted page — skip silently
    }
  }
}

async function handleBreakDismissed() {
  breakActiveTabIds.clear();
  breakPhoto = null;
  await resetTimer();
}

function startTicking() {
  chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);
  chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 }); // Chrome minimum is 1 minute
}

startTicking();
