import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = 8766;
const HOST = "127.0.0.1";
const ROOT = path.resolve("C:/Users/drew0/Documents/ROD");
const PORTAL_HTML = path.join(ROOT, "tools", "portal", "index.html");
const CLIENT_DIR = path.join(ROOT, "client");
const CLIENT_WEB_DIR = path.join(CLIENT_DIR, "dist", "web");
const CLIENT_ASSETS_DIR = path.join(CLIENT_DIR, "assets");
const ADMIN_DIR = path.join(ROOT, "admin");
const REPO_ASSETS_DIR = path.join(ROOT, "assets");
const DATA_DIR = path.join(ROOT, "data");
const WORLD_DATA_PATH = path.join(DATA_DIR, "world-locations.json");
const CLIENT_WORLD_DATA_PATH = path.join(CLIENT_ASSETS_DIR, "data", "world-locations.json");
const WORLD_PAINT_PATH = path.join(DATA_DIR, "world-paint.json");
const CLIENT_WORLD_PAINT_PATH = path.join(CLIENT_ASSETS_DIR, "data", "world-paint.json");

const SAVES_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
  "rod-game-client",
  "saves"
);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function ensureSavesDir() {
  if (!fs.existsSync(SAVES_DIR)) {
    fs.mkdirSync(SAVES_DIR, { recursive: true });
  }
}

