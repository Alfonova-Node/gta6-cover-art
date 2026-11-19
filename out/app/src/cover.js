// Vice Cover Studio — the cover renderer.
// Draws a multi-panel GTA-style poster cover onto a canvas: the photo(s) cropped
// into panels, a colour grade applied as a true gradient map (luminance -> a colour
// ramp, computed per pixel), and bold poster lettering on top. No Rockstar art,
// logo or font is used anywhere; the fonts are SIL OFL files under app/fonts/.

export const LAYOUTS = {
  hero: 'Hero + three',
  grid: 'Four-panel grid',
  full: 'Full bleed',
  nine: 'Nine-panel grid',
  snaps: 'Tilted snapshots',
};

export const GRADES = {
  sunset: 'Sunset',
  neon: 'Neon night',
  vice: 'Vice teal-pink',
  mono: 'High-contrast B&W',
};

// Colour ramps for the gradient map: [stop, r, g, b] from shadow to highlight.
const RAMPS = {
  sunset: [[0, 26, 11, 46], [0.35, 122, 32, 96], [0.65, 255, 122, 61], [1, 255, 233, 168]],
  neon: [[0, 8, 12, 48], [0.35, 90, 20, 110], [0.65, 255, 45, 149], [1, 125, 249, 255]],
  vice: [[0, 4, 38, 42], [0.35, 16, 110, 118], [0.65, 255, 93, 162], [1, 255, 243, 196]],
  mono: [[0, 8, 8, 10], [0.25, 52, 52, 56], [0.6, 168, 168, 172], [1, 248, 248, 250]],
};

const GRADE_KEEP = { sunset: 0.3, neon: 0.22, vice: 0.28, mono: 0.05 }; // how much original colour survives

/** Panel rectangles (fractions of the cover) for a layout, with optional rotation. */
export function layoutPanels(layout, w, h) {
  const r = (x, y, pw, ph, rot = 0) => ({ x: x * w, y: y * h, w: pw * w, h: ph * h, rot });
  switch (layout) {
    case 'grid': return [r(0, 0, 0.5, 0.5), r(0.5, 0, 0.5, 0.5), r(0, 0.5, 0.5, 0.5), r(0.5, 0.5, 0.5, 0.5)];
    case 'full': return [r(0, 0, 1, 1)];
    case 'nine': {
      const out = [];
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) out.push(r(col / 3, row / 3, 1 / 3, 1 / 3));
      return out;
    }
    case 'snaps': return [
      r(0.05, 0.07, 0.6, 0.52, -5),
      r(0.38, 0.3, 0.6, 0.52, 4),
      r(0.12, 0.62, 0.66, 0.32, -2),
    ];
    case 'hero':
    default: return [r(0, 0, 1, 0.6), r(0, 0.6, 0.34, 0.4), r(0.34, 0.6, 0.33, 0.4), r(0.67, 0.6, 0.33, 0.4)];
  }
}

function rampColor(ramp, t) {
  for (let i = 1; i < ramp.length; i++) {
    if (t <= ramp[i][0]) {
      const [t0, r0, g0, b0] = ramp[i - 1];
      const [t1, r1, g1, b1] = ramp[i];
      const f = (t - t0) / (t1 - t0 || 1);
      return [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f];
    }
  }
  const last = ramp[ramp.length - 1];
  return [last[1], last[2], last[3]];
}

const gradeCache = new Map();

/** Returns a canvas holding `img` graded by `grade` (gradient map, per pixel). */
export function gradedPhoto(img, grade) {
  const key = `${img.src}|${grade}`;
  const hit = gradeCache.get(key);
  if (hit) return hit;
  const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
  const cw = Math.max(2, Math.round(img.naturalWidth * scale));
  const ch = Math.max(2, Math.round(img.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, cw, ch);
  const data = ctx.getImageData(0, 0, cw, ch);
  const px = data.data;
  const ramp = RAMPS[grade] ?? RAMPS.sunset;
  const keep = GRADE_KEEP[grade] ?? 0.3;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    const [mr, mg, mb] = rampColor(ramp, lum);
    px[i] = mr + (px[i] - mr) * keep;
    px[i + 1] = mg + (px[i + 1] - mg) * keep;
    px[i + 2] = mb + (px[i + 2] - mb) * keep;
  }
  ctx.putImageData(data, 0, 0);
  gradeCache.set(key, c);
  return c;
}

/** Cover-crop source rectangle of `img` for a panel, from a panel's crop state. */
export function cropRect(img, panelW, panelH, crop) {
  const iw = img.naturalWidth || img.width; // canvas sources have .width, images .naturalWidth
  const ih = img.naturalHeight || img.height;
  const zoom = crop?.zoom ?? 1;
  const scale = Math.max(panelW / iw, panelH / ih) * zoom;
  const sw = panelW / scale;
  const sh = panelH / scale;
  const maxX = Math.max(0, iw - sw);
  const maxY = Math.max(0, ih - sh);
  const sx = maxX * (crop?.ox ?? 0.5);
  const sy = maxY * (crop?.oy ?? 0.5);
  return { sx, sy, sw, sh };
}

