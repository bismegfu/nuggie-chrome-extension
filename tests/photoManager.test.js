import {
  getPhotos,
  addPhoto,
  removePhoto,
  getOrder,
  setOrder,
  getNextPhoto,
  initDefaultPhotos,
} from '../src/photoManager.js';

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

  chrome.storage.local.remove.mockImplementation((keys, cb) => {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((k) => delete mockStorage[k]);
    cb && cb();
  });
});

describe('getPhotos', () => {
  it('returns empty array when no photos stored', async () => {
    expect(await getPhotos()).toEqual([]);
  });

  it('returns stored photos', async () => {
    mockStorage['catPhotos'] = [{ id: 'a', dataUrl: 'data:image/png;base64,abc' }];
    expect(await getPhotos()).toHaveLength(1);
  });
});

describe('addPhoto', () => {
  it('adds a photo and returns an id', async () => {
    const id = await addPhoto('data:image/png;base64,abc123');
    expect(id).toBeTruthy();
    const photos = await getPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0].dataUrl).toBe('data:image/png;base64,abc123');
    expect(photos[0].isDefault).toBe(false);
  });

  it('appends to existing photos', async () => {
    await addPhoto('data:image/png;base64,aaa');
    await addPhoto('data:image/png;base64,bbb');
    expect(await getPhotos()).toHaveLength(2);
  });
});

describe('removePhoto', () => {
  it('removes photo by id', async () => {
    const id = await addPhoto('data:image/png;base64,abc');
    await removePhoto(id);
    expect(await getPhotos()).toHaveLength(0);
  });

  it('does not affect other photos', async () => {
    const id1 = await addPhoto('data:image/png;base64,aaa');
    await addPhoto('data:image/png;base64,bbb');
    await removePhoto(id1);
    const photos = await getPhotos();
    expect(photos).toHaveLength(1);
    expect(photos[0].dataUrl).toBe('data:image/png;base64,bbb');
  });

  it('does nothing if id does not exist', async () => {
    await addPhoto('data:image/png;base64,aaa');
    await removePhoto('nonexistent');
    expect(await getPhotos()).toHaveLength(1);
  });
});

describe('getOrder / setOrder', () => {
  it('defaults to random', async () => {
    expect(await getOrder()).toBe('random');
  });

  it('persists order setting', async () => {
    await setOrder('sequential');
    expect(await getOrder()).toBe('sequential');
  });
});

describe('getNextPhoto', () => {
  beforeEach(async () => {
    await addPhoto('data:image/png;base64,aaa');
    await addPhoto('data:image/png;base64,bbb');
    await addPhoto('data:image/png;base64,ccc');
  });

  it('returns null when no photos', async () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    expect(await getNextPhoto()).toBeNull();
  });

  it('random: returns a photo from the collection', async () => {
    await setOrder('random');
    const photo = await getNextPhoto();
    expect(photo).toBeTruthy();
    const photos = await getPhotos();
    expect(photos.some((p) => p.id === photo.id)).toBe(true);
  });

  it('sequential: cycles through photos in order', async () => {
    await setOrder('sequential');
    const photos = await getPhotos();
    const first = await getNextPhoto();
    const second = await getNextPhoto();
    const third = await getNextPhoto();
    expect(first.id).toBe(photos[0].id);
    expect(second.id).toBe(photos[1].id);
    expect(third.id).toBe(photos[2].id);
  });

  it('sequential: wraps around at end of collection', async () => {
    await setOrder('sequential');
    const photos = await getPhotos();
    await getNextPhoto();
    await getNextPhoto();
    await getNextPhoto();
    const wrapped = await getNextPhoto();
    expect(wrapped.id).toBe(photos[0].id);
  });
});

describe('initDefaultPhotos', () => {
  it('loads default photos when storage is empty', async () => {
    await initDefaultPhotos();
    const photos = await getPhotos();
    expect(photos).toHaveLength(7);
    expect(photos.every((p) => p.isDefault)).toBe(true);
  });

  it('preserves user-uploaded photos when reinitialising defaults', async () => {
    await addPhoto('data:image/png;base64,custom');
    await initDefaultPhotos();
    const photos = await getPhotos();
    // 7 defaults + 1 user photo
    expect(photos).toHaveLength(8);
    expect(photos.some((p) => !p.isDefault && p.dataUrl === 'data:image/png;base64,custom')).toBe(true);
    expect(photos.filter((p) => p.isDefault)).toHaveLength(7);
  });
});
