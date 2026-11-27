const WORLD_W = 11008;
const WORLD_H = 6144;

const SOURCES = {
  "2x": {
    url: "/repo-assets/maps/overworld/tests/test_realm_sector_v2_2x_11008x6144.webp",
    nativeW: 11008,
    nativeH: 6144,
    label: "2× Doubled WebP (11008×6144)",
  },
  "1x": {
    url: "/repo-assets/maps/overworld/tests/test_realm_sector_v2_1x_5504x3072.webp",
    nativeW: 5504,
    nativeH: 3072,
    label: "1× Native WebP (5504×3072)",
  },
};

const canvas = document.getElementById("stageCanvas");
const ctx = canvas.getContext("2d");
const stageWrap = document.getElementById("stageWrap");

const studioStats = document.getElementById("studioStats");
const hudMetrics = document.getElementById("hudMetrics");
const btnMode2x = document.getElementById("btnMode2x");
const btnMode1x = document.getElementById("btnMode1x");
const rngZoom = document.getElementById("rngZoom");
const lblZoom = document.getElementById("lblZoom");
const selHero = document.getElementById("selHero");
const rngToken = document.getElementById("rngToken");
const lblToken = document.getElementById("lblToken");
const rngSpeed = document.getElementById("rngSpeed");
const lblSpeed = document.getElementById("lblSpeed");
const chkZeldaPan = document.getElementById("chkZeldaPan");
const chkFrame1080 = document.getElementById("chkFrame1080");
const btnResetPos = document.getElementById("btnResetPos");
const btnFullscreen = document.getElementById("btnFullscreen");
const btnExitFullscreen = document.getElementById("btnExitFullscreen");
const presetBtns = Array.from(document.querySelectorAll(".preset-btn"));

const state = {
  mode: "2x",
  zoom: 0.60,
  tokenSize: 142,
  moveSpeed: 360,
  heroId: "rowan",
  heroX: WORLD_W * 0.5,
  heroY: WORLD_H * 0.68,
  camX: WORLD_W * 0.5,
  camY: WORLD_H * 0.68,
  target: null,
  pointerDown: false,
  keys: new Set(),
  transition: null,
  lastTime: performance.now(),
};