function readAllSaves() {
  ensureSavesDir();
  const files = fs.readdirSync(SAVES_DIR).filter((f) => f.endsWith(".json"));
  const saves = [];
  for (const file of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(SAVES_DIR, file), "utf-8"));
      if (parsed && typeof parsed.x === "number" && typeof parsed.y === "number" && parsed.slotId) {
        saves.push(parsed);
      }
    } catch {
      // Ignore malformed save
    }
  }
  saves.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  return saves;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function serveFile(req, res, baseDir, relPath) {
  const resolved = path.resolve(baseDir, relPath);
  if (!resolved.startsWith(baseDir) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const ext = path.extname(resolved).toLowerCase();
  const stat = fs.statSync(resolved);
  const contentType = MIME[ext] || "application/octet-stream";
  const cacheControl = ext === ".ogg" ? "public, max-age=3600" : "no-store";
  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(stat.size - 1, Number(match[2])) : stat.size - 1;
      if (start < stat.size && start <= end) {
        res.writeHead(206, {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Cache-Control": cacheControl,
        });
        fs.createReadStream(resolved, { start, end }).pipe(res);
        return;
      }
    }
  }
  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
  });
  fs.createReadStream(resolved).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);

  // --- Save/Load API for Game Client ---
  if (urlPath === "/api/saves/list" && req.method === "GET") {
    return sendJson(res, 200, readAllSaves());
  }
  if (urlPath === "/api/saves/latest" && req.method === "GET") {
    const all = readAllSaves();
    return sendJson(res, 200, all.length > 0 ? all[0] : null);
  }
  if (urlPath === "/api/saves/clear" && req.method === "POST") {
    ensureSavesDir();
    for (const file of fs.readdirSync(SAVES_DIR)) {
      if (file.endsWith(".json")) {
        fs.unlinkSync(path.join(SAVES_DIR, file));
      }
    }
    return sendJson(res, 200, { ok: true });
  }
  if (urlPath === "/api/saves/write" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const safeId = String(payload.slotId || "").replace(/[^a-zA-Z0-9_-]/g, "");
        if (!safeId) return sendJson(res, 400, { error: "Invalid slotId" });
        const saveObj = { ...payload, slotId: safeId, savedAt: new Date().toISOString() };
        ensureSavesDir();
        fs.writeFileSync(path.join(SAVES_DIR, `${safeId}.json`), JSON.stringify(saveObj, null, 2), "utf-8");
        return sendJson(res, 200, saveObj);
      } catch {
        return sendJson(res, 400, { error: "Bad JSON" });
      }
    });
    return;
  }

  // --- World Data API for Admin Suite ---
  if (urlPath === "/api/world-locations" && req.method === "GET") {
    if (!fs.existsSync(WORLD_DATA_PATH)) {
      return sendJson(res, 404, { error: "world-locations.json not found" });
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(fs.readFileSync(WORLD_DATA_PATH, "utf-8"));
    return;
  }
  if (urlPath === "/api/world-locations" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed || !Array.isArray(parsed.locations)) {
          return sendJson(res, 400, { error: "Invalid locations payload" });
        }
        const incoming = parsed.locations;
        let finalPayload = parsed;
        if (fs.existsSync(WORLD_DATA_PATH)) {
          try {
            const existing = JSON.parse(fs.readFileSync(WORLD_DATA_PATH, "utf-8"));
            const existingById = new Map((existing.locations || []).map((l) => [l.id, l]));
            const incomingById = new Map(incoming.map((inc) => [inc.id, inc]));
            const existingLocked = Array.isArray(existing.lockedMaps) ? existing.lockedMaps : [];
            const incomingLocked = Array.isArray(parsed.lockedMaps) ? parsed.lockedMaps : existingLocked;
            const explicitLockUpdate = parsed.explicitLockUpdate === true;
            const lockedMaps = explicitLockUpdate
              ? incomingLocked
              : Array.from(new Set([...existingLocked, ...incomingLocked]));
            const lockedMapSet = new Set(lockedMaps);
            const merged = incoming.map((inc) => {
              const prev = existingById.get(inc.id);
              if (!prev) {
                if (inc.placed && lockedMapSet.has(inc.mapId)) return null;
                return inc;
              }
              const prevMapLocked = lockedMapSet.has(prev.mapId);
              if (prevMapLocked) {
                return {
                  ...prev,
                  locked: prev.placed ? true : Boolean(prev.locked),
                };
              }
              const keepLocked = prev.locked && inc.locked !== false;
              if (keepLocked && prev.placed) {
                return {
                  ...prev,
                  locked: true,
                };
              }
              if (!prev.placed && inc.placed && lockedMapSet.has(inc.mapId)) {
                return prev;
              }
              return {
                ...prev,
                mapId: inc.mapId ?? prev.mapId,
                placed: Boolean(inc.placed),
                x: inc.x ?? null,
                y: inc.y ?? null,
                scale: inc.scale ?? prev.scale ?? 1.0,
                triggerRadius: inc.triggerRadius ?? prev.triggerRadius ?? 88,
                linkedFerryId: "linkedFerryId" in inc ? inc.linkedFerryId : prev.linkedFerryId ?? null,
                rotation: "rotation" in inc ? Number(inc.rotation) || 0 : prev.rotation ?? 0,
                locked: "locked" in inc ? Boolean(inc.locked) : Boolean(prev.locked),
              };
            }).filter(Boolean);
            for (const prev of existing.locations || []) {
              if (!incomingById.has(prev.id) && (prev.locked || lockedMapSet.has(prev.mapId))) {
                merged.push({
                  ...prev,
                  locked: prev.placed && lockedMapSet.has(prev.mapId) ? true : Boolean(prev.locked),
                });
              }
            }
            const cleanParsed = { ...parsed };
            delete cleanParsed.explicitLockUpdate;
            finalPayload = { ...existing, ...cleanParsed, lockedMaps, locations: merged };
          } catch {
            // Fall back to incoming payload if existing JSON unreadable
          }
        }
        const formatted = JSON.stringify(finalPayload, null, 2);
        fs.mkdirSync(path.dirname(WORLD_DATA_PATH), { recursive: true });
        fs.mkdirSync(path.dirname(CLIENT_WORLD_DATA_PATH), { recursive: true });
        fs.writeFileSync(WORLD_DATA_PATH, formatted, "utf-8");
        fs.writeFileSync(CLIENT_WORLD_DATA_PATH, formatted, "utf-8");
        return sendJson(res, 200, { ok: true, count: finalPayload.locations.length, savedAt: new Date().toISOString() });
      } catch (err) {
        return sendJson(res, 400, { error: String(err) });
      }
    });
    return;
  }

  // --- World Paint (Terrain & Level Zones Hex Data) API ---
  if (urlPath === "/api/world-paint" && req.method === "GET") {
    if (!fs.existsSync(WORLD_PAINT_PATH)) {
      return sendJson(res, 200, { version: 1, hexRadius: 16, maps: {} });
    }
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(fs.readFileSync(WORLD_PAINT_PATH, "utf-8"));
    return;
  }
  if (urlPath === "/api/world-paint" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        if (!parsed || typeof parsed !== "object" || !parsed.maps) {
          return sendJson(res, 400, { error: "Invalid world paint payload" });
        }
        // Preserve terrain & zone paint on locked maps AND never drop newer disk biome definitions from un-reloaded Admin tabs
        if (fs.existsSync(WORLD_PAINT_PATH)) {
          try {
            const prevPaint = JSON.parse(fs.readFileSync(WORLD_PAINT_PATH, "utf-8"));
            if (fs.existsSync(WORLD_DATA_PATH)) {
              const worldMeta = JSON.parse(fs.readFileSync(WORLD_DATA_PATH, "utf-8"));
              const lockedMaps = Array.isArray(worldMeta.lockedMaps) ? worldMeta.lockedMaps : [];
              for (const mid of lockedMaps) {
                if (prevPaint?.maps?.[mid]) {
                  parsed.maps[mid] = prevPaint.maps[mid];
                }
              }
            }
            if (prevPaint?.biomesByMap && parsed.biomesByMap && typeof parsed.biomesByMap === "object") {
              for (const [mid, prevList] of Object.entries(prevPaint.biomesByMap)) {
                if (!Array.isArray(prevList)) continue;
                const curList = Array.isArray(parsed.biomesByMap[mid]) ? parsed.biomesByMap[mid] : [];
                const curCodes = new Set(curList.map((b) => b?.code));
                const curIds = new Set(curList.map((b) => b?.id));
                const extras = prevList.filter((b) => b && !curCodes.has(b.code) && !curIds.has(b.id));
                if (extras.length > 0) {
                  parsed.biomesByMap[mid] = [...curList, ...extras];
                }
              }
            }
          } catch {
            // Fall through if metadata cannot be parsed
          }
        }
        const formatted = JSON.stringify(parsed);
        fs.mkdirSync(path.dirname(WORLD_PAINT_PATH), { recursive: true });
        fs.mkdirSync(path.dirname(CLIENT_WORLD_PAINT_PATH), { recursive: true });
        fs.writeFileSync(WORLD_PAINT_PATH, formatted, "utf-8");
        fs.writeFileSync(CLIENT_WORLD_PAINT_PATH, formatted, "utf-8");
        return sendJson(res, 200, { ok: true, savedAt: new Date().toISOString() });
      } catch (err) {
        return sendJson(res, 400, { error: String(err) });
      }
    });
    return;
  }

  // --- Clean Trailing-Slash Redirects ---
  if (urlPath === "/client" || urlPath === "/admin" || urlPath === "/admin/vfx-test" || urlPath === "/admin/shops") {
    res.writeHead(302, { Location: `${urlPath}/` });
    res.end();
    return;
  }

  // --- Route: Unified Dev Portal Landing (/) ---
  if (urlPath === "/") {
    return serveFile(req, res, path.dirname(PORTAL_HTML), "index.html");
  }

  // --- Route: Pure Steam Game Client (/client/...) ---
  if (urlPath.startsWith("/client/assets/")) {
    return serveFile(req, res, CLIENT_ASSETS_DIR, urlPath.slice("/client/assets/".length));
  }
  if (urlPath.startsWith("/client/")) {
    const rel = urlPath === "/client/" ? "index.html" : urlPath.slice("/client/".length);
    return serveFile(req, res, CLIENT_WEB_DIR, rel);
  }

  // --- Route: Private Internal Admin Suite (/admin/...) ---
  if (urlPath.startsWith("/admin/")) {
    let rel = urlPath.slice("/admin/".length);
    if (!rel || rel.endsWith("/")) rel += "index.html";
    return serveFile(req, res, ADMIN_DIR, rel);
  }

  // --- Shared Local Asset & Data Mounts for Admin Tools ---
  if (urlPath.startsWith("/assets/")) {
    return serveFile(req, res, CLIENT_ASSETS_DIR, urlPath.slice("/assets/".length));
  }
  if (urlPath.startsWith("/repo-assets/")) {
    return serveFile(req, res, REPO_ASSETS_DIR, urlPath.slice("/repo-assets/".length));
  }
  if (urlPath.startsWith("/data/")) {
    return serveFile(req, res, DATA_DIR, urlPath.slice("/data/".length));
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, HOST, () => {
  console.log(`ROD Unified Dev Portal listening at http://${HOST}:${PORT}/`);
});
