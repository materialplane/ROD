import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById, HEROES, type HeroDefinition } from "../heroes";
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

function addressHero(speakerId: HeroId, target: HeroDefinition): string {
  if (speakerId === "valen" && target.id === "ellowyn") return "Mother";
  if (speakerId === "rowan" && target.id === "orin") return "Father";
  if (speakerId === "mera" && target.id === "ellowyn") return "Your Grace";
  return target.name;
}

function buildOpeningCall(leader: HeroDefinition, defA: HeroDefinition, defB: HeroDefinition): string {
  const addrA = addressHero(leader.id, defA);
  const addrB = addressHero(leader.id, defB);
  switch (leader.id) {
    case "valen":
      return `Our horses are waiting at the outer gate. I hate leaving Highcrown short-handed, ${addrA}, but someone has to track Garrick down—and someone has to keep this city standing.`;
    case "ellowyn":
      return `Everything is ready at the gate. Leaving Highcrown behind is no small thing, ${addrA}—even knowing you and ${addrB} will hold it.`;
    case "orin":
      return `We ride out at first light. I would rather have all six swords on the road, ${addrA}, yet Highcrown cannot stand empty while Garrick runs loose.`;
    case "rowan":
      return `Gear is strapped and the road east is open. Feels strange walking out without you, ${addrA}—keep watch over these walls for us.`;
    case "mera":
      return `The side gate is clear for us to slip out. Keep your eyes open in here, ${addrA}—Highcrown still has plenty of Garrick's old rats hiding in the dark.`;
    case "harlan":
      return `My satchels are full and the road waits for no one. Look after the people left inside these walls, ${addrA}—we'll need a home worth coming back to.`;
  }
}

function buildKeepFirstPledge(defA: HeroDefinition, defB: HeroDefinition): string {
  const partner = addressHero(defA.id, defB);
  switch (defA.id) {
    case "valen":
      return "Don't worry about me. I know every stone and hidden passage in this castle—I'll rally whatever loyal guards are left and keep the gates shut tight.";
    case "ellowyn":
      return "Highcrown won't fall while I'm here. I'll keep the inner wards up—and start digging through Garrick's sealed archives for whatever he hid from us.";
    case "orin":
      return `Save your breath for the road. I've spent thirty years holding these walls—${partner} and I will whip the watch back into shape and keep the gates barred.`;
    case "rowan":
      return "You just watch the wilds—I'll take the high towers. Nothing walks down that northern road toward Highcrown without an arrow greeting it first.";
    case "mera":
      return "Please—nobody slips past me in this city. I'll keep eyes on the alleys and run word out to the towns so you're never marching blind.";
    case "harlan":
      return "Somebody has to mend the folks who can't swing a sword. I'll keep the infirmary open and make sure sickness doesn't finish what Garrick started.";
  }
}

const SPLIT_PAIR_REACTIONS: Partial<Record<HeroId, Partial<Record<HeroId, string>>>> = {
  valen: {
    ellowyn:
      "Stay behind these walls, Mother. After what happened in the Coliseum... I'm not losing anyone else I care about.",
  },
  ellowyn: {
    valen:
      "Don't carry the whole city on your shoulders alone, Valen. Trust the loyal captains inside these walls until we return.",
    mera:
      "Be careful in those lower streets, Mera. You risked your neck enough for me in the dark—don't throw it away now.",
  },
  orin: {
    rowan:
      "Don't get reckless up on those walls, Rowan. Keep your eyes open until your old man marches back.",
  },
  rowan: {
    orin:
      "Watch those walls while we're gone, Father. Don't work yourself half to death drilling recruits—we'll handle the road.",
  },
  mera: {
    ellowyn:
      "Stay behind thick stone walls, Your Grace. You saved me once—now let me help clear a path out there for you.",
  },
};

const COMPANION_FALLBACK: Record<HeroId, string> = {
  valen:
    "And we won't take all season out there. Once we figure out how to shut those Portals down, we're coming straight back.",
  ellowyn:
    "If Garrick's scouts try testing the gates again, send word right away. We won't leave you cut off.",
  orin:
    "At least we won't be glancing over our shoulders every mile. Knowing you two have the Keep gives us room to breathe.",
  rowan:
    "Fair enough. Keep the fires lit on the watchtowers, and we'll thin out whatever's prowling the Crownlands.",
  mera:
    "Just leave a loose latch on the postern gate for our riders. You watch the city—we'll bring down the Portals.",
  harlan:
    "Try not to work yourselves to death while we're gone, either. Keep some broth warm for when we limp back in.",
};

