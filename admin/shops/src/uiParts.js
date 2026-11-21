import { tierAccentColor } from "./compare.js";

export function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatSilver(val) {
  return `${Number(val || 0).toLocaleString()}s`;
}

export function makeIconBox(item) {
  const box = document.createElement("div");
  box.className = "icon-box";
  box.style.setProperty("--tier-color", tierAccentColor(item.step));
  const img = document.createElement("img");
  img.src = "/" + String(item.iconPath || "").replace(/^assets\//, "assets/");
  img.alt = item.name;
  img.loading = "eager";
  img.decoding = "sync";
  img.draggable = false;
  box.appendChild(img);
  return box;
}
