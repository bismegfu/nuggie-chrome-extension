import {
  getPhotos,
  addPhoto,
  removePhoto,
  getOrder,
  setOrder,
} from '../src/photoManager.js';
import { getSettings, saveSettings } from '../src/timer.js';

async function loadSettings() {
  const [settings, order] = await Promise.all([getSettings(), getOrder()]);

  document.getElementById('workInterval').value = settings.workIntervalMinutes;
  document.getElementById('breakDuration').value = settings.breakDurationMinutes;
  document.getElementById('instantSkip').checked = settings.instantSkip ?? false;

  const orderRadios = document.querySelectorAll('input[name="photoOrder"]');
  orderRadios.forEach((radio) => {
    radio.checked = radio.value === order;
  });
}

async function renderPhotoGrid() {
  const photos = await getPhotos();
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = '';

  photos.forEach((photo) => {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    thumb.dataset.id = photo.id;

    const img = document.createElement('img');
    if (photo.dataUrl) {
      img.src = photo.dataUrl;
    } else if (photo.path) {
      img.src = chrome.runtime.getURL(photo.path);
    }
    img.alt = 'Cat photo';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'photo-delete';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', 'Remove photo');
    deleteBtn.addEventListener('click', async () => {
      await removePhoto(photo.id);
      thumb.remove();
    });

    thumb.appendChild(img);
    thumb.appendChild(deleteBtn);
    grid.appendChild(thumb);
  });
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function handleSave() {
  const workInterval = parseInt(document.getElementById('workInterval').value, 10);
  const breakDuration = parseInt(document.getElementById('breakDuration').value, 10);
  const selectedOrder = document.querySelector('input[name="photoOrder"]:checked')?.value || 'random';
  const instantSkip = document.getElementById('instantSkip').checked;

  if (!Number.isInteger(workInterval) || workInterval < 1) return;
  if (!Number.isInteger(breakDuration) || breakDuration < 1) return;

  await Promise.all([
    saveSettings({ workIntervalMinutes: workInterval, breakDurationMinutes: breakDuration, instantSkip }),
    setOrder(selectedOrder),
  ]);

  const status = document.getElementById('saveStatus');
  status.textContent = 'Saved!';
  status.classList.add('visible');
  setTimeout(() => status.classList.remove('visible'), 2000);
}

async function handlePhotoUpload(event) {
  const files = Array.from(event.target.files);
  await Promise.all(
    files.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            await addPhoto(e.target.result);
            resolve();
          };
          reader.readAsDataURL(file);
        })
    )
  );
  await renderPhotoGrid();
  event.target.value = '';
}

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadSettings(), renderPhotoGrid()]);

  const debouncedSave = debounce(handleSave, 400);

  document.getElementById('workInterval').addEventListener('input', debouncedSave);
  document.getElementById('breakDuration').addEventListener('input', debouncedSave);
  document.getElementById('instantSkip').addEventListener('change', handleSave);
  document.querySelectorAll('input[name="photoOrder"]').forEach((radio) => {
    radio.addEventListener('change', handleSave);
  });

  document.getElementById('photoUpload').addEventListener('change', handlePhotoUpload);
});

// Expose for testing
if (typeof module !== 'undefined') {
  module.exports = { loadSettings, renderPhotoGrid, handleSave };
}
