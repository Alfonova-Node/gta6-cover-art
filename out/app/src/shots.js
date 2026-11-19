// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos;
// ?shot=cover shows the cover alone. Query params: photo (sample for panel 1),
// photo2 (sample for the other panels), caption (title), subtitle, layout, grade,
// size (square|portrait|wide). window.__shotReady is set once painted.
export async function runShot(shot, query, state, hooks) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  state.layout = query.get('layout') ?? 'hero';
  state.grade = query.get('grade') ?? 'sunset';
  state.size = query.get('size') ?? 'square';
  state.title = query.get('caption') ?? 'Sunset Heist';
  state.subtitle = query.get('subtitle') ?? 'Vice City nights';
  document.getElementById('title').value = state.title;
  document.getElementById('subtitle').value = state.subtitle;
  await hooks.addSample(query.get('photo') ?? 'pier');
  const second = query.get('photo2');
  if (second) await hooks.addSample(second);
  // Spread the two photos across panels so multi-panel layouts show variety,
  // and bias the crop toward the top of each photo so faces stay in frame.
  state.panels.forEach((p, i) => {
    if (state.photos.length > 1) p.photoIndex = i % state.photos.length;
    p.oy = 0.3;
  });
  hooks.redraw();
  hooks.syncPanelEditor();
  // Mark the active layout/grade/size buttons so the editor shot shows the choice.
  const markActive = (boxId, keys, current) => {
    document.querySelectorAll(`#${boxId} .pick`).forEach((b, i) => {
      b.classList.toggle('active', keys[i] === current);
    });
  };
  const { LAYOUTS, GRADES } = await import('./cover.js');
  markActive('layouts', Object.keys(LAYOUTS), state.layout);
  markActive('grades', Object.keys(GRADES), state.grade);
  markActive('sizes', ['square', 'portrait', 'wide'], state.size);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    // Give the canvas font time to settle, then paint once more and signal ready.
    document.fonts?.ready.then(() => {
      hooks.redraw();
      window.__shotReady = true;
    }).catch(() => { window.__shotReady = true; });
    setTimeout(() => { window.__shotReady = true; }, 1500);
  }));
}