const imageCache = new Map();
function loadAsset(url) {
  if (imageCache.has(url)) return imageCache.get(url);
  const entry = { img: null, ready: false, err: false };
  const img = new Image();
  img.onload = () => {
    entry.img = img;
    entry.ready = true;
    updateReadouts();
  };
  img.onerror = () => {
    entry.err = true;
    updateReadouts();
  };
  img.src = url;
  imageCache.set(url, entry);
  return entry;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function getViewportCss() {
  return {
    w: Math.max(1, stageWrap.clientWidth),
    h: Math.max(1, stageWrap.clientHeight),
  };
}

function clampCamera(cx, cy, zoom) {
  const { w, h } = getViewportCss();
  const halfVisW = w / (2 * zoom);
  const halfVisH = h / (2 * zoom);
  const clampedX = halfVisW * 2 >= WORLD_W ? WORLD_W / 2 : clamp(cx, halfVisW, WORLD_W - halfVisW);
  const clampedY = halfVisH * 2 >= WORLD_H ? WORLD_H / 2 : clamp(cy, halfVisH, WORLD_H - halfVisH);
  return { x: clampedX, y: clampedY };
}

function setZoom(nextZoom) {
  state.zoom = clamp(Number(nextZoom) || 0.6, 0.08, 1.6);
  rngZoom.value = state.zoom.toFixed(2);
  lblZoom.textContent = `${state.zoom.toFixed(2)}×`;
  updatePresetHighlight();
  updateReadouts();
}

function applyPreset(name) {
  const { w, h } = getViewportCss();
  if (name === "fit") {
    setZoom(Math.min(w / WORLD_W, h / WORLD_H) * 0.97);
  } else if (name === "3screens") {
    setZoom((w * 3) / WORLD_W);
  } else if (name === "2.5screens") {
    setZoom((w * 2.5) / WORLD_W);
  } else if (name === "0.75") {
    setZoom(0.75);
  } else if (name === "1.0") {
    setZoom(1.0);
  }
}

function updatePresetHighlight() {
  const { w } = getViewportCss();
  const targets = {
    fit: Math.min(w / WORLD_W, getViewportCss().h / WORLD_H) * 0.97,
    "3screens": (w * 3) / WORLD_W,
    "2.5screens": (w * 2.5) / WORLD_W,
    0.75: 0.75,
    "1.0": 1.0,
  };
  for (const btn of presetBtns) {
    const t = targets[btn.dataset.preset];
    btn.classList.toggle("active", t !== undefined && Math.abs(state.zoom - t) < 0.018);
  }
}

function setMode(nextMode) {
  state.mode = nextMode;
  btnMode2x.classList.toggle("active", nextMode === "2x");
  btnMode1x.classList.toggle("active", nextMode === "1x");
  loadAsset(SOURCES[nextMode].url);
  updateReadouts();
}

let lastReadoutKey = "";
function updateReadouts() {
  const src = SOURCES[state.mode];
  const { w, h } = getViewportCss();
  const visWorldW = w / state.zoom;
  const visWorldH = h / state.zoom;
  const screensWide = WORLD_W / visWorldW;
  const screensHigh = WORLD_H / visWorldH;

  // Compute physical pixel magnification against the active source image resolution
  const worldPerSrcPx = WORLD_W / src.nativeW;
  const displayPctOfSource = state.zoom * worldPerSrcPx * 100;
  const asset = loadAsset(src.url);
  const hx = Math.round(state.heroX);
  const hy = Math.round(state.heroY);
  const readoutKey = `${state.mode}|${state.zoom.toFixed(3)}|${w}x${h}|${hx},${hy}|${asset.ready}|${asset.err}`;
  if (readoutKey === lastReadoutKey) return;
  lastReadoutKey = readoutKey;

  const crispLabel =
    displayPctOfSource <= 105
      ? `<span class="hud-stat-good">${Math.round(displayPctOfSource)}% of source (Razor Sharp)</span>`
      : `<span class="hud-stat-warn">${Math.round(displayPctOfSource)}% of source (${(displayPctOfSource / 100).toFixed(2)}× stretched)</span>`;

  const statusTxt = asset.err
    ? "Failed to load WebP"
    : !asset.ready
      ? "Loading WebP..."
      : src.label;

  studioStats.textContent = `${statusTxt} | Pos (${hx}, ${hy})`;
  hudMetrics.innerHTML =
    `<span><strong>Coverage:</strong> ${screensWide.toFixed(1)}× wide &times; ${screensHigh.toFixed(1)}× tall screens</span>` +
    `<span><strong>Zoom:</strong> ${state.zoom.toFixed(2)}×</span>` +
    `<span><strong>Sharpness:</strong> ${crispLabel}</span>`;
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  const { w, h } = getViewportCss();
  const cam = clampCamera(state.camX, state.camY, state.zoom);
  return {
    x: cam.x + (sx - w / 2) / state.zoom,
    y: cam.y + (sy - h / 2) / state.zoom,
  };
}

function triggerZeldaBorderSlide(dir) {
  const pad = Math.max(85, state.tokenSize * 0.75);
  let fromX = state.heroX;
  let fromY = state.heroY;
  let toX = state.heroX;
  let toY = state.heroY;

  if (dir === "N") {
    toY = WORLD_H - pad;
  } else if (dir === "S") {
    toY = pad;
  } else if (dir === "W") {
    toX = WORLD_W - pad;
  } else if (dir === "E") {
    toX = pad;
  }

  state.target = null;
  state.transition = {
    dir,
    elapsed: 0,
    duration: 0.45,
    fromHeroX: fromX,
    fromHeroY: fromY,
    toHeroX: toX,
    toHeroY: toY,
    fromCam: clampCamera(state.camX, state.camY, state.zoom),
    toCam: clampCamera(toX, toY, state.zoom),
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateSimulation(dt) {
  if (state.transition) {
    state.transition.elapsed += dt;
    const rawT = Math.min(1, state.transition.elapsed / state.transition.duration);
    if (rawT >= 1) {
      state.heroX = state.transition.toHeroX;
      state.heroY = state.transition.toHeroY;
      state.camX = state.transition.toCam.x;
      state.camY = state.transition.toCam.y;
      state.transition = null;
    }
    return;
  }

  let vx = 0;
  let vy = 0;
  if (state.keys.has("KeyW") || state.keys.has("ArrowUp")) vy -= 1;
  if (state.keys.has("KeyS") || state.keys.has("ArrowDown")) vy += 1;
  if (state.keys.has("KeyA") || state.keys.has("ArrowLeft")) vx -= 1;
  if (state.keys.has("KeyD") || state.keys.has("ArrowRight")) vx += 1;

  // Gamepad left stick / D-pad support
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    if (Math.abs(gp.axes[0] || 0) > 0.2) vx += gp.axes[0];
    if (Math.abs(gp.axes[1] || 0) > 0.2) vy += gp.axes[1];
    if (gp.buttons[12]?.pressed) vy -= 1;
    if (gp.buttons[13]?.pressed) vy += 1;
    if (gp.buttons[14]?.pressed) vx -= 1;
    if (gp.buttons[15]?.pressed) vx += 1;
  }

  const speedMult = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") ? 1.8 : 1.0;
  const spd = state.moveSpeed * speedMult;

  if (vx !== 0 || vy !== 0) {
    state.target = null;
    const len = Math.hypot(vx, vy);
    state.heroX += (vx / len) * spd * dt;
    state.heroY += (vy / len) * spd * dt;
  } else if (state.target) {
    const dx = state.target.x - state.heroX;
    const dy = state.target.y - state.heroY;
    const dist = Math.hypot(dx, dy);
    if (dist <= 6) {
      state.target = null;
    } else {
      const step = Math.min(dist, spd * dt);
      state.heroX += (dx / dist) * step;
      state.heroY += (dy / dist) * step;
    }
  }

  const margin = Math.max(24, state.tokenSize * 0.3);
  if (chkZeldaPan.checked) {
    if (state.heroY < margin) return triggerZeldaBorderSlide("N");
    if (state.heroY > WORLD_H - margin) return triggerZeldaBorderSlide("S");
    if (state.heroX < margin) return triggerZeldaBorderSlide("W");
    if (state.heroX > WORLD_W - margin) return triggerZeldaBorderSlide("E");
  } else {
    state.heroX = clamp(state.heroX, margin, WORLD_W - margin);
    state.heroY = clamp(state.heroY, margin, WORLD_H - margin);
  }

  const cam = clampCamera(state.heroX, state.heroY, state.zoom);
  state.camX += (cam.x - state.camX) * Math.min(1, dt * 14);
  state.camY += (cam.y - state.camY) * Math.min(1, dt * 14);
}

function drawHeroToken(x, y) {
  const r = state.tokenSize / 2;
  const heroUrl = `/assets/tokens/heroes/${state.heroId}_hp1.webp`;
  const asset = loadAsset(heroUrl);

  ctx.save();
  // Grounded drop shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.ellipse(x + 4, y + r * 0.85, r * 0.84, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  if (asset.ready && asset.img) {
    ctx.drawImage(asset.img, x - r, y - r, state.tokenSize, state.tokenSize);
  } else {
    ctx.fillStyle = "#c89b44";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderScene() {
  const { w, h } = getViewportCss();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.round(w * dpr);
  const targetH = Math.round(h * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#06080c";
  ctx.fillRect(0, 0, w, h);

  const src = SOURCES[state.mode];
  const mapAsset = loadAsset(src.url);

  if (state.transition) {
    const tr = state.transition;
    const p = easeInOutCubic(Math.min(1, tr.elapsed / tr.duration));
    let ox = 0;
    let oy = 0;
    if (tr.dir === "N") oy = 1;
    if (tr.dir === "S") oy = -1;
    if (tr.dir === "W") ox = 1;
    if (tr.dir === "E") ox = -1;

    // Outgoing screen slides away while incoming screen slides cleanly into place
    const drawSlide = (cam, hx, hy, shiftX, shiftY) => {
      ctx.save();
      ctx.translate(w / 2 + shiftX, h / 2 + shiftY);
      ctx.scale(state.zoom, state.zoom);
      ctx.translate(-cam.x, -cam.y);
      if (mapAsset.ready && mapAsset.img) {
        ctx.drawImage(mapAsset.img, 0, 0, WORLD_W, WORLD_H);
      }
      drawHeroToken(hx, hy);
      ctx.restore();
    };

    drawSlide(tr.fromCam, tr.fromHeroX, tr.fromHeroY, ox * w * p, oy * h * p);
    drawSlide(tr.toCam, tr.toHeroX, tr.toHeroY, -ox * w * (1 - p), -oy * h * (1 - p));
    return;
  }

  const cam = clampCamera(state.camX, state.camY, state.zoom);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-cam.x, -cam.y);

  if (mapAsset.ready && mapAsset.img) {
    ctx.drawImage(mapAsset.img, 0, 0, WORLD_W, WORLD_H);
  } else {
    ctx.fillStyle = "#121722";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  }

  // Subtle world boundary outline when zoomed out
  ctx.strokeStyle = "rgba(215, 178, 103, 0.35)";
  ctx.lineWidth = 4 / state.zoom;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

  // Target waypoint marker when clicking to walk
  if (state.target) {
    ctx.strokeStyle = "rgba(250, 226, 170, 0.85)";
    ctx.lineWidth = 3 / state.zoom;
    ctx.beginPath();
    ctx.arc(state.target.x, state.target.y, 18 / state.zoom, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawHeroToken(state.heroX, state.heroY);

  // Optional 1920x1080 camera footprint box around the hero (useful when zoomed out)
  if (chkFrame1080.checked) {
    ctx.strokeStyle = "rgba(114, 227, 168, 0.85)";
    ctx.setLineDash([12 / state.zoom, 8 / state.zoom]);
    ctx.lineWidth = 2.5 / state.zoom;
    ctx.strokeRect(state.heroX - 960, state.heroY - 540, 1920, 1080);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function tick(now) {
  const dt = Math.min(0.05, Math.max(0.001, (now - state.lastTime) / 1000));
  state.lastTime = now;
  updateSimulation(dt);
  renderScene();
  if (!state.transition) updateReadouts();
  requestAnimationFrame(tick);
}

// --- Wire Events ---
btnMode2x.addEventListener("click", () => setMode("2x"));
btnMode1x.addEventListener("click", () => setMode("1x"));

for (const btn of presetBtns) {
  btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
}

rngZoom.addEventListener("input", () => setZoom(rngZoom.value));
selHero.addEventListener("change", () => {
  state.heroId = selHero.value;
  loadAsset(`/assets/tokens/heroes/${state.heroId}_hp1.webp`);
});

rngToken.addEventListener("input", () => {
  state.tokenSize = Number(rngToken.value);
  lblToken.textContent = `${state.tokenSize}px`;
});

rngSpeed.addEventListener("input", () => {
  state.moveSpeed = Number(rngSpeed.value);
  lblSpeed.textContent = String(state.moveSpeed);
});

btnResetPos.addEventListener("click", () => {
  state.target = null;
  state.transition = null;
  state.heroX = WORLD_W * 0.5;
  state.heroY = WORLD_H * 0.68;
});

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    stageWrap.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

btnFullscreen.addEventListener("click", toggleFullscreen);
btnExitFullscreen.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  btnExitFullscreen.classList.toggle("hidden", !document.fullscreenElement);
  updatePresetHighlight();
  updateReadouts();
});

window.addEventListener("resize", () => {
  updatePresetHighlight();
  updateReadouts();
});

window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT"].includes(document.activeElement?.tagName)) return;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }
  state.keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  state.keys.delete(e.code);
});

window.addEventListener("blur", () => state.keys.clear());

canvas.addEventListener("pointerdown", (e) => {
  state.pointerDown = true;
  state.target = screenToWorld(e.clientX, e.clientY);
});

window.addEventListener("pointermove", (e) => {
  if (!state.pointerDown) return;
  state.target = screenToWorld(e.clientX, e.clientY);
});

window.addEventListener("pointerup", () => {
  state.pointerDown = false;
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.09 : 1 / 1.09;
    setZoom(state.zoom * factor);
  },
  { passive: false }
);

// Boot
loadAsset(SOURCES["2x"].url);
loadAsset(SOURCES["1x"].url);
loadAsset(`/assets/tokens/heroes/${state.heroId}_hp1.webp`);
setMode("2x");
setTimeout(() => applyPreset("3screens"), 40);
requestAnimationFrame(tick);