function buildKeepSecondPledge(defB: HeroDefinition, defA: HeroDefinition): string {
  const partner = addressHero(defB.id, defA);
  switch (defB.id) {
    case "valen":
      return `Between ${partner} and me, Garrick's banners won't touch this courtyard. Go shut those Portals—and when you march on his final stronghold, we'll meet you there.`;
    case "ellowyn":
      return `While ${partner} keeps watch over the city, I'll piece together whatever Garrick left buried in the palace vaults. When you finally corner him, all six of us will finish it together.`;
    case "orin":
      return `You heard ${partner}—Highcrown isn't falling. Clear the roads, break those Portals, and when it's time to storm Garrick's keep, we'll ride out behind you.`;
    case "rowan":
      return `With ${partner} watching the city and my bow on the battlements, you've got nothing to worry about. Just leave a few fights for us when you hit the final gate.`;
    case "mera":
      return `With ${partner} keeping watch and my eyes in the streets, no spy gets through. When you're ready to strike Garrick himself, we'll be right at your flank.`;
    case "harlan":
      return `I'll keep ${partner} standing and the town patched up until you're back. Just stay alive out there—all six of us are ending this together.`;
  }
}

function buildClosingCall(leader: HeroDefinition): string {
  switch (leader.id) {
    case "valen":
      return "Deal. Look after Highcrown, both of you—let's move out.";
    case "ellowyn":
      return "Then it's time. Keep Highcrown safe—we ride out now.";
    case "orin":
      return "That settles it. Hold the gates until we send word—let's march.";
    case "rowan":
      return "All right, let's hit the road before we lose the daylight. See you soon.";
    case "mera":
      return "Good. Let's slip out while the road's quiet—stay safe in here.";
    case "harlan":
      return "Take care of yourselves, then. Time we stepped outside these walls.";
  }
}

function pickCompanionSpeaker(partyRest: HeroDefinition[], defA: HeroDefinition): HeroDefinition {
  for (const hero of partyRest) {
    const reactions = SPLIT_PAIR_REACTIONS[hero.id];
    if (reactions && reactions[defA.id]) {
      return hero;
    }
  }
  return partyRest[0];
}

function buildOpeningScript(partyOrder: HeroId[]): {
  partyHeroes: HeroDefinition[];
  keepDefenders: HeroDefinition[];
  lines: DialogueLine[];
} {
  const partyHeroes = partyOrder.map((id) => getHeroById(id));
  const partySet = new Set(partyHeroes.map((h) => h.id));
  const keepDefenders = HEROES.filter((h) => !partySet.has(h.id));

  const leader = partyHeroes[0];
  const [defA, defB] = keepDefenders;
  const companion = pickCompanionSpeaker(partyHeroes.slice(1), defA);

  // Prompt [3] always responds directly to defA (the speaker of Prompt [2])
  const companionLine = SPLIT_PAIR_REACTIONS[companion.id]?.[defA.id] ?? COMPANION_FALLBACK[companion.id];

  const lines: DialogueLine[] = [
    {
      speaker: leader,
      group: "party",
      roleTag: "Riding Out",
      text: buildOpeningCall(leader, defA, defB),
    },
    {
      speaker: defA,
      group: "keep",
      roleTag: "Holding Highcrown Keep",
      text: buildKeepFirstPledge(defA, defB),
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
      text: buildKeepSecondPledge(defB, defA),
    },
    {
      speaker: leader,
      group: "party",
      roleTag: "Riding Out",
      text: buildClosingCall(leader),
    },
  ];

  return { partyHeroes, keepDefenders, lines };
}

export const OpeningCutsceneModal: React.FC<OpeningCutsceneModalProps> = ({ open, partyOrder, onComplete }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);
  const emberCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const { partyHeroes, keepDefenders, lines } = useMemo(() => buildOpeningScript(partyOrder), [partyOrder]);
  const current = lines[stepIdx] ?? lines[0];
  const isLast = stepIdx >= lines.length - 1;
  const isTyping = visibleChars < current.text.length;

  useEffect(() => {
    if (open) {
      setStepIdx(0);
      setVisibleChars(0);
    }
  }, [open, partyOrder]);

  // Smooth single-player RPG typewriter reveal
  useEffect(() => {
    if (!open) return;
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
  }, [open, stepIdx, current.text]);

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
    if (isTyping) {
      audioEngine.playUiClick(0.24);
      setVisibleChars(current.text.length);
      return;
    }
    if (!isLast) {
      audioEngine.playUiClick(0.32);
      setStepIdx((i) => i + 1);
    } else {
      onComplete();
    }
  }, [isTyping, current.text.length, isLast, onComplete]);

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

  if (!open) return null;

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
