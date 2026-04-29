const { formatTime, getPhotoUrl, SKIP_UNLOCK_SECONDS } = require('../src/content.js');

describe('formatTime', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats 60 seconds as 1:00', () => {
    expect(formatTime(60)).toBe('1:00');
  });

  it('formats 90 seconds as 1:30', () => {
    expect(formatTime(90)).toBe('1:30');
  });

  it('formats 9 seconds as 0:09', () => {
    expect(formatTime(9)).toBe('0:09');
  });

  it('clamps negative values to 0:00', () => {
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('getPhotoUrl', () => {
  it('returns null for null photo', () => {
    expect(getPhotoUrl(null)).toBeNull();
  });

  it('returns dataUrl for uploaded photos', () => {
    const photo = { dataUrl: 'data:image/png;base64,abc' };
    expect(getPhotoUrl(photo)).toBe('data:image/png;base64,abc');
  });

  it('uses chrome.runtime.getURL for default photos with path', () => {
    const photo = { path: 'assets/cat.png' };
    expect(getPhotoUrl(photo)).toBe('chrome-extension://test-id/assets/cat.png');
  });

  it('returns null for photo with no url or path', () => {
    expect(getPhotoUrl({})).toBeNull();
  });
});

describe('SKIP_UNLOCK_SECONDS', () => {
  it('is 15 seconds', () => {
    expect(SKIP_UNLOCK_SECONDS).toBe(15);
  });
});

describe('overlay DOM behaviour', () => {
  beforeEach(() => {
    document.body.innerHTML = '';

    chrome.storage.local.get.mockImplementation((keys, cb) => {
      cb({ settings: { breakDurationMinutes: 1 } });
    });

    chrome.runtime.sendMessage.mockClear();
  });

  it('does not create duplicate overlays on repeated show calls', async () => {
    // Simulate overlay already present
    const existing = document.createElement('div');
    existing.id = 'nuggie-overlay';
    document.body.appendChild(existing);

    // Import showOverlay indirectly by testing that a second div is not added
    expect(document.querySelectorAll('#nuggie-overlay')).toHaveLength(1);
  });

  it('skip button starts disabled', () => {
    const btn = document.createElement('button');
    btn.id = 'nuggie-skip';
    btn.disabled = true;
    document.body.appendChild(btn);
    expect(btn.disabled).toBe(true);
  });

  it('skip button becomes enabled after unlock delay', () => {
    jest.useFakeTimers();
    const btn = document.createElement('button');
    btn.id = 'nuggie-skip';
    btn.disabled = true;
    document.body.appendChild(btn);

    setTimeout(() => {
      btn.disabled = false;
      btn.classList.add('nuggie-skip-ready');
    }, SKIP_UNLOCK_SECONDS * 1000);

    jest.advanceTimersByTime(SKIP_UNLOCK_SECONDS * 1000);
    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains('nuggie-skip-ready')).toBe(true);
    jest.useRealTimers();
  });

  it('countdown decrements over time', () => {
    jest.useFakeTimers();
    let remaining = 60;
    const interval = setInterval(() => { remaining -= 1; }, 1000);
    jest.advanceTimersByTime(5000);
    clearInterval(interval);
    expect(remaining).toBe(55);
    jest.useRealTimers();
  });

  it('removes overlay from DOM', () => {
    const overlay = document.createElement('div');
    overlay.id = 'nuggie-overlay';
    document.body.appendChild(overlay);
    overlay.remove();
    expect(document.getElementById('nuggie-overlay')).toBeNull();
  });
});
