import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById, getHeroOpeningCutscene, HEROES, type HeroDefinition } from "../heroes";
import type { HeroId } from "../types";

interface OpeningCutsceneModalProps {
  open: boolean;
  partyOrder: HeroId[];
  onComplete: () => void;
}

interface DialogueLine {
  speaker: HeroDefinition;
  group: "party" | "keep";
  roleTag: string;
  text: string;
}

function formatLine(template: string | undefined, vars: Record<string, string>): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function addressHero(speakerId: HeroId, target: HeroDefinition): string {
  const custom = getHeroOpeningCutscene()?.addressForms?.[speakerId]?.[target.id];
  return custom ?? target.name;
}

function pickCompanionSpeaker(partyRest: HeroDefinition[], defA?: HeroDefinition): HeroDefinition | undefined {
  const splitReactions = getHeroOpeningCutscene()?.splitPairReactions ?? {};
  if (defA) {
    for (const hero of partyRest) {
      if (splitReactions[hero.id]?.[defA.id]) {
        return hero;
      }
    }
  }
  return partyRest[0];
}

function buildOpeningScript(partyOrder: HeroId[]): {
  partyHeroes: HeroDefinition[];
  keepDefenders: HeroDefinition[];
  lines: DialogueLine[];
} {
  const dlg = getHeroOpeningCutscene();
  const partyHeroes = partyOrder.map((id) => getHeroById(id));
  const partySet = new Set(partyHeroes.map((h) => h.id));
  const keepDefenders = HEROES.filter((h) => !partySet.has(h.id));

  if (!dlg || partyHeroes.length === 0 || keepDefenders.length < 2) {
    return { partyHeroes, keepDefenders, lines: [] };
  }

  const leader = partyHeroes[0];
  const [defA, defB] = keepDefenders;
  const companion = pickCompanionSpeaker(partyHeroes.slice(1), defA) ?? leader;

  const addrA = addressHero(leader.id, defA);
  const addrB = addressHero(leader.id, defB);
  const companionLine =
    dlg.splitPairReactions?.[companion.id]?.[defA.id] ??
    dlg.companionFallback?.[companion.id] ??
    "";

  const lines: DialogueLine[] = [
    {
      speaker: leader,
      group: "party",
      roleTag: "Riding Out",
      text: formatLine(dlg.openingCall?.[leader.id], { addrA, addrB }),
    },
    {
      speaker: defA,
      group: "keep",
      roleTag: "Holding Highcrown Keep",
      text: formatLine(dlg.keepFirstPledge?.[defA.id], { partner: addressHero(defA.id, defB) }),
    },
    {
      speaker: companion,
      group: "party",
      roleTag: "Riding Out",
      text: companionLine,
    },
    {
      speaker: defB,
      group: "keep",
      roleTag: "Holding Highcrown Keep",
      text: formatLine(dlg.keepSecondPledge?.[defB.id], { partner: addressHero(defB.id, defA) }),
    },
    {
      speaker: leader,
      group: "party",
      roleTag: "Riding Out",
      text: dlg.closingCall?.[leader.id] ?? "",
    },
  ];

  return { partyHeroes, keepDefenders, lines };
}

