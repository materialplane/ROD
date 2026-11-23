import React, { useEffect, useMemo, useRef, useState } from "react";
import { assetUrl, formatSaveTime } from "../api";
import { audioEngine } from "../audio";
import type { SaveSlotData } from "../types";

interface TitleScreenProps {
  active: boolean;
  latestSave: SaveSlotData | null;
  modalOpen: boolean;
  onContinue: () => void;
  onNewCampaign: () => void;
  onOpenLoad: () => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

interface MenuEntry {
  id: string;
  label: string;
  meta?: string;
  isQuit?: boolean;
  action: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  active,
  latestSave,
  modalOpen,
  onContinue,
  onNewCampaign,
  onOpenLoad,
  onOpenSettings,
  onQuit,
}) => {
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const menuEntries = useMemo<MenuEntry[]>(() => {
    const items: MenuEntry[] = [];
    if (latestSave) {
      items.push({
        id: "continue",
        label: "Continue",
        meta: `${latestSave.heroName} · ${latestSave.regionLabel} · ${formatSaveTime(latestSave.savedAt)}`,
        action: onContinue,
      });
    }
    items.push(
      {
        id: "new",
        label: "New Campaign",
        meta: "Begin at Highcrown in The Crownlands",
        action: onNewCampaign,
      },
      { id: "load", label: "Load Game", action: onOpenLoad },
      { id: "settings", label: "Settings", action: onOpenSettings },
      { id: "quit", label: "Quit", isQuit: true, action: onQuit }
    );
    return items;
  }, [latestSave, onContinue, onNewCampaign, onOpenLoad, onOpenSettings, onQuit]);

  useEffect(() => {
    setSelectedIdx((idx) => Math.min(idx, Math.max(0, menuEntries.length - 1)));
  }, [menuEntries.length]);

  useEffect(() => {
    if (!active || modalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % menuEntries.length);
      } else if (e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + menuEntries.length) % menuEntries.length);
      } else if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        const chosen = menuEntries[selectedIdx];
        if (chosen) {
          if (chosen.id === "continue") audioEngine.playDoorOpen();
          else audioEngine.playUiClick();
          chosen.action();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, modalOpen, menuEntries, selectedIdx]);

  // Ambient ember & sunlight horizon particle loop
  useEffect(() => {
    if (!active) return;
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const embers = Array.from({ length: 44 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.35) * 0.012,
      vy: -(0.015 + Math.random() * 0.032),
      r: 1.0 + Math.random() * 2.2,
      alpha: 0.25 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
    }));

    const syncSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncSize();
    window.addEventListener("resize", syncSize);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const glowPulse = 0.08 + Math.sin(now * 0.0012) * 0.03;
      const grad = ctx.createRadialGradient(w * 0.68, h * 0.45, 10, w * 0.68, h * 0.45, w * 0.36);
      grad.addColorStop(0, `rgba(255, 178, 86, ${glowPulse.toFixed(3)})`);
      grad.addColorStop(1, "rgba(255, 178, 86, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (const p of embers) {
        p.x += (p.vx + Math.sin(now * 0.001 + p.phase) * 0.004) * dt;
        p.y += p.vy * dt;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = 0.25 + Math.random() * 0.78;
        }
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;

        const flicker = 0.65 + 0.35 * Math.sin(now * 0.004 + p.phase);
        ctx.fillStyle = `rgba(255, 198, 108, ${(p.alpha * flicker).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncSize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <main className="fixed inset-0">
      <img
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none scale-[1.015]"
        src={assetUrl("assets/ui/menu_background.webp")}
        alt=""
        draggable={false}
      />
      <canvas ref={fxCanvasRef} className="absolute inset-0 w-full h-full z-[1] pointer-events-none" />
      <div className="title-vignette absolute inset-0 z-[2] pointer-events-none" />

      <section className="relative z-[3] w-[390px] max-w-[88vw] h-full flex flex-col justify-center gap-7 pl-14 max-sm:pl-6">
        <header className="text-center">
          <svg className="w-[156px] h-[46px] mx-auto mb-1 drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)]" viewBox="0 0 180 54" fill="none">
            <path d="M12 36H70M110 36H168" stroke="url(#goldGrad)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M90 6L99 24L118 27L102 36L107 48L90 40L73 48L78 36L62 27L81 24L90 6Z" fill="url(#goldDark)" stroke="url(#goldGrad)" strokeWidth="1.6" />
            <circle cx="90" cy="29" r="4.5" fill="#171a22" stroke="#f2d28b" strokeWidth="1.4" />
            <path d="M54 36L62 32L70 36L62 40Z" fill="#d7b267" />
            <path d="M110 36L118 32L126 36L118 40Z" fill="#d7b267" />
            <defs>
              <linearGradient id="goldGrad" x1="12" y1="6" x2="168" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#8c6d38" />
                <stop offset="50%" stopColor="#f7dfa3" />
                <stop offset="100%" stopColor="#8c6d38" />
              </linearGradient>
              <linearGradient id="goldDark" x1="90" y1="6" x2="90" y2="48" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4e3d21" />
                <stop offset="100%" stopColor="#20190f" />
              </linearGradient>
            </defs>
          </svg>

          <h1 className="font-display title-gold-text text-[68px] font-bold tracking-[0.22em] pl-[0.22em] leading-none m-0">
            ROD
          </h1>
          <div className="flex items-center justify-center gap-2.5 mt-2">
            <span className="w-8 h-[1px] bg-gradient-to-r from-transparent via-[#c79d52] to-transparent" />
            <p className="font-display text-[13px] tracking-[0.38em] pl-[0.38em] text-[#dec48e] m-0">REALMS OF DUST</p>
            <span className="w-8 h-[1px] bg-gradient-to-r from-transparent via-[#c79d52] to-transparent" />
          </div>
        </header>

        <div className="ledger-panel relative rounded-[4px] p-5">
          <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 border-[#e0ba6c] pointer-events-none" />
          <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 border-[#e0ba6c] pointer-events-none" />
          <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 border-[#e0ba6c] pointer-events-none" />
          <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 border-[#e0ba6c] pointer-events-none" />

          <nav className="flex flex-col gap-1" aria-label="Main Menu">
            {menuEntries.map((item, idx) => {
              const isSel = idx === selectedIdx;
              return (
                <React.Fragment key={item.id}>
                  {item.isQuit && (
                    <div className="h-[1px] my-1.5 mx-2.5 bg-gradient-to-r from-transparent via-[#a68952]/45 to-transparent" />
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => {
                      if (item.id === "continue") audioEngine.playDoorOpen();
                      else audioEngine.playUiClick();
                      item.action();
                    }}
                    className={[
                      "relative flex items-center gap-3 w-full text-left py-2.5 px-3.5 rounded-[3px] border cursor-pointer transition-all duration-150",
                      isSel
                        ? item.isQuit
                          ? "pl-[18px] text-[#ffd7d2] border-[#c96358]/40 bg-gradient-to-r from-[#a8483e]/25 via-[#a8483e]/5 to-transparent"
                          : "pl-[18px] text-[#fff2cc] border-[#d7b267]/35 bg-gradient-to-r from-[#c49848]/25 via-[#c49848]/5 to-transparent"
                        : "text-[#cfc4ad] border-transparent bg-transparent",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "text-[11px] transition-all duration-150",
                        item.isQuit ? "text-[#e87a6e]" : "text-[#f2c96c]",
                        isSel ? "opacity-100 scale-100" : "opacity-0 scale-50",
                      ].join(" ")}
                    >
                      ◆
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-display text-[16px] font-semibold tracking-[0.12em] uppercase">
                        {item.label}
                      </span>
                      {item.meta && <span className="text-[11px] text-[#a8997c] tracking-[0.03em]">{item.meta}</span>}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </section>

      <footer className="absolute left-14 right-7 bottom-[18px] z-[3] flex justify-between items-center text-[12px] tracking-[0.08em] text-[#e1d6be]/60 pointer-events-none">
        <span>W / S or ↑ / ↓ Navigate &nbsp;·&nbsp; Enter Select</span>
        <span>v0.2 · React + Tailwind UI</span>
      </footer>
    </main>
  );
};
