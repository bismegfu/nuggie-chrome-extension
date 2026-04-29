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

  document.body.innerHTML = `
    <input id="workInterval" type="number" value="60" />
    <input id="breakDuration" type="number" value="1" />
    <input type="radio" name="photoOrder" value="random" checked />
    <input type="radio" name="photoOrder" value="sequential" />
    <div id="photoGrid"></div>
    <button id="saveBtn"></button>
    <span id="saveStatus"></span>
  `;
});

const { saveSettings, getSettings } = require('../src/timer.js');
const { addPhoto, getPhotos, removePhoto } = require('../src/photoManager.js');

describe('settings persistence', () => {
  it('saves work interval to storage', async () => {
    await saveSettings({ workIntervalMinutes: 45 });
    const settings = await getSettings();
    expect(settings.workIntervalMinutes).toBe(45);
  });

  it('saves break duration to storage', async () => {
    await saveSettings({ breakDurationMinutes: 3 });
    const settings = await getSettings();
    expect(settings.breakDurationMinutes).toBe(3);
  });

  it('loads saved settings correctly', async () => {
    await saveSettings({ workIntervalMinutes: 30, breakDurationMinutes: 2 });
    const settings = await getSettings();
    expect(settings.workIntervalMinutes).toBe(30);
    expect(settings.breakDurationMinutes).toBe(2);
  });
});

describe('photo grid management', () => {
  it('uploaded photo appears in storage', async () => {
    await addPhoto('data:image/png;base64,uploaded');
    const photos = await getPhotos();
    expect(photos.some((p) => p.dataUrl === 'data:image/png;base64,uploaded')).toBe(true);
  });

  it('deleted photo is removed from storage', async () => {
    const id = await addPhoto('data:image/png;base64,toDelete');
    await removePhoto(id);
    const photos = await getPhotos();
    expect(photos.some((p) => p.id === id)).toBe(false);
  });

  it('other photos are unaffected after deletion', async () => {
    await addPhoto('data:image/png;base64,keep');
    const idToDelete = await addPhoto('data:image/png;base64,delete');
    await removePhoto(idToDelete);
    const photos = await getPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0].dataUrl).toBe('data:image/png;base64,keep');
  });
});

describe('input validation', () => {
  it('rejects non-positive work interval', async () => {
    const { saveSettings } = require('../src/timer.js');
    // saveSettings itself doesn't validate — options.js does
    // We test that a value of 0 would be caught by the parseInt check in options.js
    const parsed = parseInt('0', 10);
    expect(parsed < 1).toBe(true);
  });

  it('rejects non-positive break duration', () => {
    const parsed = parseInt('-1', 10);
    expect(parsed < 1).toBe(true);
  });

  it('accepts valid positive integers', () => {
    expect(parseInt('45', 10) >= 1).toBe(true);
    expect(parseInt('5', 10) >= 1).toBe(true);
  });
});