export const OpeningCutsceneModal: React.FC<OpeningCutsceneModalProps> = ({ open, partyOrder, onComplete }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const emberCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { partyHeroes, keepDefenders, lines } = useMemo(() => buildOpeningScript(partyOrder), [partyOrder, open]);
  const current = lines[stepIdx] ?? lines[0];
  const isLast = stepIdx >= Math.max(0, lines.length - 1);
  const currentTextLen = current?.text.length ?? 0;
  const isTyping = Boolean(current) && visibleChars < currentTextLen;

  useEffect(() => {
    if (open) {
      setStepIdx(0);
      setVisibleChars(0);
    }
  }, [open, partyOrder]);

  // Smooth single-player RPG typewriter reveal
  useEffect(() => {
    if (!open || !current) return;
    setVisibleChars(0);
    const fullLen = current.text.length;
    const timer = window.setInterval(() => {
      setVisibleChars((prev) => {
        if (prev >= fullLen) {
          window.clearInterval(timer);
          return fullLen;
        }
        return prev + 1;
      });
    }, 22);
    return () => window.clearInterval(timer);
  }, [open, stepIdx, current?.text]);

  // Subtle torchlight dust embers across the Great Hall backdrop
  useEffect(() => {
    if (!open) return;
    const canvas = emberCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const embers = Array.from({ length: 28 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.01,
      vy: -(0.01 + Math.random() * 0.022),
      r: 0.9 + Math.random() * 1.8,
      alpha: 0.18 + Math.random() * 0.45,
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

      for (const p of embers) {
        p.x += (p.vx + Math.sin(now * 0.001 + p.phase) * 0.003) * dt;
        p.y += p.vy * dt;
        if (p.y < -0.05) {
          p.y = 1.05;
          p.x = Math.random();
        }
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;

        const flicker = 0.6 + 0.4 * Math.sin(now * 0.0035 + p.phase);
        ctx.fillStyle = `rgba(244, 192, 108, ${(p.alpha * flicker).toFixed(3)})`;
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
  }, [open]);

  const handleAdvance = useCallback(() => {
    if (!current) return;
    if (isTyping) {
      audioEngine.playUiClick(0.24);
      setVisibleChars(currentTextLen);
      return;
    }
    if (!isLast) {
      audioEngine.playUiClick(0.32);
      setStepIdx((i) => i + 1);
    } else {
      onComplete();
    }
  }, [current, isTyping, currentTextLen, isLast, onComplete]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        onComplete();
        return;
      }
      if (e.code === "Enter" || e.code === "Space" || e.code === "ArrowRight") {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleAdvance, onComplete]);

  if (!open || !current) return null;

  const displayedText = current.text.slice(0, visibleChars);

  return (
    <div
      onClick={handleAdvance}
      className="fixed inset-0 z-40 bg-[#05060a] flex flex-col justify-between overflow-hidden cursor-pointer select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Highcrown Keep Scene"
    >
      {/* Atmospheric Great Hall Stage Backdrop */}
      <img
        src={assetUrl("assets/ui/menu_background.webp")}
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px] pointer-events-none scale-105"
      />
      <canvas ref={emberCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 34%, rgba(201, 146, 68, 0.16) 0%, rgba(11, 14, 21, 0.84) 55%, rgba(4, 5, 8, 0.98) 100%)",
        }}
      />

      {/* Top Subtle Location Banner & Skip */}
      <header className="relative z-[2] w-full max-w-[1160px] mx-auto px-5 md:px-8 pt-5 flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#c7a15a] font-semibold">
            Highcrown Keep · Great Hall
          </div>
          <div className="mt-1 w-24 h-[1px] bg-gradient-to-r from-[#d7b267]/80 to-transparent" />
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="px-3.5 py-1.5 rounded border border-[#4c5366]/80 hover:border-[#d7b267] bg-[#10141e]/85 hover:bg-[#1a1f2d] text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#cfd6e4] hover:text-[#fff2cc] cursor-pointer transition-colors"
        >
          Skip (Esc)
        </button>
      </header>

      {/* Center Stage: Gathered Heroes Standing Opposite Each Other in the Great Hall */}
      <div className="relative z-[2] flex-1 w-full max-w-[1120px] mx-auto px-5 md:px-8 flex items-center justify-center">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
          {/* Left Side: Your 4 Riding Out */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#dec07b]/85 font-semibold">
              Riding Out
            </span>
            <div className="flex items-end gap-2.5 sm:gap-3.5">
              {partyHeroes.map((hero) => {
                const isSpeaking = current.speaker.id === hero.id;
                return (
                  <div
                    key={hero.id}
                    className={[
                      "flex flex-col items-center transition-all duration-300",
                      isSpeaking ? "opacity-100 -translate-y-2.5 scale-105" : "opacity-45 brightness-75 scale-95",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "rounded-sm p-[2px] transition-all duration-300",
                        isSpeaking
                          ? "bg-gradient-to-b from-[#ffe4a0] via-[#d7a94e] to-[#7a5822] shadow-[0_0_28px_rgba(232,188,100,0.42)]"
                          : "bg-[#2c3344]",
                      ].join(" ")}
                    >
                      <img
                        src={assetUrl(hero.avatarPath)}
                        alt={hero.fullName}
                        draggable={false}
                        className="w-[74px] h-[74px] sm:w-[96px] sm:h-[96px] md:w-[112px] md:h-[112px] rounded-sm object-cover block"
                      />
                    </div>
                    <span
                      className={[
                        "mt-2 font-display text-[12px] sm:text-[13px] tracking-wide",
                        isSpeaking ? "text-[#fff0c6] font-bold" : "text-[#9ca6b8]",
                      ].join(" ")}
                    >
                      {hero.name}
                    </span>
                    <span className="text-[10px] text-[#7f899c]">{hero.className}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Divider Line on Wide Screens */}
          <div className="hidden md:block w-[1px] h-28 bg-gradient-to-b from-transparent via-[#7a633b]/55 to-transparent" />

          {/* Right Side: The 2 Holding Highcrown Keep */}
          <div className="flex flex-col items-center md:items-end gap-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#9fb2cf]/85 font-semibold">
              Holding Highcrown Keep
            </span>
            <div className="flex items-end gap-2.5 sm:gap-3.5">
              {keepDefenders.map((hero) => {
                const isSpeaking = current.speaker.id === hero.id;
                return (
                  <div
                    key={hero.id}
                    className={[
                      "flex flex-col items-center transition-all duration-300",
                      isSpeaking ? "opacity-100 -translate-y-2.5 scale-105" : "opacity-45 brightness-75 scale-95",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "rounded-sm p-[2px] transition-all duration-300",
                        isSpeaking
                          ? "bg-gradient-to-b from-[#ffe4a0] via-[#d7a94e] to-[#7a5822] shadow-[0_0_28px_rgba(232,188,100,0.42)]"
                          : "bg-[#2c3344]",
                      ].join(" ")}
                    >
                      <img
                        src={assetUrl(hero.avatarPath)}
                        alt={hero.fullName}
                        draggable={false}
                        className="w-[74px] h-[74px] sm:w-[96px] sm:h-[96px] md:w-[112px] md:h-[112px] rounded-sm object-cover block"
                      />
                    </div>
                    <span
                      className={[
                        "mt-2 font-display text-[12px] sm:text-[13px] tracking-wide",
                        isSpeaking ? "text-[#fff0c6] font-bold" : "text-[#9ca6b8]",
                      ].join(" ")}
                    >
                      {hero.name}
                    </span>
                    <span className="text-[10px] text-[#7f899c]">{hero.className}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Classic Single-Player RPG Dialogue Plate */}
      <div className="relative z-[2] w-full max-w-[960px] mx-auto px-4 md:px-8 pb-5 md:pb-8">
        <div className="rpg-modal-panel relative rounded-[4px] p-4 sm:p-5 flex items-center gap-4 sm:gap-5">
          {/* Corner Filigree Accents */}
          <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 border-[#e0ba6c] pointer-events-none" />
          <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 border-[#e0ba6c] pointer-events-none" />
          <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 border-[#e0ba6c] pointer-events-none" />
          <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 border-[#e0ba6c] pointer-events-none" />

          {/* Active Speaker Portrait */}
          <img
            src={assetUrl(current.speaker.avatarPath)}
            alt={current.speaker.fullName}
            draggable={false}
            className="w-[88px] h-[88px] sm:w-[116px] sm:h-[116px] rounded-sm border border-[#c7a158] object-cover shrink-0 shadow-[0_8px_24px_rgba(0,0,0,0.65)]"
          />

          {/* Speaker Nameplate + Typewriter Dialogue + Click Prompt */}
          <div className="min-w-0 flex-1 flex flex-col justify-between min-h-[104px] sm:min-h-[116px]">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-1.5">
                <span className="font-display text-[18px] sm:text-[20px] font-bold text-[#f6e2b4] tracking-wide">
                  {current.speaker.fullName}
                </span>
                <span
                  className={[
                    "text-[11px] uppercase tracking-[0.14em] font-semibold",
                    current.group === "party" ? "text-[#d7b267]" : "text-[#9eb5d6]",
                  ].join(" ")}
                >
                  {current.roleTag}
                </span>
              </div>

              <p className="m-0 text-[15px] sm:text-[17px] leading-[1.6] text-[#eef2f9] pr-2">
                {displayedText}
              </p>
            </div>

            <div className="flex items-center justify-end pt-2 h-[24px]">
              {!isTyping && (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.1em] uppercase text-[#f0cf82] animate-pulse">
                  <span>{isLast ? "Set Out" : "Continue"}</span>
                  <span className="text-[11px]">▼</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