function drawPanel(ctx, panel, photo, crop, grade, gutter) {
  ctx.save();
  const cx = panel.x + panel.w / 2;
  const cy = panel.y + panel.h / 2;
  ctx.translate(cx, cy);
  if (panel.rot) ctx.rotate((panel.rot * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  const x = panel.x + gutter / 2;
  const y = panel.y + gutter / 2;
  const w = panel.w - gutter;
  const h = panel.h - gutter;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (photo) {
    const src = gradedPhoto(photo, grade);
    const { sx, sy, sw, sh } = cropRect(src, w, h, crop);
    ctx.drawImage(src, sx, sy, sw, sh, x, y, w, h);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3a2350');
    g.addColorStop(1, '#14101d');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 ${Math.max(14, w * 0.045)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', x + w / 2, y + h / 2);
  }
  // Vignette inside the panel so the grade feels photographic.
  const v = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = v;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // White polaroid-style frame for tilted snapshots.
  if (panel.rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((panel.rot * Math.PI) / 180);
    ctx.translate(-cx, -cy);
    ctx.strokeStyle = '#f5f0e6';
    ctx.lineWidth = Math.max(4, gutter * 1.4);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}

function drawSun(ctx, w, h, grade) {
  const cx = w * 0.78;
  const cy = h * 0.2;
  const r = Math.min(w, h) * 0.13;
  const sun = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  if (grade === 'neon') { sun.addColorStop(0, '#ffe9fb'); sun.addColorStop(0.55, '#ff2d95'); sun.addColorStop(1, 'rgba(255,45,149,0)'); }
  else if (grade === 'vice') { sun.addColorStop(0, '#fff3c4'); sun.addColorStop(0.55, '#ff5da2'); sun.addColorStop(1, 'rgba(255,93,162,0)'); }
  else if (grade === 'mono') { sun.addColorStop(0, '#ffffff'); sun.addColorStop(1, 'rgba(255,255,255,0)'); }
  else { sun.addColorStop(0, '#fff3c4'); sun.addColorStop(0.55, '#ff7a3d'); sun.addColorStop(1, 'rgba(255,122,61,0)'); }
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function fitFont(ctx, text, family, weight, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * Draws the whole cover.
 * state: { layout, grade, title, subtitle, titleSize (0.7-1.4), titlePos ('bottom'|'top'),
 *   panels: [{ photoIndex, zoom, ox, oy }], photos: [HTMLImageElement|null] }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const panels = layoutPanels(state.layout, w, h);
  const gutter = Math.max(4, Math.round(Math.min(w, h) * 0.012));
  // Backdrop: deep dusk gradient behind the panels.
  const bg = ctx.createLinearGradient(0, 0, w, h);
  if (state.grade === 'neon') { bg.addColorStop(0, '#12082e'); bg.addColorStop(1, '#2b0a3a'); }
  else if (state.grade === 'vice') { bg.addColorStop(0, '#04262b'); bg.addColorStop(1, '#3a0f33'); }
  else if (state.grade === 'mono') { bg.addColorStop(0, '#111'); bg.addColorStop(1, '#000'); }
  else { bg.addColorStop(0, '#2b1838'); bg.addColorStop(1, '#12081f'); }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (state.layout !== 'full') drawSun(ctx, w, h, state.grade);
  panels.forEach((panel, i) => {
    const crop = state.panels?.[i];
    const photo = crop && crop.photoIndex >= 0 ? state.photos?.[crop.photoIndex] : null;
    drawPanel(ctx, panel, photo ?? null, crop, state.grade, gutter);
  });
  // Outer frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(3, Math.round(Math.min(w, h) * 0.006));
  ctx.strokeRect(gutter / 2, gutter / 2, w - gutter, h - gutter);

  // Lettering band.
  const title = (state.title ?? '').trim().toUpperCase();
  const subtitle = (state.subtitle ?? '').trim();
  const bandH = h * 0.24;
  const bandY = state.titlePos === 'top' ? 0 : h - bandH;
  if (title || subtitle) {
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
    if (state.titlePos === 'top') { band.addColorStop(0, 'rgba(0,0,0,0.72)'); band.addColorStop(1, 'rgba(0,0,0,0)'); }
    else { band.addColorStop(0, 'rgba(0,0,0,0)'); band.addColorStop(1, 'rgba(0,0,0,0.78)'); }
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, w, bandH);
  }
  ctx.textAlign = 'center';
  const baseY = state.titlePos === 'top' ? h * 0.045 : h - h * 0.16;
  if (title) {
    const size = fitFont(ctx, title, '"Anton", "Arial Black", sans-serif', 400, h * 0.115 * (state.titleSize ?? 1), w * 0.92);
    ctx.font = `${size}px "Anton", "Arial Black", sans-serif`;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = '#12081f';
    ctx.shadowColor = 'rgba(255,45,149,0.55)';
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetY = size * 0.04;
    const y = state.titlePos === 'top' ? baseY + size : baseY + size * 0.4;
    ctx.strokeText(title, w / 2, y);
    ctx.fillStyle = state.grade === 'mono' ? '#ffffff' : '#fff6e8';
    ctx.fillText(title, w / 2, y);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
  if (subtitle) {
    const size = fitFont(ctx, subtitle, '"Pacifico", cursive', 400, h * 0.045 * (state.titleSize ?? 1), w * 0.86);
    ctx.font = `${size}px "Pacifico", cursive`;
    ctx.fillStyle = state.grade === 'neon' ? '#7df9ff' : '#ffd166';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = size * 0.25;
    const y = state.titlePos === 'top'
      ? baseY + h * 0.115 * (state.titleSize ?? 1) + size
      : h - h * 0.045;
    ctx.fillText(subtitle, w / 2, y);
    ctx.shadowBlur = 0;
  }
}
