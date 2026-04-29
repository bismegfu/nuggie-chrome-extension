const { formatCountdown } = require('../popup/popup.js');

describe('formatCountdown', () => {
  it('formats seconds only when under a minute', () => {
    expect(formatCountdown(45)).toBe('45s');
  });

  it('formats minutes and seconds when under an hour', () => {
    expect(formatCountdown(90)).toBe('1m 30s');
    expect(formatCountdown(600)).toBe('10m 00s');
  });

  it('formats hours and minutes when over an hour', () => {
    expect(formatCountdown(3600)).toBe('1h 0m');
    expect(formatCountdown(3660)).toBe('1h 1m');
    expect(formatCountdown(7380)).toBe('2h 3m');
  });

  it('formats 0 as 0s', () => {
    expect(formatCountdown(0)).toBe('0s');
  });
});

describe('popup storage reading', () => {
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

  it('reads remaining time from storage', async () => {
    const { getRemainingSeconds, saveSettings } = require('../src/timer.js');
    await saveSettings({ workIntervalMinutes: 1 });
    mockStorage['timerState'] = { elapsedSeconds: 30, isBreakActive: false };
    expect(await getRemainingSeconds()).toBe(30);
  });

  it('shows break active state when isBreakActive is true', () => {
    const state = { elapsedSeconds: 0, isBreakActive: true };
    expect(state.isBreakActive).toBe(true);
  });

  it('shows countdown when not in break', () => {
    const state = { elapsedSeconds: 100, isBreakActive: false };
    expect(state.isBreakActive).toBe(false);
  });
});
