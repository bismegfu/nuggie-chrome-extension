import {
  getSettings,
  saveSettings,
  getTimerState,
  tickActiveSecond,
  resetTimer,
  getRemainingSeconds,
  DEFAULT_SETTINGS,
} from '../src/timer.js';

const mockStorage = {};

beforeEach(() => {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);

  chrome.storage.local.get.mockImplementation((keys, cb) => {
    const result = {};
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((k) => {
      if (k in mockStorage) result[k] = mockStorage[k];
    });
    cb(result);
  });

  chrome.storage.local.set.mockImplementation((items, cb) => {
    Object.assign(mockStorage, items);
    cb && cb();
  });
});

describe('getSettings', () => {
  it('returns defaults when nothing is stored', async () => {
    const settings = await getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored settings over defaults', async () => {
    await saveSettings({ workIntervalMinutes: 30 });
    const settings = await getSettings();
    expect(settings.workIntervalMinutes).toBe(30);
    expect(settings.breakDurationMinutes).toBe(DEFAULT_SETTINGS.breakDurationMinutes);
  });

  it('defaults instantSkip to false', async () => {
    const settings = await getSettings();
    expect(settings.instantSkip).toBe(false);
  });

  it('persists instantSkip: true', async () => {
    await saveSettings({ instantSkip: true });
    const settings = await getSettings();
    expect(settings.instantSkip).toBe(true);
  });
});

describe('getTimerState', () => {
  it('returns default state when nothing stored', async () => {
    const state = await getTimerState();
    expect(state.elapsedSeconds).toBe(0);
    expect(state.isBreakActive).toBe(false);
  });
});

describe('tickActiveSecond', () => {
  it('increments elapsed time by 1 second', async () => {
    await tickActiveSecond();
    const state = await getTimerState();
    expect(state.elapsedSeconds).toBe(1);
  });

  it('does not tick when break is active', async () => {
    mockStorage['timerState'] = { elapsedSeconds: 10, isBreakActive: true };
    await tickActiveSecond();
    const state = await getTimerState();
    expect(state.elapsedSeconds).toBe(10);
  });

  it('triggers break when threshold is reached', async () => {
    await saveSettings({ workIntervalMinutes: 1 }); // 60 seconds
    mockStorage['timerState'] = { elapsedSeconds: 59, isBreakActive: false };
    const { triggered } = await tickActiveSecond();
    expect(triggered).toBe(true);
  });

  it('resets elapsed to 0 when break triggers', async () => {
    await saveSettings({ workIntervalMinutes: 1 });
    mockStorage['timerState'] = { elapsedSeconds: 59, isBreakActive: false };
    await tickActiveSecond();
    const state = await getTimerState();
    expect(state.elapsedSeconds).toBe(0);
    expect(state.isBreakActive).toBe(true);
  });

  it('does not trigger before threshold', async () => {
    await saveSettings({ workIntervalMinutes: 1 });
    mockStorage['timerState'] = { elapsedSeconds: 58, isBreakActive: false };
    const { triggered } = await tickActiveSecond();
    expect(triggered).toBe(false);
  });
});

describe('resetTimer', () => {
  it('resets elapsed to 0 and clears break active flag', async () => {
    mockStorage['timerState'] = { elapsedSeconds: 500, isBreakActive: true };
    await resetTimer();
    const state = await getTimerState();
    expect(state.elapsedSeconds).toBe(0);
    expect(state.isBreakActive).toBe(false);
  });
});

describe('getRemainingSeconds', () => {
  it('returns full interval when no time elapsed', async () => {
    await saveSettings({ workIntervalMinutes: 60 });
    expect(await getRemainingSeconds()).toBe(3600);
  });

  it('returns correct remaining time', async () => {
    await saveSettings({ workIntervalMinutes: 1 });
    mockStorage['timerState'] = { elapsedSeconds: 30, isBreakActive: false };
    expect(await getRemainingSeconds()).toBe(30);
  });

  it('returns 0 when elapsed exceeds threshold', async () => {
    await saveSettings({ workIntervalMinutes: 1 });
    mockStorage['timerState'] = { elapsedSeconds: 999, isBreakActive: false };
    expect(await getRemainingSeconds()).toBe(0);
  });
});
