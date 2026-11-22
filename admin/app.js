(() => {
  const MAP_SIZE = 8192;
  const TILE_SIZE = 512;
  const BASE_MARKER_PX = 148;
  const ASSET_REV = String(Date.now());
  function assetUrl(rel) {
    return "/" + String(rel || "").replace(/^\/+/, "") + "?v=" + ASSET_REV;
  }

  const canvas = document.getElementById("mapCanvas");
  const ctx = canvas.getContext("2d");

  const mapTabs = document.getElementById("mapTabs");
  const modeTabs = document.getElementById("modeTabs");
  const placeSidebarPane = document.getElementById("placeSidebarPane");
  const paintSidebarPane = document.getElementById("paintSidebarPane");
  const swatchBar = document.getElementById("swatchBar");
  const btnProceduralPlace = document.getElementById("btnProceduralPlace");
  const btnProceduralPlaceQuests = document.getElementById("btnProceduralPlaceQuests");
  const btnLockMap = document.getElementById("btnLockMap");
  const btnClearMapLocations = document.getElementById("btnClearMapLocations");
  const btnClearAllLocations = document.getElementById("btnClearAllLocations");
  const chkKeepPlaced = document.getElementById("chkKeepPlaced");
  const paintToolTabs = document.getElementById("paintToolTabs");
  const rngBrushSize = document.getElementById("rngBrushSize");
  const brushSizeVal = document.getElementById("brushSizeVal");
  const rngPaintOpacity = document.getElementById("rngPaintOpacity");
  const paintOpacityVal = document.getElementById("paintOpacityVal");
  const chkHexGridTop = document.getElementById("chkHexGridTop");
  const activeSwatchBox = document.getElementById("activeSwatchBox");
  const activeSwatchName = document.getElementById("activeSwatchName");
  const activeSwatchNote = document.getElementById("activeSwatchNote");
  const btnShowAllColors = document.getElementById("btnShowAllColors");
  const btnClearPaintLayer = document.getElementById("btnClearPaintLayer");
  const paintLegendNote = document.getElementById("paintLegendNote");

  const filterTabs = document.getElementById("filterTabs");
  const paletteList = document.getElementById("paletteList");
  const progressPill = document.getElementById("progressPill");
  const armedBanner = document.getElementById("armedBanner");
  const coordReadout = document.getElementById("coordReadout");
  const zoomReadout = document.getElementById("zoomReadout");

  const chkAutoAdvance = document.getElementById("chkAutoAdvance");
  const chkAutoSave = document.getElementById("chkAutoSave");
  const chkShowQuestsTop = document.getElementById("chkShowQuestsTop");
  const chkShowQuests = document.getElementById("chkShowQuests");
  const chkShowHeroScale = document.getElementById("chkShowHeroScale");
  const chkShowRings = document.getElementById("chkShowRings");
  const chkShowLabels = document.getElementById("chkShowLabels");
  const chkShowHexGrid = document.getElementById("chkShowHexGrid");
  const chkShowTerrain = document.getElementById("chkShowTerrain");
  const chkShowZones = document.getElementById("chkShowZones");
  const chkInspLocked = document.getElementById("chkInspLocked");

  const btnUndo = document.getElementById("btnUndo");
  const btnFitMap = document.getElementById("btnFitMap");
  const btnSave = document.getElementById("btnSave");

  const inspectorEmpty = document.getElementById("inspectorEmpty");
  const inspectorBody = document.getElementById("inspectorBody");
  const inspThumb = document.getElementById("inspThumb");
  const inspTag = document.getElementById("inspTag");
  const inspTitle = document.getElementById("inspTitle");
  const inspKind = document.getElementById("inspKind");
  const inspStatus = document.getElementById("inspStatus");
  const inspX = document.getElementById("inspX");
  const inspY = document.getElementById("inspY");
  const inspScale = document.getElementById("inspScale");
  const inspScaleVal = document.getElementById("inspScaleVal");
  const inspRadius = document.getElementById("inspRadius");
  const inspRadiusVal = document.getElementById("inspRadiusVal");
  const inspRotateWrap = document.getElementById("inspRotateWrap");
  const inspRotate = document.getElementById("inspRotate");
  const inspRotateVal = document.getElementById("inspRotateVal");
  const btnRotReset = document.getElementById("btnRotReset");
  const btnCenterCam = document.getElementById("btnCenterCam");
  const btnDuplicate = document.getElementById("btnDuplicate");
  const btnUnplace = document.getElementById("btnUnplace");
  const mapTooltip = document.getElementById("mapTooltip");
  const inspDesc = document.getElementById("inspDesc");
  const inspServices = document.getElementById("inspServices");
  const inspBoss = document.getElementById("inspBoss");
  const inspFerryBox = document.getElementById("inspFerryBox");
  const inspQuestsHead = document.getElementById("inspQuestsHead");
  const inspQuestsList = document.getElementById("inspQuestsList");

  let worldData = { version: 1, maps: ["map_01", "map_02", "map_03", "map_04"], lockedMaps: [], locations: [] };
  let activeMapId = "map_01";
  let activeMode = "place"; // "place" | "terrain" | "zone"
  let activeFilter = "permanent";
  let selectedId = null;
  let stampTemplateId = null;
  let linkingFerryFromId = null;

  let paintTool = "brush"; // "brush" | "bucket" | "eraser"
  let activeTerrainCode = 1;
  let activeZoneCode = 1;
  let brushSize = 3;
  let paintOpacity = 0.58;
  let isPainting = false;
  let paintDirty = false;
  let lastPaintWorld = null;
  let pendingPaintUndo = null;
  let pendingDragUndo = null;

  const MAX_UNDO = 30;
  const undoStack = [];

  function updateUndoBtn() {
    btnUndo.disabled = undoStack.length === 0;
    btnUndo.textContent = undoStack.length > 0 ? `Undo (${undoStack.length})` : "Undo";
  }

  function pushUndoEntry(entry) {
    undoStack.push(entry);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    updateUndoBtn();
  }

  function snapshotLocationsState() {
    return {
      kind: "locations",
      locations: JSON.parse(JSON.stringify(worldData.locations)),
      selectedId,
    };
  }

  function pushLocationsUndo() {
    pushUndoEntry(snapshotLocationsState());
  }

  function snapshotPaintState(layer, mapId) {
    return {
      kind: "paint",
      layer,
      mapId,
      rle: window.RODWorldPaint.snapshotLayer(layer, mapId),
    };
  }

  function performUndo() {
    if (undoStack.length === 0) return;
    const entry = undoStack.pop();
    updateUndoBtn();

    if (entry.kind === "paint") {
      if (isMapLocked(entry.mapId)) {
        armedBanner.textContent = `🔒 ${entry.mapId} is LOCKED — unlock it before undoing paint edits.`;
        return;
      }
      if (entry.mapId !== activeMapId) {
        activeMapId = entry.mapId;
        for (const el of mapTabs.querySelectorAll(".map-tab")) {
          el.classList.toggle("active", el.dataset.map === activeMapId);
        }
        window.RODWorldPaint.setMap(activeMapId);
      }
      window.RODWorldPaint.restoreLayer(entry.layer, entry.mapId, entry.rle);
      renderSwatchBar();
      updateActiveSwatchCard();
      armedBanner.textContent = `Undid ${entry.layer === "zone" ? "Zone" : "Terrain"} paint on ${entry.mapId}`;
      if (chkAutoSave.checked) saveWorldPaint(true);
      return;
    }

    if (entry.kind === "locations") {
      const lockedCurrent = worldData.locations.filter((l) => isMarkerLocked(l));
      const lockedById = new Map(lockedCurrent.map((l) => [l.id, l]));
      const restored = entry.locations
        .filter((loc) => !(loc.placed && isMapLocked(loc.mapId) && !lockedById.has(loc.id)))
        .map((loc) => lockedById.get(loc.id) || loc);
      for (const lockedLoc of lockedCurrent) {
        if (!restored.some((l) => l.id === lockedLoc.id)) {
          restored.push(lockedLoc);
        }
      }
      worldData.locations = restored;
      selectedId = entry.selectedId;
      linkingFerryFromId = null;
      refreshUI();
      armedBanner.textContent = "Undid last unlocked location edit";
      if (chkAutoSave.checked) saveWorldData(true);
    }
  }

  let camX = 4096;
  let camY = 4096;
  let zoom = 0.14;

  const tileCache = new Map();
  const markerImgCache = new Map();
  let valenImg = null;

  let mouseWorld = null;
  let isPanning = false;
  let panStart = { x: 0, y: 0, camX: 0, camY: 0 };
  let draggingMarker = null;
  const keys = new Set();

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function getMarkerImage(assetPath) {
    if (!markerImgCache.has(assetPath)) {
      markerImgCache.set(assetPath, null);
      loadImage(assetUrl(assetPath)).then((img) => {
        markerImgCache.set(assetPath, img);
      });
    }
    return markerImgCache.get(assetPath);
  }

  function getTile(mapId, c, r) {
    const key = `${mapId}:${c}_${r}`;
    if (!tileCache.has(key)) {
      tileCache.set(key, null);
      loadImage(`/assets/maps/${mapId}/tile_${c}_${r}.webp`).then((img) => {
        tileCache.set(key, img);
      });
    }
    return tileCache.get(key);
  }

  function fitMapToScreen() {
    const pad = 28;
    const w = canvas.width - pad * 2;
    const h = canvas.height - pad * 2;
    zoom = Math.max(0.06, Math.min(w / MAP_SIZE, h / MAP_SIZE));
    camX = MAP_SIZE / 2;
    camY = MAP_SIZE / 2;
  }

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width));
    canvas.height = Math.max(1, Math.floor(rect.height));
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - canvas.width / 2) / zoom + camX,
      y: (sy - canvas.height / 2) / zoom + camY,
    };
  }

  function isRepeatableType(loc) {
    return loc && loc.category === "travel";
  }

  function getTemplateRootId(id) {
    return id.replace(/_inst_\d+$/, "");
  }

  function getVisiblePaletteItems() {
    return worldData.locations
      .filter((loc) => {
        if (activeFilter === "permanent") {
          return loc.category === "permanent" && loc.mapId === activeMapId;
        }
        if (activeFilter === "quest_field") {
          return loc.category === "quest_field" && (loc.mapId === activeMapId || loc.mapId === "all");
        }
        // In Travel & Bounties tab, show master stamp templates cleanly (hide extra _inst_N rows)
        return isRepeatableType(loc) && !/_inst_\d+$/.test(loc.id);
      })
      .sort((a, b) => (a.progOrder ?? 999) - (b.progOrder ?? 999));
  }

  function getPlacedOnActiveMap() {
    return worldData.locations.filter((loc) => loc.placed && loc.mapId === activeMapId);
  }

  function getSelectedLocation() {
    return worldData.locations.find((l) => l.id === selectedId) || null;
  }

  function isJournalOnlyQuest(loc) {
    return Boolean(loc && loc.category === "quest_field" && loc.placeOnOverworld === false);
  }

  function isMapLocked(mapId = activeMapId) {
    return Boolean(Array.isArray(worldData.lockedMaps) && worldData.lockedMaps.includes(mapId));
  }

  function isMarkerLocked(loc) {
    if (!loc) return false;
    if (loc.locked) return true;
    return Boolean(loc.placed && isMapLocked(loc.mapId));
  }

  function updateMapLockUI() {
    const locked = isMapLocked(activeMapId);
    const mapLabel = activeMapId.replace("map_0", "Map ").replace("map_", "Map ");
    if (btnLockMap) {
      btnLockMap.classList.toggle("lock-active", locked);
      btnLockMap.textContent = locked
        ? `🔒 ${mapLabel} Locked (Unlock)`
        : `🔓 Lock All Placed Pins on ${mapLabel}`;
    }
    btnProceduralPlace.disabled = locked;
    btnProceduralPlaceQuests.disabled = locked;
    btnClearMapLocations.disabled = locked;
    if (btnClearPaintLayer) btnClearPaintLayer.disabled = locked;

    for (const el of mapTabs.querySelectorAll(".map-tab")) {
      if (!el.dataset.baseLabel) {
        el.dataset.baseLabel = el.textContent.replace(/^🔒\s*/, "");
      }
      el.textContent = (isMapLocked(el.dataset.map) ? "🔒 " : "") + el.dataset.baseLabel;
    }
  }

  function isLocationVisibleOnCanvas(loc) {
    if (!loc) return false;
    if (loc.category !== "quest_field") return true;
    if (chkShowQuests && chkShowQuests.checked) return true;
    if (selectedId === loc.id) return true;
    const sel = getSelectedLocation();
    if (!sel) return false;
    if (loc.pickedUpAtId && loc.pickedUpAtId === sel.id) return true;
    if (loc.targetHubId && loc.targetHubId === sel.id) return true;
    if (sel.category === "quest_field" && sel.pickedUpAtId && sel.pickedUpAtId === loc.pickedUpAtId) {
      return true;
    }
    return false;
  }

  function updateProgress() {
    const allPerm = worldData.locations.filter((l) => l.category === "permanent");
    const placedAll = allPerm.filter((l) => l.placed).length;
    const mapPerm = allPerm.filter((l) => l.mapId === activeMapId);
    const placedMap = mapPerm.filter((l) => l.placed).length;
    const mapOverworldQ = worldData.locations.filter(
      (l) => l.category === "quest_field" && l.mapId === activeMapId && !isJournalOnlyQuest(l)
    );
    const placedMapQ = mapOverworldQ.filter((l) => l.placed).length;
    progressPill.textContent = `Map: ${placedMap}/${mapPerm.length} Perm · ${placedMapQ}/${mapOverworldQ.length} Quests · World: ${placedAll}/${allPerm.length}`;
  }

  function showTooltipFor(loc, clientX, clientY) {
    const svcs = (loc.services || []).slice(0, 3).join(" · ");
    const qs = loc.quests || [];
    const qNames = qs.map((q) => `• ${q.title}${q.giver ? ` (${q.giver})` : ""}`).join("<br>");
    const bossHtml = loc.bossInfo
      ? `<div style="color:#ff9a9a;margin-top:4px;"><strong>Boss:</strong> ${loc.bossInfo.boss} (${loc.bossInfo.guardPips} pips · Weak: ${loc.bossInfo.weaknesses})</div>`
      : "";
    mapTooltip.innerHTML = `
      <strong>${loc.name} ${loc.levelRange ? `(${loc.levelRange})` : ""}</strong>
      ${loc.description ? `<div>${loc.description}</div>` : ""}
      ${svcs ? `<div style="color:#b7c3d6;margin-top:4px;">${svcs}</div>` : ""}
      ${qNames ? `<div style="color:#f4be6b;margin-top:4px;"><strong>Quests (${qs.length}):</strong><br>${qNames}</div>` : ""}
      ${bossHtml}
    `;
    const left = Math.min(window.innerWidth - 335, clientX + 16);
    const top = Math.min(window.innerHeight - 210, clientY + 12);
    mapTooltip.style.left = `${Math.max(8, left)}px`;
    mapTooltip.style.top = `${Math.max(8, top)}px`;
    mapTooltip.classList.remove("hidden");
  }

  function hideTooltip() {
    mapTooltip.classList.add("hidden");
  }

  function isFerryMarker(loc) {
    return Boolean(loc && loc.id && loc.id.startsWith("tr_ferry_crossing"));
  }

  function unlinkFerry(ferryId) {
    const a = worldData.locations.find((l) => l.id === ferryId);
    if (!a || isMarkerLocked(a)) return false;
    if (a.linkedFerryId) {
      const b = worldData.locations.find((l) => l.id === a.linkedFerryId);
      if (b && isMarkerLocked(b)) return false;
      if (b && b.linkedFerryId === a.id) {
        b.linkedFerryId = null;
      }
      a.linkedFerryId = null;
    }
    for (const other of worldData.locations) {
      if (other.linkedFerryId === ferryId && !isMarkerLocked(other)) {
        other.linkedFerryId = null;
      }
    }
    return true;
  }

  function linkFerries(idA, idB) {
    if (!idA || !idB || idA === idB) return;
    const a = worldData.locations.find((l) => l.id === idA);
    const b = worldData.locations.find((l) => l.id === idB);
    if (!a || !b || isMarkerLocked(a) || isMarkerLocked(b)) {
      linkingFerryFromId = null;
      armedBanner.textContent = "🔒 Locked ferry markers cannot be relinked — unlock the marker or map first.";
      refreshUI();
      return;
    }
    pushLocationsUndo();
    unlinkFerry(idA);
    unlinkFerry(idB);
    a.linkedFerryId = b.id;
    b.linkedFerryId = a.id;
    linkingFerryFromId = null;
    selectedId = a.id;
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  }

  function showSimpleTooltip(title, sub, clientX, clientY) {
    mapTooltip.innerHTML = `
      <strong>${title}</strong>
      ${sub ? `<div style="color:#c5cedd;">${sub}</div>` : ""}
    `;
    const left = Math.min(window.innerWidth - 335, clientX + 16);
    const top = Math.min(window.innerHeight - 120, clientY - 8);
    mapTooltip.style.left = `${Math.max(8, left)}px`;
    mapTooltip.style.top = `${Math.max(8, top)}px`;
    mapTooltip.classList.remove("hidden");
  }

  function getActivePaintLayer() {
    return activeMode === "zone" ? "zone" : "terrain";
  }

  function getActiveSwatchItems() {
    if (activeMode === "zone") {
      return window.RODWorldPaint.ZONES_BY_MAP[activeMapId] || window.RODWorldPaint.ZONES_BY_MAP.map_01;
    }
    return window.RODWorldPaint.BIOMES_BY_MAP[activeMapId] || window.RODWorldPaint.BIOMES_BY_MAP.map_01;
  }

  function getActivePaintCode() {
    if (paintTool === "eraser") return 0;
    return activeMode === "zone" ? activeZoneCode : activeTerrainCode;
  }

  function updateActiveSwatchCard() {
    if (paintTool === "eraser") {
      activeSwatchBox.style.background = "repeating-linear-gradient(45deg, #2b3240, #2b3240 4px, #161b24 4px, #161b24 8px)";
      activeSwatchName.textContent = "Eraser";
      activeSwatchNote.textContent = `Erases ${activeMode === "zone" ? "Level Zone" : "Terrain"} hexes`;
      return;
    }
    const items = getActiveSwatchItems();
    const code = activeMode === "zone" ? activeZoneCode : activeTerrainCode;
    const item = items.find((x) => x.code === code) || items[0];
    if (!item) return;
    activeSwatchBox.style.background = item.color;
    activeSwatchName.textContent = item.name;
    activeSwatchNote.textContent = activeMode === "zone" ? "5-Level Increment Zone" : item.note;
  }

  function renderSwatchBar() {
    swatchBar.innerHTML = "";
    if (activeMode !== "terrain" && activeMode !== "zone") {
      swatchBar.classList.add("hidden");
      return;
    }
    swatchBar.classList.remove("hidden");
    const items = getActiveSwatchItems();
    const hiddenSet = activeMode === "zone" ? window.RODWorldPaint.hiddenZones : window.RODWorldPaint.hiddenTerrain;
    const activeCode = activeMode === "zone" ? activeZoneCode : activeTerrainCode;

    for (const item of items) {
      const row = document.createElement("div");
      row.className = "swatch-row";

      const swatchBtn = document.createElement("button");
      swatchBtn.type = "button";
      swatchBtn.className = "swatch-btn" + (paintTool !== "eraser" && item.code === activeCode ? " active" : "");
      swatchBtn.style.background = item.color;

      const tipSub = activeMode === "zone"
        ? "Player Level Zone (5-level band)"
        : item.note;

      swatchBtn.addEventListener("click", () => {
        if (activeMode === "zone") activeZoneCode = item.code;
        else activeTerrainCode = item.code;
        if (paintTool === "eraser") setPaintTool("brush");
        renderSwatchBar();
        updateActiveSwatchCard();
        updateArmedBanner();
      });
      swatchBtn.addEventListener("mouseenter", (e) => showSimpleTooltip(item.name, tipSub, e.clientX, e.clientY));
      swatchBtn.addEventListener("mousemove", (e) => showSimpleTooltip(item.name, tipSub, e.clientX, e.clientY));
      swatchBtn.addEventListener("mouseleave", hideTooltip);

      const isHidden = hiddenSet.has(item.code);
      const hideBtn = document.createElement("button");
      hideBtn.type = "button";
      hideBtn.className = "swatch-hide-btn" + (isHidden ? " is-hidden" : "");
      hideBtn.textContent = isHidden ? "✕" : "👁";

      const hideTipTitle = isHidden ? `Show ${item.name}` : `Hide ${item.name}`;
      hideBtn.addEventListener("click", () => {
        if (hiddenSet.has(item.code)) hiddenSet.delete(item.code);
        else hiddenSet.add(item.code);
        window.RODWorldPaint.rebuildLayerCanvas(getActivePaintLayer(), activeMapId);
        renderSwatchBar();
      });
      hideBtn.addEventListener("mouseenter", (e) => showSimpleTooltip(hideTipTitle, "Toggle visibility for this color", e.clientX, e.clientY));
      hideBtn.addEventListener("mousemove", (e) => showSimpleTooltip(hideTipTitle, "Toggle visibility for this color", e.clientX, e.clientY));
      hideBtn.addEventListener("mouseleave", hideTooltip);

      row.append(swatchBtn, hideBtn);
      swatchBar.appendChild(row);
    }

    if (activeMode === "terrain") {
      paintLegendNote.innerHTML =
        `<strong>${activeMapId.replace("_", " ").toUpperCase()} Terrain:</strong><br>` +
        `Pick a 1:1 swatch from the vertical bar (hover for biome name, click 👁 to hide/show a color). Water &amp; Crimson are impassable.`;
    } else {
      const mapRanges = { map_01: "Lv 1–25", map_02: "Lv 26–50", map_03: "Lv 51–75", map_04: "Lv 76–99" };
      paintLegendNote.innerHTML =
        `<strong>5-Level Zones (${mapRanges[activeMapId] || "Lv 1–99"}):</strong><br>` +
        `Showing only the 5 zones for this map. Procedural Placement reads these zones to place hubs &amp; quests in matching levels.`;
    }
  }

  function setPaintTool(tool) {
    paintTool = tool;
    for (const btn of paintToolTabs.querySelectorAll(".tool-btn")) {
      btn.classList.toggle("active", btn.dataset.tool === tool);
    }
    renderSwatchBar();
    updateActiveSwatchCard();
    updateArmedBanner();
    resizeCanvas();
  }

  function syncHexGridCheckboxes(val) {
    chkHexGridTop.checked = val;
    chkShowHexGrid.checked = val;
  }

  function syncShowQuestsCheckboxes(val) {
    const next = Boolean(val);
    if (chkShowQuestsTop) chkShowQuestsTop.checked = next;
    if (chkShowQuests) chkShowQuests.checked = next;
  }

  function setMode(mode) {
    activeMode = mode;
    for (const btn of modeTabs.querySelectorAll(".mode-tab")) {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    }
    placeSidebarPane.classList.toggle("hidden", mode !== "place");
    paintSidebarPane.classList.toggle("hidden", mode === "place");

    if (mode === "terrain") {
      chkShowTerrain.checked = true;
      chkShowZones.checked = false;
      syncHexGridCheckboxes(true);
    } else if (mode === "zone") {
      chkShowTerrain.checked = false;
      chkShowZones.checked = true;
      syncHexGridCheckboxes(true);
    } else {
      chkShowTerrain.checked = false;
      chkShowZones.checked = true;
    }
    renderSwatchBar();
    updateActiveSwatchCard();
    updateArmedBanner();
    resizeCanvas();
  }

  function updateArmedBanner() {
    if (activeMode === "terrain" || activeMode === "zone") {
      if (isMapLocked(activeMapId)) {
        armedBanner.textContent = `🔒 ${activeMapId} is LOCKED — Switch to Place mode and Unlock Map to edit terrain or zone paint`;
        return;
      }
      const layerLabel = activeMode === "zone" ? "Zone Paint (5-Lvl)" : "Terrain Paint";
      const toolLabel = paintTool === "bucket" ? "Bucket Fill" : paintTool === "eraser" ? "Eraser" : `Brush (${brushSize} hex)`;
      armedBanner.textContent = `${layerLabel} · ${toolLabel} — Left-click/drag to paint · Right-drag to pan`;
      return;
    }
    if (linkingFerryFromId) {
      armedBanner.textContent = "Ferry Link Mode: Click the destination Ferry Crossing on the map to link (Esc to cancel)";
      return;
    }
    if (stampTemplateId) {
      const tmpl = worldData.locations.find((l) => l.id === stampTemplateId);
      if (tmpl) {
        if (isMapLocked(activeMapId)) {
          armedBanner.textContent = `🔒 ${activeMapId} is LOCKED — Select an existing pin to inspect, or Unlock Map to stamp new pins`;
        } else {
          armedBanner.textContent = `Stamp Mode: ${tmpl.name} — Click map repeatedly to place multiple (click an existing icon to drag/delete)`;
        }
        return;
      }
    }
    const sel = getSelectedLocation();
    if (!sel) {
      armedBanner.textContent = "Select a location on the left, then click on the map to place it";
      return;
    }
    if (isJournalOnlyQuest(sel)) {
      const destLabel = sel.targetHubName || sel.pickedUpAtName || "Hub Interior";
      const verb = sel.questFormat === "hub_courier" ? "Courier Delivery →" : "Resolved inside";
      armedBanner.textContent = `Journal Only: ${sel.name} (${verb} ${destLabel}) — Token stays in Quest Journal, not placed on Overworld`;
    } else if (isMarkerLocked(sel)) {
      armedBanner.textContent = `🔒 Locked: ${sel.name} — Position locked against accidental moves or deletion`;
    } else if (sel.placed && sel.mapId === activeMapId) {
      armedBanner.textContent = `Selected: ${sel.name} — Drag on map to move, or choose another location`;
    } else {
      armedBanner.textContent = `Ready to place: ${sel.name} — Left-click anywhere on the map`;
    }
  }

  function renderPalette() {
    paletteList.innerHTML = "";
    const items = getVisiblePaletteItems();
    for (const loc of items) {
      const card = document.createElement("div");
      card.className = "loc-card" + (loc.id === selectedId || loc.id === stampTemplateId ? " selected" : "");

      const img = document.createElement("img");
      img.src = assetUrl(loc.assetPath);
      img.alt = loc.name;

      const info = document.createElement("div");
      info.className = "loc-card-info";

      const top = document.createElement("div");
      top.className = "loc-card-top";

      const name = document.createElement("div");
      name.className = "loc-card-name";
      name.textContent = loc.category === "permanent" && loc.progOrder <= 48
        ? `${loc.progOrder}. ${loc.name}`
        : loc.name;

      const status = document.createElement("span");
      if (isJournalOnlyQuest(loc)) {
        status.className = "status-dot journal";
        status.textContent = "Journal Only";
      } else if (isRepeatableType(loc)) {
        const mapCount = worldData.locations.filter(
          (l) => getTemplateRootId(l.id) === loc.id && l.placed && l.mapId === activeMapId
        ).length;
        status.className = "status-dot " + (mapCount > 0 ? "placed" : "unplaced");
        status.textContent = mapCount > 0 ? `${mapCount} on Map` : "Stamp Ready";
      } else {
        status.className = "status-dot " + (loc.placed ? "placed" : "unplaced");
        status.textContent = loc.placed
          ? `${isMarkerLocked(loc) ? "🔒 " : ""}${Math.round(loc.x)},${Math.round(loc.y)}`
          : "Unplaced";
      }

      top.append(name, status);

      const meta = document.createElement("div");
      meta.className = "loc-card-meta";
      meta.textContent = (loc.region ? `R${loc.region} · ` : "") + loc.kind;

      const badges = document.createElement("div");
      badges.className = "loc-badges";
      if (loc.levelRange) {
        const lb = document.createElement("span");
        lb.className = "lvl-badge";
        lb.textContent = loc.levelRange;
        badges.appendChild(lb);
      }
      if (isJournalOnlyQuest(loc)) {
        const jb = document.createElement("span");
        jb.className = "vis-badge";
        jb.textContent = loc.questFormat === "hub_courier"
          ? `Courier → ${loc.targetHubName || "Target Hub"}`
          : `Inside ${loc.pickedUpAtName || "Hub"}`;
        badges.appendChild(jb);
      } else if (loc.visibility === "hidden_discovery") {
        const vb = document.createElement("span");
        vb.className = "vis-badge hidden-disc";
        vb.textContent = "Hidden Until Discovered";
        badges.appendChild(vb);
      } else if (loc.visibility === "quest_active_only") {
        const vb = document.createElement("span");
        vb.className = "vis-badge";
        vb.textContent = "Shows When Quest Active";
        badges.appendChild(vb);
      } else {
        const vb = document.createElement("span");
        vb.className = "vis-badge";
        vb.textContent = loc.isPortal ? "Visible (Removes on Clear)" : "Always Visible";
        badges.appendChild(vb);
      }
      if (Array.isArray(loc.quests) && loc.quests.length > 0 && loc.category === "permanent") {
        const qb = document.createElement("span");
        qb.className = "lvl-badge";
        qb.style.background = "rgba(70, 201, 128, 0.16)";
        qb.style.color = "#6ee7a4";
        qb.style.borderColor = "rgba(70, 201, 128, 0.35)";
        qb.textContent = `${loc.quests.length} Quest${loc.quests.length > 1 ? "s" : ""}`;
        badges.appendChild(qb);
      }

      info.append(top, meta, badges);
      card.append(img, info);

      card.addEventListener("click", () => {
        selectedId = loc.id;
        stampTemplateId = isRepeatableType(loc) ? loc.id : null;
        if (!isRepeatableType(loc) && loc.placed && loc.mapId === activeMapId) {
          camX = loc.x;
          camY = loc.y;
          if (zoom < 0.35) zoom = 0.45;
        }
        refreshUI();
      });

      card.addEventListener("mouseenter", (e) => showTooltipFor(loc, e.clientX, e.clientY));
      card.addEventListener("mousemove", (e) => showTooltipFor(loc, e.clientX, e.clientY));
      card.addEventListener("mouseleave", hideTooltip);

      paletteList.appendChild(card);
    }
  }

  function renderInspector() {
    const loc = getSelectedLocation();
    if (!loc) {
      inspectorEmpty.classList.remove("hidden");
      inspectorBody.classList.add("hidden");
      return;
    }

    inspectorEmpty.classList.add("hidden");
    inspectorBody.classList.remove("hidden");

    inspThumb.src = assetUrl(loc.assetPath);
    inspTag.textContent = (loc.region ? `Region ${loc.region} · ` : "") + (loc.levelRange || loc.category.replace("_", " "));
    inspTitle.textContent = loc.category === "permanent" && loc.progOrder <= 48
      ? `Step ${loc.progOrder}: ${loc.name}`
      : loc.name;
    inspKind.textContent = loc.kind + (loc.visibility === "hidden_discovery" ? " · Hidden Until Discovered" : "");

    const mapLocked = Boolean(loc.placed && isMapLocked(loc.mapId));
    const markerLocked = isMarkerLocked(loc);
    if (isJournalOnlyQuest(loc)) {
      const destLabel = loc.targetHubName || loc.pickedUpAtName || "Hub Interior";
      const fmtText = loc.questFormat === "hub_courier"
        ? `Courier Delivery → ${destLabel}`
        : `Inside ${destLabel}`;
      inspStatus.textContent = `Journal Only Token · ${fmtText}`;
      inspStatus.style.color = "#a5b8ff";
      inspX.value = "";
      inspY.value = "";
      inspX.disabled = true;
      inspY.disabled = true;
    } else if (loc.placed) {
      inspStatus.textContent = markerLocked
        ? `🔒 Locked on ${loc.mapId} (${Math.round(loc.x)}, ${Math.round(loc.y)})`
        : `Placed on ${loc.mapId} (${Math.round(loc.x)}, ${Math.round(loc.y)})`;
      inspStatus.style.color = markerLocked ? "#f2c978" : "#6ee7a4";
      inspX.value = Math.round(loc.x);
      inspY.value = Math.round(loc.y);
      inspX.disabled = markerLocked;
      inspY.disabled = markerLocked;
    } else {
      inspStatus.textContent = "Not placed yet — click on the map";
      inspStatus.style.color = "#f4be6b";
      inspX.value = "";
      inspY.value = "";
      inspX.disabled = true;
      inspY.disabled = true;
    }

    const sc = loc.scale ?? 1.0;
    const rad = loc.triggerRadius ?? 88;
    chkInspLocked.checked = Boolean(loc.locked || mapLocked);
    chkInspLocked.disabled = mapLocked || !loc.placed;
    inspScale.value = sc;
    inspScale.disabled = markerLocked;
    inspScaleVal.textContent = `${sc.toFixed(2)}×`;
    inspRadius.value = rad;
    inspRadius.disabled = markerLocked;
    inspRadiusVal.textContent = `${rad}px`;

    const isTravel = loc.category === "travel";
    const rotDeg = ((Math.round(Number(loc.rotation) || 0) % 360) + 360) % 360;
    inspRotateWrap.classList.toggle("hidden", !isTravel);
    inspRotate.value = rotDeg;
    inspRotate.disabled = markerLocked || !isTravel;
    inspRotateVal.textContent = `${rotDeg}°`;
    for (const rBtn of inspRotateWrap.querySelectorAll(".rot-btn")) {
      rBtn.disabled = markerLocked || !isTravel;
    }
    inspThumb.style.transform = rotDeg ? `rotate(${rotDeg}deg)` : "";

    btnDuplicate.classList.toggle("hidden", loc.category === "permanent");
    btnUnplace.disabled = !loc.placed || markerLocked;
    btnCenterCam.disabled = !loc.placed;

    // Rich description, services, boss info & linked quest markers
    inspDesc.textContent = loc.description || "";
    inspServices.innerHTML = "";
    for (const svc of loc.services || []) {
      const span = document.createElement("span");
      span.className = "svc-pill";
      span.textContent = svc;
      inspServices.appendChild(span);
    }

    if (loc.bossInfo) {
      inspBoss.classList.remove("hidden");
      inspBoss.innerHTML = `<strong>Boss:</strong> ${loc.bossInfo.boss}<br><strong>Plane:</strong> ${loc.bossInfo.plane}<br><strong>Guard Pips:</strong> ${loc.bossInfo.guardPips} &nbsp;|&nbsp; <strong>Weak:</strong> ${loc.bossInfo.weaknesses}`;
    } else {
      inspBoss.classList.add("hidden");
      inspBoss.innerHTML = "";
    }

    if (isFerryMarker(loc) && loc.placed) {
      inspFerryBox.classList.remove("hidden");
      const partner = loc.linkedFerryId
        ? worldData.locations.find((l) => l.id === loc.linkedFerryId && l.placed)
        : null;
      const isPicking = linkingFerryFromId === loc.id;
      const lockDis = markerLocked ? "disabled" : "";
      if (partner) {
        inspFerryBox.innerHTML = `
          <div><strong style="color:#5ce1e6;">Linked Ferry Route</strong><br>Connects to Ferry Pier (${Math.round(partner.x)}, ${Math.round(partner.y)})</div>
          <div class="ferry-actions">
            <button type="button" class="btn" id="btnFerryJump">Go to Partner</button>
            <button type="button" class="btn ferry-pick ${isPicking ? "active" : ""}" id="btnFerryPick" ${lockDis}>${isPicking ? "Click Partner on Map..." : "Relink"}</button>
            <button type="button" class="btn danger" id="btnFerryUnlink" ${lockDis}>Unlink</button>
          </div>
        `;
        inspFerryBox.querySelector("#btnFerryJump").addEventListener("click", () => {
          selectedId = partner.id;
          camX = partner.x;
          camY = partner.y;
          refreshUI();
        });
        inspFerryBox.querySelector("#btnFerryUnlink").addEventListener("click", () => {
          if (isMarkerLocked(loc)) return;
          unlinkFerry(loc.id);
          refreshUI();
          if (chkAutoSave.checked) saveWorldData(true);
        });
      } else {
        inspFerryBox.innerHTML = `
          <div><strong style="color:#f4be6b;">Ferry Not Linked</strong><br>Link this pier to another Ferry Crossing across the water.</div>
          <div class="ferry-actions">
            <button type="button" class="btn ferry-pick ${isPicking ? "active" : ""}" id="btnFerryPick" ${lockDis}>${isPicking ? "Click Partner Ferry on Map..." : "Link to Another Ferry"}</button>
          </div>
        `;
      }
      inspFerryBox.querySelector("#btnFerryPick").addEventListener("click", () => {
        if (isMarkerLocked(loc)) return;
        linkingFerryFromId = linkingFerryFromId === loc.id ? null : loc.id;
        stampTemplateId = null;
        refreshUI();
      });
    } else {
      inspFerryBox.classList.add("hidden");
      inspFerryBox.innerHTML = "";
    }

    inspQuestsList.innerHTML = "";
    const quests = loc.quests || [];
    if (loc.category === "quest_field" && loc.pickedUpAtId) {
      inspQuestsHead.textContent = loc.questFormat === "hub_courier"
        ? "Courier Route (Origin → Destination)"
        : "Picked Up From";
      const srcLoc = worldData.locations.find((l) => l.id === loc.pickedUpAtId);
      if (srcLoc) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quest-marker-btn";
        btn.innerHTML = `<img src="/${srcLoc.assetPath}" alt="" /><div><strong>${srcLoc.name}</strong><div style="color:#93a1b8;font-size:10.5px;">Origin Hub · Click to jump</div></div>`;
        btn.addEventListener("click", () => {
          selectedId = srcLoc.id;
          if (srcLoc.placed && srcLoc.mapId === activeMapId) {
            camX = srcLoc.x;
            camY = srcLoc.y;
          }
          refreshUI();
        });
        inspQuestsList.appendChild(btn);
      }
      if (loc.targetHubId && loc.targetHubId !== loc.pickedUpAtId) {
        const dstLoc = worldData.locations.find((l) => l.id === loc.targetHubId);
        if (dstLoc) {
          const dBtn = document.createElement("button");
          dBtn.type = "button";
          dBtn.className = "quest-marker-btn";
          const sameMap = dstLoc.mapId === activeMapId;
          const subTxt = dstLoc.placed
            ? (sameMap ? "Delivery Hub · Click to jump" : `Delivery Hub on ${dstLoc.mapId}`)
            : "Delivery Hub · Unplaced";
          dBtn.innerHTML = `<img src="/${dstLoc.assetPath}" alt="" /><div><strong>→ ${dstLoc.name}</strong><div style="color:#a5b8ff;font-size:10.5px;">${subTxt}</div></div>`;
          dBtn.addEventListener("click", () => {
            selectedId = dstLoc.id;
            if (dstLoc.placed && dstLoc.mapId === activeMapId) {
              camX = dstLoc.x;
              camY = dstLoc.y;
            }
            refreshUI();
          });
          inspQuestsList.appendChild(dBtn);
        }
      }
    } else if (quests.length > 0) {
      const qOverworldCount = quests.filter((q) => {
        if (!q.targetMarkerId) return false;
        const tLoc = worldData.locations.find((l) => l.id === q.targetMarkerId);
        return tLoc ? !isJournalOnlyQuest(tLoc) : q.placeOnOverworld !== false;
      }).length;
      inspQuestsHead.textContent = qOverworldCount > 0
        ? `Quests (${quests.length} · ${qOverworldCount} Overworld Pin${qOverworldCount === 1 ? "" : "s"})`
        : `Quests Resolved Here (${quests.length})`;

      for (const q of quests) {
        const card = document.createElement("div");
        card.className = "quest-link-card";
        const descHtml = q.description
          ? `<div style="margin:4px 0 5px;color:#cbd5e1;font-size:11px;line-height:1.35;">${q.description}</div>`
          : "";
        card.innerHTML = `
          <div class="quest-link-top">
            <span class="quest-link-title">${q.title}</span>
            <span class="lvl-badge">${q.category}</span>
          </div>
          ${descHtml}
          <div class="quest-link-sub">Giver: ${q.giver}<br>Boss: ${q.miniBoss}<br>Reward: ${q.reward}</div>
        `;
        if (q.targetMarkerId) {
          const targetLoc = worldData.locations.find((l) => l.id === q.targetMarkerId);
          if (targetLoc) {
            const mBtn = document.createElement("button");
            mBtn.type = "button";
            mBtn.className = "quest-marker-btn";
            let statusTxt;
            let statusColor;
            if (isJournalOnlyQuest(targetLoc)) {
              statusTxt = targetLoc.questFormat === "hub_courier"
                ? `Journal Token · Deliver to ${targetLoc.targetHubName || "Target Hub"}`
                : `Journal Token · Inside ${targetLoc.pickedUpAtName || "Hub"}`;
              statusColor = "#a5b8ff";
            } else {
              statusTxt = targetLoc.placed
                ? `Placed (${Math.round(targetLoc.x)}, ${Math.round(targetLoc.y)}) · Click to move`
                : "Unplaced · Click to arm & place";
              statusColor = targetLoc.placed ? "#6ee7a4" : "#f4be6b";
            }
            mBtn.innerHTML = `<img src="/${targetLoc.assetPath}" onerror="this.style.opacity='0.3'" alt="" /><div><strong>${targetLoc.name}</strong><div style="color:${statusColor};font-size:10.5px;">${statusTxt}</div></div>`;
            mBtn.addEventListener("click", () => {
              selectedId = targetLoc.id;
              if (targetLoc.placed && targetLoc.mapId === activeMapId) {
                camX = targetLoc.x;
                camY = targetLoc.y;
                if (zoom < 0.4) zoom = 0.55;
              }
              refreshUI();
            });
            card.appendChild(mBtn);
          }
        }
        inspQuestsList.appendChild(card);
      }
    } else {
      inspQuestsHead.textContent = "Quests";
      inspQuestsList.innerHTML = `<div class="quest-link-sub">No linked town quests for this marker.</div>`;
    }
  }

  function refreshUI() {
    updateMapLockUI();
    updateProgress();
    updateArmedBanner();
    renderPalette();
    renderInspector();
  }

  async function saveWorldPaint(silent = false) {
    const payload = window.RODWorldPaint.exportPayload();
    const res = await fetch("/api/world-paint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok && !silent) alert("Failed to save terrain & zone paint.");
    return res.ok;
  }

  async function saveWorldData(silent = false, explicitLockUpdate = false) {
    const locPayload = explicitLockUpdate
      ? { ...worldData, explicitLockUpdate: true }
      : worldData;
    const [resLoc, okPaint] = await Promise.all([
      fetch("/api/world-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locPayload),
      }),
      saveWorldPaint(silent),
    ]);
    if (!resLoc.ok || !okPaint) {
      if (!silent) alert("Failed to save world data.");
      return;
    }
    const prevText = btnSave.textContent;
    btnSave.textContent = "Saved ✓";
    setTimeout(() => {
      btnSave.textContent = prevText;
    }, 1100);
  }

  function getVisiblePlacedOnActiveMap() {
    return getPlacedOnActiveMap().filter(isLocationVisibleOnCanvas);
  }

  function autoAdvanceSelection() {
    if (!chkAutoAdvance.checked) return;
    const items = getVisiblePaletteItems();
    const nextUnplaced = items.find((l) => !l.placed && !isJournalOnlyQuest(l));
    if (nextUnplaced) {
      selectedId = nextUnplaced.id;
    }
  }

  function stampNewInstance(templateId, wx, wy) {
    if (isMapLocked(activeMapId)) {
      armedBanner.textContent = `🔒 ${activeMapId} is LOCKED — unlock Map first before stamping new pins.`;
      return;
    }
    const tmpl = worldData.locations.find((l) => l.id === templateId);
    if (!tmpl) return;
    pushLocationsUndo();
    const x = Math.round(Math.max(0, Math.min(MAP_SIZE, wx)));
    const y = Math.round(Math.max(0, Math.min(MAP_SIZE, wy)));

    // Use the base slot first if unplaced, otherwise mint a new numbered instance
    if (!tmpl.placed) {
      tmpl.mapId = activeMapId;
      tmpl.placed = true;
      tmpl.x = x;
      tmpl.y = y;
      tmpl.locked = false;
      tmpl.linkedFerryId = null;
      tmpl.rotation = 0;
      selectedId = tmpl.id;
    } else {
      let idx = 2;
      while (worldData.locations.some((l) => l.id === `${templateId}_inst_${idx}`)) {
        idx++;
      }
      const clone = {
        ...tmpl,
        id: `${templateId}_inst_${idx}`,
        name: tmpl.name,
        mapId: activeMapId,
        placed: true,
        x,
        y,
        locked: false,
        linkedFerryId: null,
        rotation: 0,
      };
      worldData.locations.push(clone);
      selectedId = clone.id;
    }
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  }

  function placeLocationAt(loc, wx, wy) {
    if (isJournalOnlyQuest(loc)) {
      const destLabel = loc.targetHubName || loc.pickedUpAtName || "Hub Interior";
      const verb = loc.questFormat === "hub_courier" ? "at " : "inside ";
      armedBanner.textContent = `${loc.name} is a Journal Only token (plays ${verb}${destLabel}) — not placed on Overworld.`;
      return;
    }
    if (isMarkerLocked(loc)) {
      armedBanner.textContent = `🔒 ${loc.name} is LOCKED — unlock it before moving or re-placing.`;
      return;
    }
    if (isMapLocked(activeMapId)) {
      armedBanner.textContent = `🔒 ${activeMapId} is LOCKED — unlock Map first before placing pins.`;
      return;
    }
    pushLocationsUndo();
    loc.mapId = activeMapId;
    loc.placed = true;
    loc.x = Math.round(Math.max(0, Math.min(MAP_SIZE, wx)));
    loc.y = Math.round(Math.max(0, Math.min(MAP_SIZE, wy)));
    autoAdvanceSelection();
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  }

  function findMarkerAtWorld(wx, wy) {
    const placed = getVisiblePlacedOnActiveMap();
    for (let i = placed.length - 1; i >= 0; i--) {
      const m = placed[i];
      const rad = (BASE_MARKER_PX * (m.scale ?? 1.0)) / 2;
      const dx = wx - m.x;
      const dy = wy - m.y;
      if (dx * dx + dy * dy <= rad * rad) return m;
    }
    return null;
  }

  // Events
  modeTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".mode-tab");
    if (!btn) return;
    setMode(btn.dataset.mode);
  });

  paintToolTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tool-btn");
    if (!btn) return;
    setPaintTool(btn.dataset.tool);
  });

  rngBrushSize.addEventListener("input", () => {
    brushSize = Number(rngBrushSize.value);
    brushSizeVal.textContent = `${brushSize} hex`;
    updateArmedBanner();
  });

  rngPaintOpacity.addEventListener("input", () => {
    const pct = Number(rngPaintOpacity.value);
    paintOpacity = pct / 100;
    paintOpacityVal.textContent = `${pct}%`;
  });

  chkHexGridTop.addEventListener("change", () => syncHexGridCheckboxes(chkHexGridTop.checked));
  chkShowHexGrid.addEventListener("change", () => syncHexGridCheckboxes(chkShowHexGrid.checked));

  btnShowAllColors.addEventListener("click", () => {
    if (activeMode === "zone") window.RODWorldPaint.hiddenZones.clear();
    else window.RODWorldPaint.hiddenTerrain.clear();
    window.RODWorldPaint.rebuildLayerCanvas(getActivePaintLayer(), activeMapId);
    renderSwatchBar();
  });

  btnClearPaintLayer.addEventListener("click", () => {
    if (isMapLocked(activeMapId)) {
      alert(`${activeMapId} is LOCKED. Unlock the map first before clearing Terrain or Zone paint.`);
      return;
    }
    const label = activeMode === "zone" ? "Level Zone" : "Terrain";
    if (!confirm(`Clear all painted ${label} hexes on ${activeMapId}?`)) return;
    const layer = getActivePaintLayer();
    pushUndoEntry(snapshotPaintState(layer, activeMapId));
    window.RODWorldPaint.clearLayer(layer, activeMapId);
    if (chkAutoSave.checked) saveWorldPaint(true);
  });

  btnProceduralPlace.addEventListener("click", () => {
    if (isMapLocked(activeMapId)) {
      alert(`${activeMapId} is LOCKED. Unlock the map before re-rolling locations.`);
      return;
    }
    const keepPlaced = chkKeepPlaced.checked;
    const undoSnap = snapshotLocationsState();
    const res = window.RODWorldPaint.procedurallyPlaceMap(worldData, activeMapId, { keepPlaced });
    if (!res.ok) {
      alert(res.message);
      return;
    }
    if (res.placedCount > 0) pushUndoEntry(undoSnap);
    if (res.nothingToPlace) {
      armedBanner.textContent = `All unlocked locations on ${activeMapId} are already placed (uncheck "Keep already placed" to re-roll).`;
    } else if (res.zonePaintedCount === 0) {
      armedBanner.textContent = `Placed ${res.placedCount} locations using Terrain + Level Order (paint 5-Level Zones for exact zone targeting!)`;
    } else {
      armedBanner.textContent = `Procedurally placed ${res.placedCount} locations on ${activeMapId} (Zone Level + Allowed Terrains + 12+ Hex Zone Buffer · Quest markers untouched)`;
    }
    if (res.skipped && res.skipped.length > 0) {
      alert(`Placed ${res.placedCount} locations. Could not fit ${res.skipped.length} inside matching Zone + Allowed Terrain: ${res.skipped.join(", ")}`);
    }
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  });

  btnProceduralPlaceQuests.addEventListener("click", () => {
    if (isMapLocked(activeMapId)) {
      alert(`${activeMapId} is LOCKED. Unlock the map before re-rolling quest sites.`);
      return;
    }
    const keepPlaced = chkKeepPlaced.checked;
    const undoSnap = snapshotLocationsState();
    const res = window.RODWorldPaint.procedurallyPlaceQuests(worldData, activeMapId, { keepPlaced });
    if (!res.ok) {
      alert(res.message || "Unable to place quest sites on this map.");
      return;
    }
    if (res.placedCount > 0) {
      pushUndoEntry(undoSnap);
      syncShowQuestsCheckboxes(true);
    }
    if (res.placedCount === 0 && (!res.missingHubs || res.missingHubs.length === 0) && (!res.skipped || res.skipped.length === 0)) {
      armedBanner.textContent = `All unlocked wilderness quest pins on ${activeMapId} are already placed (uncheck "Keep already placed" to re-roll).`;
    } else if (res.zonePaintedCount === 0) {
      armedBanner.textContent = `Placed ${res.placedCount} wilderness quest sites on ${activeMapId} around Hubs (paint 5-Level Zones for exact zone targeting!).`;
    } else {
      armedBanner.textContent = `Procedurally placed ${res.placedCount} wilderness quest sites on ${activeMapId} (inside parent Hub's Zone · safe walk-path · coastal/biome fit · Journal-only excluded).`;
    }
    const notices = [];
    if (res.missingHubs && res.missingHubs.length > 0) {
      notices.push(`Place parent Hubs first for ${res.missingHubs.length} quest(s): ${res.missingHubs.slice(0, 6).join(", ")}${res.missingHubs.length > 6 ? "…" : ""}`);
    }
    if (res.skipped && res.skipped.length > 0) {
      notices.push(`Could not fit ${res.skipped.length} inside matching Zone + Terrain near Hub: ${res.skipped.slice(0, 6).join(", ")}${res.skipped.length > 6 ? "…" : ""}`);
    }
    if (notices.length > 0) {
      alert(notices.join("\n\n"));
    }
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  });

  if (btnLockMap) {
    btnLockMap.addEventListener("click", () => {
      if (!Array.isArray(worldData.lockedMaps)) worldData.lockedMaps = [];
      const currentlyLocked = isMapLocked(activeMapId);
      const placedCount = worldData.locations.filter((l) => l.placed && l.mapId === activeMapId).length;
      if (currentlyLocked) {
        if (!confirm(`Unlock ${activeMapId} and all ${placedCount} locked pins (Hubs, Quests & Travel) so they can be moved, re-rolled, or cleared?`)) {
          return;
        }
        worldData.lockedMaps = worldData.lockedMaps.filter((m) => m !== activeMapId);
        for (const loc of worldData.locations) {
          if (loc.mapId === activeMapId) loc.locked = false;
        }
        armedBanner.textContent = `Unlocked ${activeMapId} (${placedCount} placed pins + paint unlocked).`;
      } else {
        worldData.lockedMaps.push(activeMapId);
        let lockedTotal = 0;
        for (const loc of worldData.locations) {
          if (loc.mapId === activeMapId && loc.placed) {
            loc.locked = true;
            lockedTotal++;
          }
        }
        armedBanner.textContent = `🔒 Locked all ${lockedTotal} placed pins (Hubs, Quests & Travel) + paint on ${activeMapId}.`;
      }
      refreshUI();
      saveWorldData(true, true);
    });
  }

  if (chkShowQuestsTop) {
    chkShowQuestsTop.addEventListener("change", () => {
      syncShowQuestsCheckboxes(chkShowQuestsTop.checked);
      refreshUI();
    });
  }

  if (chkShowQuests) {
    chkShowQuests.addEventListener("change", () => {
      syncShowQuestsCheckboxes(chkShowQuests.checked);
      refreshUI();
    });
  }

  function clearLocationsScope(scopeMapId) {
    const isAll = scopeMapId === "all";
    if (!isAll && isMapLocked(scopeMapId)) {
      alert(`${scopeMapId} is LOCKED. Unlock the map first before clearing its pins.`);
      return;
    }
    const targets = worldData.locations.filter(
      (l) => l.placed && !isMarkerLocked(l) && !isMapLocked(l.mapId) && (isAll || l.mapId === scopeMapId)
    );
    if (targets.length === 0) {
      alert(
        isAll
          ? "No unlocked placed locations to clear across unlocked maps. (Locked maps & pins are protected.)"
          : `All placed locations on ${scopeMapId} are currently LOCKED or already clear.`
      );
      return;
    }
    const label = isAll ? "ALL unlocked maps (locked maps & pins will stay safe)" : scopeMapId;
    if (!confirm(`Clear ${targets.length} unlocked placed marker(s) on ${label}?`)) return;
    pushLocationsUndo();

    linkingFerryFromId = null;
    stampTemplateId = null;

    // Remove unlocked cloned _inst_N markers in scope, and unplace remaining unlocked markers in scope
    worldData.locations = worldData.locations.filter(
      (l) => !(/_inst_\d+$/.test(l.id) && !isMarkerLocked(l) && !isMapLocked(l.mapId) && (isAll || l.mapId === scopeMapId))
    );
    for (const loc of worldData.locations) {
      if ((isAll || loc.mapId === scopeMapId) && !isMarkerLocked(loc) && !isMapLocked(loc.mapId)) {
        if (loc.linkedFerryId) unlinkFerry(loc.id);
        loc.placed = false;
        loc.x = null;
        loc.y = null;
        loc.locked = false;
      }
    }

    const items = getVisiblePaletteItems();
    selectedId = items.length > 0 ? items[0].id : null;
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  }

  btnClearMapLocations.addEventListener("click", () => clearLocationsScope(activeMapId));
  btnClearAllLocations.addEventListener("click", () => clearLocationsScope("all"));

  mapTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".map-tab");
    if (!btn) return;
    activeMapId = btn.dataset.map;
    for (const el of mapTabs.querySelectorAll(".map-tab")) {
      el.classList.toggle("active", el === btn);
    }
    window.RODWorldPaint.setMap(activeMapId);
    const mapZones = window.RODWorldPaint.ZONES_BY_MAP[activeMapId] || [];
    if (mapZones.length > 0 && !mapZones.some((z) => z.code === activeZoneCode)) {
      activeZoneCode = mapZones[0].code;
    }
    const mapBiomes = window.RODWorldPaint.BIOMES_BY_MAP[activeMapId] || [];
    if (mapBiomes.length > 0 && !mapBiomes.some((b) => b.code === activeTerrainCode)) {
      activeTerrainCode = mapBiomes[0].code;
    }
    const items = getVisiblePaletteItems();
    if (items.length > 0 && !items.some((i) => i.id === selectedId)) {
      selectedId = items.find((i) => !i.placed && !isJournalOnlyQuest(i))?.id
        || items.find((i) => !i.placed)?.id
        || items[0].id;
    }
    renderSwatchBar();
    updateActiveSwatchCard();
    fitMapToScreen();
    refreshUI();
  });

  filterTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-tab");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    for (const el of filterTabs.querySelectorAll(".filter-tab")) {
      el.classList.toggle("active", el === btn);
    }
    const items = getVisiblePaletteItems();
    if (items.length > 0) {
      const pick = items.find((i) => !i.placed && !isJournalOnlyQuest(i))
        || items.find((i) => !i.placed)
        || items[0];
      selectedId = pick.id;
      stampTemplateId = isRepeatableType(pick) ? pick.id : null;
    } else {
      stampTemplateId = null;
    }
    refreshUI();
  });

  btnUndo.addEventListener("click", performUndo);
  btnFitMap.addEventListener("click", fitMapToScreen);
  btnSave.addEventListener("click", () => saveWorldData(false));

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveWorldData(false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
      if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      performUndo();
      return;
    }
    if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "u") {
      if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      e.preventDefault();
      performUndo();
      return;
    }
    if (e.key === "Escape" && (stampTemplateId || linkingFerryFromId)) {
      stampTemplateId = null;
      linkingFerryFromId = null;
      refreshUI();
      return;
    }
    if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    const lk = e.key.toLowerCase();
    if (lk === "h") {
      syncHexGridCheckboxes(!chkShowHexGrid.checked);
      return;
    }
    if (!e.ctrlKey && !e.metaKey && !e.altKey && lk === "q") {
      syncShowQuestsCheckboxes(!(chkShowQuests && chkShowQuests.checked));
      refreshUI();
      return;
    }
    if (activeMode === "terrain" || activeMode === "zone") {
      if (lk === "b") { setPaintTool("brush"); return; }
      if (lk === "g") { setPaintTool("bucket"); return; }
      if (lk === "e") { setPaintTool("eraser"); return; }
      if (e.key === "[" && brushSize > 1) {
        brushSize--;
        rngBrushSize.value = brushSize;
        brushSizeVal.textContent = `${brushSize} hex`;
        updateArmedBanner();
        return;
      }
      if (e.key === "]" && brushSize < 15) {
        brushSize++;
        rngBrushSize.value = brushSize;
        brushSizeVal.textContent = `${brushSize} hex`;
        updateArmedBanner();
        return;
      }
    }
    keys.add(lk);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (e.button === 1 || e.button === 2 || keys.has(" ")) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY, camX, camY };
      canvas.style.cursor = "grabbing";
      return;
    }

    if (e.button === 0) {
      const w = screenToWorld(sx, sy);

      // Terrain / Zone hex painting
      if (activeMode === "terrain" || activeMode === "zone") {
        if (isMapLocked(activeMapId)) {
          armedBanner.textContent = `🔒 ${activeMapId} is LOCKED — Switch to Place mode and Unlock Map before editing paint.`;
          return;
        }
        if (w.x < 0 || w.x > MAP_SIZE || w.y < 0 || w.y > MAP_SIZE) return;
        const layer = getActivePaintLayer();
        const code = getActivePaintCode();
        const beforeSnap = snapshotPaintState(layer, activeMapId);
        if (paintTool === "bucket") {
          const changed = window.RODWorldPaint.bucketFillAt(layer, activeMapId, w.x, w.y, code);
          if (changed) {
            pushUndoEntry(beforeSnap);
            if (chkAutoSave.checked) saveWorldPaint(true);
          }
        } else {
          isPainting = true;
          lastPaintWorld = w;
          pendingPaintUndo = beforeSnap;
          if (window.RODWorldPaint.paintBrushLine(layer, activeMapId, w.x, w.y, w.x, w.y, code, brushSize)) {
            paintDirty = true;
          }
        }
        return;
      }

      const hit = findMarkerAtWorld(w.x, w.y);
      if (linkingFerryFromId) {
        if (hit && isFerryMarker(hit) && hit.id !== linkingFerryFromId) {
          linkFerries(linkingFerryFromId, hit.id);
        } else {
          linkingFerryFromId = null;
          refreshUI();
        }
        return;
      }
      if (hit) {
        selectedId = hit.id;
        stampTemplateId = null;
        if (!isMarkerLocked(hit)) {
          pendingDragUndo = { startX: hit.x, startY: hit.y, snap: snapshotLocationsState() };
          draggingMarker = hit;
        }
        refreshUI();
        return;
      }

      if (stampTemplateId && w.x >= 0 && w.x <= MAP_SIZE && w.y >= 0 && w.y <= MAP_SIZE) {
        if (isMapLocked(activeMapId)) {
          armedBanner.textContent = `🔒 ${activeMapId} is LOCKED — unlock Map first before stamping new pins.`;
          return;
        }
        stampNewInstance(stampTemplateId, w.x, w.y);
        return;
      }

      const sel = getSelectedLocation();
      if (sel && w.x >= 0 && w.x <= MAP_SIZE && w.y >= 0 && w.y <= MAP_SIZE) {
        placeLocationAt(sel, w.x, w.y);
      }
    }
  });

  window.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (isPanning) {
      camX = panStart.camX - (e.clientX - panStart.x) / zoom;
      camY = panStart.camY - (e.clientY - panStart.y) / zoom;
      return;
    }

    const w = screenToWorld(sx, sy);
    if (sx >= 0 && sx <= rect.width && sy >= 0 && sy <= rect.height) {
      mouseWorld = w;
      const hoverInfo = window.RODWorldPaint.getHoverInfo(activeMapId, w.x, w.y);
      let readout = `X: ${Math.round(w.x)} , Y: ${Math.round(w.y)}`;
      if (hoverInfo && hoverInfo.biome) readout += ` | ${hoverInfo.biome.name}`;
      if (hoverInfo && hoverInfo.zone) readout += ` | ${hoverInfo.zone.name}`;
      coordReadout.textContent = readout;
    } else {
      mouseWorld = null;
    }

    if (isPainting && (activeMode === "terrain" || activeMode === "zone")) {
      const prev = lastPaintWorld || w;
      if (window.RODWorldPaint.paintBrushLine(getActivePaintLayer(), activeMapId, prev.x, prev.y, w.x, w.y, getActivePaintCode(), brushSize)) {
        paintDirty = true;
      }
      lastPaintWorld = w;
      hideTooltip();
      return;
    }

    if (draggingMarker) {
      draggingMarker.x = Math.round(Math.max(0, Math.min(MAP_SIZE, w.x)));
      draggingMarker.y = Math.round(Math.max(0, Math.min(MAP_SIZE, w.y)));
      hideTooltip();
      renderInspector();
      return;
    }

    if (activeMode === "place" && e.target === canvas && sx >= 0 && sx <= rect.width && sy >= 0 && sy <= rect.height) {
      const hovered = findMarkerAtWorld(w.x, w.y);
      if (hovered) {
        showTooltipFor(hovered, e.clientX, e.clientY);
      } else {
        hideTooltip();
      }
    } else if (!e.target.closest(".loc-card") && !e.target.closest(".swatch-btn") && !e.target.closest(".swatch-hide-btn")) {
      hideTooltip();
    }
  });

  window.addEventListener("mouseup", () => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = "crosshair";
    }
    if (isPainting) {
      isPainting = false;
      lastPaintWorld = null;
      if (paintDirty) {
        paintDirty = false;
        if (pendingPaintUndo) pushUndoEntry(pendingPaintUndo);
        if (chkAutoSave.checked) saveWorldPaint(true);
      }
      pendingPaintUndo = null;
    }
    if (draggingMarker) {
      const moved = pendingDragUndo && (draggingMarker.x !== pendingDragUndo.startX || draggingMarker.y !== pendingDragUndo.startY);
      if (moved) pushUndoEntry(pendingDragUndo.snap);
      pendingDragUndo = null;
      draggingMarker = null;
      refreshUI();
      if (moved && chkAutoSave.checked) saveWorldData(true);
    }
  });

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const before = screenToWorld(sx, sy);
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      zoom = Math.max(0.06, Math.min(1.8, zoom * factor));
      camX = before.x - (sx - canvas.width / 2) / zoom;
      camY = before.y - (sy - canvas.height / 2) / zoom;
    },
    { passive: false }
  );

  // Inspector bindings
  chkInspLocked.addEventListener("change", () => {
    const loc = getSelectedLocation();
    if (!loc || (loc.placed && isMapLocked(loc.mapId))) return;
    loc.locked = chkInspLocked.checked;
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  });

  inspX.addEventListener("change", () => {
    const loc = getSelectedLocation();
    if (!loc || !loc.placed || isMarkerLocked(loc)) return;
    pushLocationsUndo();
    loc.x = Math.round(Math.max(0, Math.min(MAP_SIZE, Number(inspX.value) || 0)));
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  });

  inspY.addEventListener("change", () => {
    const loc = getSelectedLocation();
    if (!loc || !loc.placed || isMarkerLocked(loc)) return;
    pushLocationsUndo();
    loc.y = Math.round(Math.max(0, Math.min(MAP_SIZE, Number(inspY.value) || 0)));
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  });

  inspScale.addEventListener("input", () => {
    const loc = getSelectedLocation();
    if (!loc || isMarkerLocked(loc)) return;
    loc.scale = Number(inspScale.value);
    inspScaleVal.textContent = `${loc.scale.toFixed(2)}×`;
  });
  inspScale.addEventListener("change", () => {
    const loc = getSelectedLocation();
    if (loc && !isMarkerLocked(loc) && chkAutoSave.checked) saveWorldData(true);
  });

  inspRadius.addEventListener("input", () => {
    const loc = getSelectedLocation();
    if (!loc || isMarkerLocked(loc)) return;
    loc.triggerRadius = Number(inspRadius.value);
    inspRadiusVal.textContent = `${loc.triggerRadius}px`;
  });
  inspRadius.addEventListener("change", () => {
    const loc = getSelectedLocation();
    if (loc && !isMarkerLocked(loc) && chkAutoSave.checked) saveWorldData(true);
  });

  function applyMarkerRotation(deg, commitSave = false) {
    const loc = getSelectedLocation();
    if (!loc || loc.category !== "travel" || isMarkerLocked(loc)) return;
    const norm = ((Math.round(Number(deg) || 0) % 360) + 360) % 360;
    loc.rotation = norm;
    inspRotate.value = norm;
    inspRotateVal.textContent = `${norm}°`;
    inspThumb.style.transform = norm ? `rotate(${norm}deg)` : "";
    if (commitSave && chkAutoSave.checked) saveWorldData(true);
  }

  inspRotate.addEventListener("input", () => {
    applyMarkerRotation(inspRotate.value, false);
  });
  inspRotate.addEventListener("change", () => {
    applyMarkerRotation(inspRotate.value, true);
  });
  for (const rBtn of inspRotateWrap.querySelectorAll("[data-rot-delta]")) {
    rBtn.addEventListener("click", () => {
      const loc = getSelectedLocation();
      if (!loc || loc.category !== "travel" || isMarkerLocked(loc)) return;
      pushLocationsUndo();
      const delta = Number(rBtn.dataset.rotDelta) || 0;
      applyMarkerRotation((Number(loc.rotation) || 0) + delta, true);
    });
  }
  btnRotReset.addEventListener("click", () => {
    const loc = getSelectedLocation();
    if (!loc || loc.category !== "travel" || isMarkerLocked(loc)) return;
    pushLocationsUndo();
    applyMarkerRotation(0, true);
  });

  btnCenterCam.addEventListener("click", () => {
    const loc = getSelectedLocation();
    if (!loc || !loc.placed) return;
    camX = loc.x;
    camY = loc.y;
    if (zoom < 0.45) zoom = 0.6;
  });

  btnUnplace.addEventListener("click", () => {
    const loc = getSelectedLocation();
    if (!loc || isMarkerLocked(loc)) return;
    pushLocationsUndo();
    unlinkFerry(loc.id);
    if (linkingFerryFromId === loc.id) linkingFerryFromId = null;
    if (/_inst_\d+$/.test(loc.id)) {
      const rootId = getTemplateRootId(loc.id);
      worldData.locations = worldData.locations.filter((l) => l.id !== loc.id);
      selectedId = rootId;
      stampTemplateId = rootId;
    } else {
      loc.placed = false;
      loc.x = null;
      loc.y = null;
    }
    refreshUI();
    if (chkAutoSave.checked) saveWorldData(true);
  });

  btnDuplicate.addEventListener("click", () => {
    const loc = getSelectedLocation();
    if (!loc || loc.category === "permanent") return;
    const rootId = getTemplateRootId(loc.id);
    stampTemplateId = rootId;
    refreshUI();
  });

  // Render loop
  let lastT = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // Keyboard pan
    const panSpeed = 900 / zoom;
    let vx = 0;
    let vy = 0;
    if (keys.has("w") || keys.has("arrowup")) vy -= 1;
    if (keys.has("s") || keys.has("arrowdown")) vy += 1;
    if (keys.has("a") || keys.has("arrowleft")) vx -= 1;
    if (keys.has("d") || keys.has("arrowright")) vx += 1;
    if (vx || vy) {
      camX += vx * panSpeed * dt;
      camY += vy * panSpeed * dt;
    }

    zoomReadout.textContent = `Zoom: ${Math.round(zoom * 100)}%`;

    ctx.fillStyle = "#080a0f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camX, -camY);

    // Draw visible 512x512 tiles
    const halfW = canvas.width / 2 / zoom;
    const halfH = canvas.height / 2 / zoom;
    const minC = Math.max(0, Math.floor((camX - halfW) / TILE_SIZE));
    const maxC = Math.min(15, Math.floor((camX + halfW) / TILE_SIZE));
    const minR = Math.max(0, Math.floor((camY - halfH) / TILE_SIZE));
    const maxR = Math.min(15, Math.floor((camY + halfH) / TILE_SIZE));

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const tile = getTile(activeMapId, c, r);
        if (tile) {
          ctx.drawImage(tile, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE + 0.5, TILE_SIZE + 0.5);
        } else {
          ctx.fillStyle = "#131722";
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Subtle 8192x8192 boundary
    ctx.strokeStyle = "rgba(217, 167, 74, 0.35)";
    ctx.lineWidth = Math.max(2, 2 / zoom);
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Draw Terrain / Zone painted hex layers + 3px hex grid
    window.RODWorldPaint.drawPaintedLayers(ctx, chkShowTerrain.checked, chkShowZones.checked, paintOpacity);
    if (chkShowHexGrid.checked) {
      window.RODWorldPaint.drawHexGrid(ctx, camX, camY, zoom, canvas.width, canvas.height);
    }

    // Optional Valen reference token positioned cleanly outside Highcrown's current gate
    if (chkShowHeroScale.checked && activeMapId === "map_01" && valenImg) {
      const highcrown = worldData.locations.find(
        (l) => l.id === "loc_01_overgrown_garden_sanctuary" && l.placed && l.x != null && l.y != null
      );
      const hcScale = highcrown ? highcrown.scale ?? 1.0 : 1.0;
      const offset = Math.round((148 * hcScale * 0.5 + 36) * 0.707);
      const sx = highcrown ? Math.round(highcrown.x - offset) : 5808;
      const sy = highcrown ? Math.round(highcrown.y + offset) : 6665;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(valenImg, sx - 64, sy - 64, 128, 128);
      ctx.restore();
    }

    // Draw linked Ferry water routes across straits
    const drawnPairs = new Set();
    ctx.save();
    for (const loc of worldData.locations) {
      if (!loc.placed || loc.mapId !== activeMapId || !loc.linkedFerryId) continue;
      const partner = worldData.locations.find((l) => l.id === loc.linkedFerryId && l.placed && l.mapId === activeMapId);
      if (!partner) continue;
      const pairKey = [loc.id, partner.id].sort().join("::");
      if (drawnPairs.has(pairKey)) continue;
      drawnPairs.add(pairKey);

      const isActivePair = selectedId === loc.id || selectedId === partner.id;
      ctx.setLineDash([16 / zoom, 10 / zoom]);
      ctx.lineWidth = Math.max(2.5, (isActivePair ? 4 : 3) / zoom);
      ctx.strokeStyle = isActivePair ? "rgba(92, 225, 230, 0.95)" : "rgba(92, 225, 230, 0.6)";
      ctx.beginPath();
      ctx.moveTo(loc.x, loc.y);
      ctx.lineTo(partner.x, partner.y);
      ctx.stroke();
    }
    ctx.restore();

    // Draw dashed quest tether lines between a selected Hub and its placed overworld quest markers
    const activeSel = getSelectedLocation();
    if (activeSel && activeSel.placed && activeSel.mapId === activeMapId) {
      const tetherTargets = [];
      if (Array.isArray(activeSel.linkedQuestMarkerIds)) {
        for (const tid of activeSel.linkedQuestMarkerIds) {
          const t = worldData.locations.find((l) => l.id === tid);
          if (t && t.placed && t.mapId === activeMapId && isLocationVisibleOnCanvas(t)) {
            tetherTargets.push(t);
          }
        }
      } else if (activeSel.category === "quest_field" && activeSel.pickedUpAtId) {
        const srcHub = worldData.locations.find((l) => l.id === activeSel.pickedUpAtId);
        if (srcHub && srcHub.placed && srcHub.mapId === activeMapId) {
          tetherTargets.push(srcHub);
        }
      }
      if (tetherTargets.length > 0) {
        ctx.save();
        ctx.setLineDash([12 / zoom, 8 / zoom]);
        ctx.lineWidth = Math.max(2, 2.5 / zoom);
        ctx.strokeStyle = "rgba(242, 201, 120, 0.78)";
        for (const t of tetherTargets) {
          ctx.beginPath();
          ctx.moveTo(activeSel.x, activeSel.y);
          ctx.lineTo(t.x, t.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Draw visible placed markers
    const placed = getVisiblePlacedOnActiveMap();
    for (const loc of placed) {
      const size = BASE_MARKER_PX * (loc.scale ?? 1.0);
      const isSel = loc.id === selectedId;

      if (chkShowRings.checked) {
        ctx.beginPath();
        ctx.arc(loc.x, loc.y, loc.triggerRadius ?? 88, 0, Math.PI * 2);
        ctx.strokeStyle = isSel ? "rgba(242, 201, 120, 0.85)" : "rgba(70, 201, 128, 0.45)";
        ctx.lineWidth = Math.max(2, 2 / zoom);
        ctx.stroke();
      }

      const img = getMarkerImage(loc.assetPath);
      if (img) {
        const rotDeg = loc.rotation ?? 0;
        ctx.save();
        if (isSel) {
          ctx.shadowColor = "rgba(242, 201, 120, 0.9)";
          ctx.shadowBlur = 18;
        }
        if (rotDeg !== 0) {
          ctx.translate(loc.x, loc.y);
          ctx.rotate((rotDeg * Math.PI) / 180);
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
          ctx.drawImage(img, loc.x - size / 2, loc.y - size / 2, size, size);
        }
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(loc.x, loc.y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = "#d9a74a";
        ctx.fill();
      }

      if (chkShowLabels.checked) {
        const fontSize = Math.max(18, Math.round(14 / Math.max(0.25, zoom)));
        ctx.font = `700 ${fontSize}px "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        const labelText = loc.locNum ? `#${loc.locNum} ${loc.name}` : loc.name;
        const tw = ctx.measureText(labelText).width + 18;
        const ly = loc.y + size / 2 + fontSize + 6;
        ctx.fillStyle = "rgba(10, 12, 18, 0.82)";
        ctx.fillRect(loc.x - tw / 2, ly - fontSize, tw, fontSize + 8);
        ctx.fillStyle = isSel ? "#f2c978" : "#e9eef7";
        ctx.fillText(labelText, loc.x, ly);
      }
    }

    // Hover placement ghost OR hex paint brush preview
    if ((activeMode === "terrain" || activeMode === "zone") && mouseWorld && !isPanning && !isMapLocked(activeMapId)) {
      const items = getActiveSwatchItems();
      const activeCode = activeMode === "zone" ? activeZoneCode : activeTerrainCode;
      const activeItem = items.find((x) => x.code === activeCode);
      const previewRadius = paintTool === "bucket" ? 1 : brushSize;
      window.RODWorldPaint.drawBrushPreview(ctx, mouseWorld.x, mouseWorld.y, previewRadius, activeItem ? activeItem.color : "#ffffff", zoom, paintTool === "eraser");
    } else if (activeMode === "place" && !isMapLocked(activeMapId)) {
      const ghostLoc = stampTemplateId
        ? worldData.locations.find((l) => l.id === stampTemplateId)
        : getSelectedLocation();
      if (ghostLoc && !isJournalOnlyQuest(ghostLoc) && (stampTemplateId || (!isMarkerLocked(ghostLoc) && (!ghostLoc.placed || ghostLoc.mapId !== activeMapId))) && mouseWorld && !draggingMarker && !isPanning) {
        if (mouseWorld.x >= 0 && mouseWorld.x <= MAP_SIZE && mouseWorld.y >= 0 && mouseWorld.y <= MAP_SIZE) {
          const size = BASE_MARKER_PX * (ghostLoc.scale ?? 1.0);
          const img = getMarkerImage(ghostLoc.assetPath);
          ctx.save();
          ctx.globalAlpha = 0.65;
          if (img) {
            ctx.drawImage(img, mouseWorld.x - size / 2, mouseWorld.y - size / 2, size, size);
          }
          ctx.restore();
        }
      }
    }

    ctx.restore();
    requestAnimationFrame(frame);
  }

  async function init() {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    valenImg = await loadImage("/assets/tokens/valen_hp1.webp");
    const [resLoc, resPaint] = await Promise.all([
      fetch("/api/world-locations"),
      fetch("/api/world-paint"),
    ]);
    if (resLoc.ok) {
      worldData = await resLoc.json();
      if (!Array.isArray(worldData.lockedMaps)) worldData.lockedMaps = [];
    }
    if (resPaint.ok) {
      const paintPayload = await resPaint.json();
      window.RODWorldPaint.loadPayload(paintPayload);
    }
    window.RODWorldPaint.setMap(activeMapId);

    const items = getVisiblePaletteItems();
    if (items.length > 0) {
      selectedId = items[0].id;
    }

    fitMapToScreen();
    updateActiveSwatchCard();
    refreshUI();
    requestAnimationFrame(frame);
  }

  init();
})();
