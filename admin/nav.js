(() => {
  const ADMIN_TOOLS = [
    { label: "World Builder", href: "/admin/", desc: "Overworld maps, hex terrain, zones & pins" },
    { label: "Realm Scale Test", href: "/admin/realm-test/", desc: "Walk & zoom-test doubled 16:9 Zelda-grid sectors" },
    { label: "Markers & Assets", href: "/admin/catalog.html", desc: "Browse all exported tokens, portraits & sheets" },
    { label: "Shops & Inns", href: "/admin/shops/", desc: "Preview town shops, inns & item pricing" },
    { label: "Party Menu", href: "/admin/party/", desc: "Inspect hero status, gear, spells & atlas" },
    { label: "Disciplines", href: "/admin/disciplines/", desc: "Review class discipline pairs & approvals" },
    { label: "Proposed Decks", href: "/admin/decks/", desc: "Review 20-card base & quest decks + 16:9 rooms" },
    { label: "Board & Tray Test", href: "/admin/delve-preview/", desc: "Preview deck stack & 3 face-down cards over 16:9 scenes" },
    { label: "Battle Studio", href: "/admin/battles/", desc: "Preview encounters & stage layouts" },
    { label: "Combat Tester", href: "/admin/combat-test/", desc: "Play live zone encounters & track 10-fight grind" },
    { label: "Economy Simulator", href: "/admin/simulator/", desc: "Visual 20-zone drop, attrition & quest telemetry" },
    { label: "VFX Tester", href: "/admin/vfx-test/", desc: "Test combat hit/spell strips & color tints" },
  ];

  function injectStyles() {
    if (document.getElementById("rodAdminNavStyles")) return;
    const style = document.createElement("style");
    style.id = "rodAdminNavStyles";
    style.textContent = `
      .rod-studio-menu {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .rod-studio-trigger {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(217, 167, 74, 0.14);
        color: #f2c978;
        border: 1px solid rgba(217, 167, 74, 0.55);
        border-radius: 7px;
        padding: 5px 11px;
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.12s ease, border-color 0.12s ease;
      }
      .rod-studio-trigger:hover {
        background: rgba(217, 167, 74, 0.22);
        border-color: #f2c978;
      }
      .rod-studio-caret {
        font-size: 10px;
        opacity: 0.85;
      }
      .rod-studio-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        min-width: 270px;
        background: #141923;
        border: 1px solid #3c485e;
        border-radius: 9px;
        box-shadow: 0 14px 36px rgba(0, 0, 0, 0.65);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        z-index: 9999;
      }
      .rod-studio-dropdown.hidden {
        display: none;
      }
      .rod-studio-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 7px 10px;
        border-radius: 6px;
        text-decoration: none;
        color: #dce4f2;
        border: 1px solid transparent;
      }
      .rod-studio-item:hover {
        background: #1f2736;
        border-color: #3a465c;
      }
      .rod-studio-item.active {
        background: rgba(217, 167, 74, 0.16);
        border-color: rgba(217, 167, 74, 0.5);
      }
      .rod-studio-item-title {
        font-size: 12.5px;
        font-weight: 700;
        color: #f4f7fc;
      }
      .rod-studio-item.active .rod-studio-item-title {
        color: #f2c978;
      }
      .rod-studio-item-desc {
        font-size: 11px;
        color: #8f9db5;
      }
      .rod-client-launch {
        display: inline-flex;
        align-items: center;
        color: #161209;
        background: linear-gradient(180deg, #e0b159, #b8842c);
        border: 1px solid #e6ba64;
        border-radius: 6px;
        padding: 5px 11px;
        font-size: 12px;
        font-weight: 700;
        text-decoration: none;
        white-space: nowrap;
      }
      .rod-client-launch:hover {
        filter: brightness(1.07);
      }
    `;
    document.head.appendChild(style);
  }

  function resolveCurrentTool() {
    const p = window.location.pathname || "/admin/";
    if (p.includes("catalog.html")) return "/admin/catalog.html";
    for (const t of ADMIN_TOOLS) {
      if (t.href !== "/admin/" && p.startsWith(t.href)) return t.href;
    }
    return "/admin/";
  }

  function buildStudioHeaderNav() {
    const oldNav = document.querySelector(".admin-nav");
    if (!oldNav) return;

    injectStyles();
    const currentHref = resolveCurrentTool();
    const currentTool = ADMIN_TOOLS.find((t) => t.href === currentHref) || ADMIN_TOOLS[0];

    const wrap = document.createElement("div");
    wrap.className = "rod-studio-menu";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rod-studio-trigger";
    btn.setAttribute("aria-expanded", "false");
    btn.title = "Switch Admin Tool";
    btn.innerHTML = `<span>${currentTool.label}</span><span class="rod-studio-caret">&#9662;</span>`;

    const menu = document.createElement("div");
    menu.className = "rod-studio-dropdown hidden";
    for (const tool of ADMIN_TOOLS) {
      const a = document.createElement("a");
      a.href = tool.href;
      a.className = "rod-studio-item" + (tool.href === currentHref ? " active" : "");
      a.innerHTML = `<span class="rod-studio-item-title">${tool.label}</span><span class="rod-studio-item-desc">${tool.desc}</span>`;
      menu.appendChild(a);
    }

    const setOpen = (open) => {
      menu.classList.toggle("hidden", !open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    };

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(menu.classList.contains("hidden"));
    });
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    oldNav.replaceWith(wrap);

    // Put a single crisp Play Client button on the far right of the header
    const header = wrap.closest("header");
    if (header) {
      const rightCluster = header.querySelector(".top-actions");
      const launch = document.createElement("a");
      launch.href = "/client/";
      launch.className = "rod-client-launch";
      launch.title = "Open live Game Client";
      launch.innerHTML = "Play Client &rarr;";
      if (rightCluster) {
        rightCluster.appendChild(launch);
      } else {
        const stats = header.querySelector(".studio-stats");
        if (stats) {
          const group = document.createElement("div");
          group.style.cssText = "display:flex;align-items:center;gap:12px;margin-left:auto;";
          stats.replaceWith(group);
          group.appendChild(stats);
          group.appendChild(launch);
        } else {
          header.appendChild(launch);
        }
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildStudioHeaderNav);
  } else {
    buildStudioHeaderNav();
  }
})();
