const STORAGE_KEY = 'catPhotos';
const INDEX_KEY = 'photoIndex';
const ORDER_KEY = 'photoOrder';
const DEFAULTS_VERSION_KEY = 'defaultPhotosVersion';
const DEFAULTS_VERSION = 3; // bump when DEFAULT_PHOTO_PATHS changes

const DEFAULT_PHOTO_PATHS = [
  'assets/IMG_6976.PNG',
  'assets/IMG_6977.PNG',
  'assets/IMG_6978.PNG',
  'assets/IMG_6979.PNG',
  'assets/IMG_6980.PNG',
  'assets/IMG_6981.PNG',
  'assets/IMG_6982.PNG',
  'assets/IMG_6988.PNG',
  'assets/IMG_6989.PNG',
  'assets/IMG_6990.PNG',
  'assets/IMG_6991.PNG',
  'assets/IMG_6992.PNG',
];

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

async function getPhotos() {
  const result = await getStorage([STORAGE_KEY]);
  return result[STORAGE_KEY] || [];
}

async function addPhoto(base64DataUrl) {
  const photos = await getPhotos();
  const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  photos.push({ id, dataUrl: base64DataUrl, isDefault: false });
  await setStorage({ [STORAGE_KEY]: photos });
  return id;
}

async function removePhoto(id) {
  const photos = await getPhotos();
  const filtered = photos.filter((p) => p.id !== id);
  await setStorage({ [STORAGE_KEY]: filtered });
}

async function getOrder() {
  const result = await getStorage([ORDER_KEY]);
  return result[ORDER_KEY] || 'random';
}

async function setOrder(order) {
  await setStorage({ [ORDER_KEY]: order });
}

async function getNextPhoto() {
  const photos = await getPhotos();
  if (photos.length === 0) return null;

  const order = await getOrder();

  if (order === 'sequential') {
    const result = await getStorage([INDEX_KEY]);
    const currentIndex = result[INDEX_KEY] || 0;
    const photo = photos[currentIndex % photos.length];
    await setStorage({ [INDEX_KEY]: (currentIndex + 1) % photos.length });
    return photo;
  }

  // random
  const idx = Math.floor(Math.random() * photos.length);
  return photos[idx];
}

async function initDefaultPhotos() {
  const result = await getStorage([DEFAULTS_VERSION_KEY, STORAGE_KEY]);
  const storedVersion = result[DEFAULTS_VERSION_KEY] || 0;

  if (storedVersion >= DEFAULTS_VERSION) return;

  // Keep any user-uploaded photos, replace only default ones
  const existing = result[STORAGE_KEY] || [];
  const userPhotos = existing.filter((p) => !p.isDefault);
  const defaults = DEFAULT_PHOTO_PATHS.map((path, i) => ({
    id: `default_${i}`,
    path,
    isDefault: true,
  }));
  await setStorage({
    [STORAGE_KEY]: [...defaults, ...userPhotos],
    [DEFAULTS_VERSION_KEY]: DEFAULTS_VERSION,
  });
}

export {
  getPhotos,
  addPhoto,
  removePhoto,
  getOrder,
  setOrder,
  getNextPhoto,
  initDefaultPhotos,
};
