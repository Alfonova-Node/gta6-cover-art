// Vice Cover Studio — wires the page: photos in, panels cropped by drag and zoom,
// layout / grade / lettering controls, and one-click PNG exports in the three
// common post sizes. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js).
import { drawCover, layoutPanels, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');

export const SIZES = {
  square: { label: '1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: '1080 x 1350', w: 1080, h: 1350 },
  wide: { label: '1920 x 1080', w: 1920, h: 1080 },
};

const state = {
  layout: 'hero',
  grade: 'sunset',
  size: 'square',
  title: 'Sunset Heist',
  subtitle: 'Vice City nights',
  titleSize: 1,
  titlePos: 'bottom',
  photos: [], // { name, img }
  panels: [], // { photoIndex, zoom, ox, oy } per panel of the current layout
  selected: 0,
};

function panelCount() {
  return layoutPanels(state.layout, 100, 100).length;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) state.panels.push({ photoIndex: state.photos.length ? 0 : -1, zoom: 1, ox: 0.5, oy: 0.5 });
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function redraw() {
  ensurePanels();
  const size = SIZES[state.size];
  const long = 900;
  const scale = long / Math.max(size.w, size.h);
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  drawCover(canvas, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    titleSize: state.titleSize,
    titlePos: state.titlePos,
    panels: state.panels,
    photos: state.photos.map((p) => p.img),
  });
  renderPanelList();
}

function renderPanelList() {
  const list = document.getElementById('panels');
  list.innerHTML = '';
  state.panels.forEach((panel, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-chip' + (i === state.selected ? ' selected' : '');
    const name = panel.photoIndex >= 0 ? state.photos[panel.photoIndex]?.name ?? `Photo ${panel.photoIndex + 1}` : 'Empty';
    btn.textContent = `Panel ${i + 1} · ${name}`;
    btn.addEventListener('click', () => { state.selected = i; syncPanelEditor(); redraw(); });
    list.appendChild(btn);
  });
}

function syncPanelEditor() {
  const panel = state.panels[state.selected];
  const sel = document.getElementById('panelPhoto');
  sel.innerHTML = '';
  const empty = document.createElement('option');
  empty.value = '-1';
  empty.textContent = 'Empty panel';
  sel.appendChild(empty);
  state.photos.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
  sel.value = String(panel?.photoIndex ?? -1);
  document.getElementById('zoom').value = String(panel?.zoom ?? 1);
  document.getElementById('zoomVal').textContent = `${Math.round((panel?.zoom ?? 1) * 100)}%`;
  document.getElementById('panelLabel').textContent = `Panel ${state.selected + 1} of ${state.panels.length} — click the preview or a chip to pick another`;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhotoFile(file) {
  const img = await loadImage(URL.createObjectURL(file));
  state.photos.push({ name: file.name.replace(/\.[^.]+$/, ''), img });
  state.panels.forEach((p) => { if (p.photoIndex < 0) p.photoIndex = state.photos.length - 1; });
  syncPanelEditor();
  redraw();
}

async function addSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  state.photos.push({ name, img });
  state.panels.forEach((p) => { if (p.photoIndex < 0) p.photoIndex = state.photos.length - 1; });
  syncPanelEditor();
  redraw();
}

/** Renders the cover at full export size and returns the canvas. */
export function renderExport(sizeKey) {
  const size = SIZES[sizeKey];
  const c = document.createElement('canvas');
  c.width = size.w;
  c.height = size.h;
  drawCover(c, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    titleSize: state.titleSize,
    titlePos: state.titlePos,
    panels: state.panels,
    photos: state.photos.map((p) => p.img),
  });
  return c;
}

function downloadCanvas(c, filename) {
  return new Promise((resolve) => {
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

async function exportOne(sizeKey) {
  const size = SIZES[sizeKey];
  await downloadCanvas(renderExport(sizeKey), `vice-cover-${size.w}x${size.h}.png`);
  status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
}

async function exportAll() {
  for (const key of Object.keys(SIZES)) {
    // eslint-disable-next-line no-await-in-loop
    await exportOne(key);
  }
  status.textContent = 'Saved all three sizes (1080x1080, 1080x1350, 1920x1080).';
}

// ---- control wiring -------------------------------------------------------

function buildButtons(containerId, entries, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  Object.entries(entries).forEach(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (key === current ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      onPick(key);
      box.querySelectorAll('.pick').forEach((el) => el.classList.remove('active'));
      b.classList.add('active');
    });
    box.appendChild(b);
  });
}

buildButtons('layouts', LAYOUTS, state.layout, (key) => { state.layout = key; redraw(); syncPanelEditor(); });
buildButtons('grades', GRADES, state.grade, (key) => { state.grade = key; redraw(); });
buildButtons('sizes', Object.fromEntries(Object.entries(SIZES).map(([k, v]) => [k, v.label])), state.size, (key) => { state.size = key; redraw(); });

document.getElementById('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    // eslint-disable-next-line no-await-in-loop
    await addPhotoFile(file);
  }
  status.textContent = `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} loaded — drag the preview to crop, scroll to zoom.`;
});
document.getElementById('sampleBoulevard').addEventListener('click', () => addSample('boulevard'));
document.getElementById('samplePier').addEventListener('click', () => addSample('pier'));
document.getElementById('fillAll').addEventListener('click', () => {
  const picked = state.panels[state.selected]?.photoIndex ?? -1;
  const idx = picked >= 0 ? picked : 0;
  state.panels.forEach((p) => { p.photoIndex = idx; });
  redraw();
  status.textContent = 'Every panel now uses the selected panel’s photo.';
});
document.getElementById('panelPhoto').addEventListener('change', (e) => {
  state.panels[state.selected].photoIndex = Number(e.target.value);
  redraw();
});
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  document.getElementById('zoomVal').textContent = `${Math.round(Number(e.target.value) * 100)}%`;
  redraw();
});
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
document.getElementById('titleSize').addEventListener('input', (e) => {
  state.titleSize = Number(e.target.value);
  redraw();
});
document.getElementById('titlePos').addEventListener('change', (e) => {
  state.titlePos = e.target.value;
  redraw();
});
document.getElementById('exportOne').addEventListener('click', () => exportOne(state.size));
document.getElementById('exportAll').addEventListener('click', exportAll);

// ---- drag to crop, wheel to zoom ------------------------------------------
let dragging = null;
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  const panels = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selected = i;
  syncPanelEditor();
  dragging = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const panel = state.panels[state.selected];
  if (!panel || panel.photoIndex < 0) return;
  const dx = (e.clientX - dragging.x) / rect.width;
  const dy = (e.clientY - dragging.y) / rect.height;
  dragging = { x: e.clientX, y: e.clientY };
  // Dragging the photo the opposite way feels like moving the picture itself.
  panel.ox = Math.min(1, Math.max(0, panel.ox - dx * 0.9));
  panel.oy = Math.min(1, Math.max(0, panel.oy - dy * 0.9));
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Math.min(3, Math.max(1, panel.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
  document.getElementById('zoom').value = String(panel.zoom);
  document.getElementById('zoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  redraw();
}, { passive: false });

// ---- shot scenes -----------------------------------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, { addSample, redraw, syncPanelEditor });
} else {
  syncPanelEditor();
  redraw();
}
