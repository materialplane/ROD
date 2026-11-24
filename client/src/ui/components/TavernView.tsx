import React, { useEffect, useMemo, useState } from "react";
import { assetUrl } from "../api";
import { audioEngine } from "../audio";
import { getHeroById } from "../heroes";
import type { TavernTrackInfo } from "../tavernLore";
import type { HeroId, NpcLocationGroup, QuestEntry, WorldLocation } from "../types";
import { CornerFiligree, HIGHCROWN_ID, formatRewardLine, sanitizeRoleTitle } from "./LocationInteriorModal";
import { QuestCardThumb } from "./QuestCardThumb";

interface TavernPerson {
  id: string;
  group: "party" | "patron";
  displayName: string;
  displayRole: string;
  portraitPath: string;
  quest: QuestEntry | null;
  dialogue: string;
}

interface TavernViewProps {
  tavern: WorldLocation;
  parentTown: WorldLocation;
  npcsByLocation: Record<string, NpcLocationGroup>;
  questsByKey: Record<string, QuestEntry>;
  partyOrder: HeroId[];
  partyLevel: number;
  acceptedQuestIds: string[];
  completedQuestIds?: string[];
  onAcceptQuest: (quest: QuestEntry) => void;
  onOpenParty: () => void;
  onReturnToTown: () => void;
  onClose: () => void;
}

function buildPartyTavernLine(heroId: HeroId, tavernName: string, townName: string, songTitle?: string | null): string {
  const songNote = songTitle ? ` Listening to "${songTitle}" echoing off the rafters puts a strange weight on the whole road ahead.` : "";
  switch (heroId) {
    case "valen":
      return `Hard to sit beside strangers drinking ale inside ${tavernName} when half these ballads sing about what happened in Highcrown's sands.${songNote} Still—better shoulder-to-shoulder here with good blades than rotting under that arena stone.`;
    case "ellowyn":
      return `Notice how freely ordinary townsfolk gather in ${tavernName} when there are no wardens counting heads by the door.${songNote} Keep your cloak dry by the fire; once we step back past ${townName}'s gates, the wilds won't show this mercy.`;
    case "orin":
      return `Twenty years of campaigns taught me never to pass up an honest roof and warm timber in ${townName}. Eyes stay sharpest when your boots are dry and the company has a steady mug.${songNote}`;
    case "rowan":
      return `I already spotted both exits from the rafters when we stepped into ${tavernName}. Still, even a lookout knows when to loosen his bowstring, warm his hands, and hear the room out.`;
    case "mera":
      return `Strange beasts in the wilds speak clearer than any town herald—you can feel it in the roots and wind the moment a Portal sours the land. Even so, ${tavernName}'s cedar smoke and warm hearth stew beat cold palace stone any night.`;
    case "harlan":
      return `Don't mind me checking the spice jars behind the bar—even clean spring ale beats bitter marsh water on a long campaign. Rest your shoulders a minute while the hearth fire burns warm.`;
  }
}

function buildPatronTavernLine(role: string, townName: string, tavernName: string, quest: QuestEntry | null): string {
  if (quest) return quest.description;
  const r = role.toLowerCase();
  if (r.includes("bard") || r.includes("minstrel") || r.includes("skald")) {
    return `Draw up a bench near the candles! Whenever road-weary travelers step into ${tavernName}, the old tales of Highcrown and the roads beyond always find fresh ears.`;
  }
  if (r.includes("armorer") || r.includes("smith") || r.includes("forgemaster") || r.includes("quartermaster")) {
    return `Off the anvil for the evening. Hammering iron for half the watches around ${townName} earns a man at least one slow mug by ${tavernName}'s fire.`;
  }
  if (r.includes("guard") || r.includes("captain") || r.includes("watch") || r.includes("marshal") || r.includes("sergeant")) {
    return `Watch shifts keep getting longer past ${townName}'s gateposts with weird things prowling the outskirts. Tonight though? Even the town watch takes a stool and hears a verse.`;
  }
  if (r.includes("harbor") || r.includes("sailor") || r.includes("captain") || r.includes("ship")) {
    return `Salt wind bites clear to the bone outside, so half the pier hands crowd straight into ${tavernName} before last bells. Always a good tale trading across these tables.`;
  }
  if (r.includes("mystic") || r.includes("apothecary") || r.includes("scholar") || r.includes("archivist")) {
    return `Curious thing about tavern ballads around ${townName}—people sing palace secrets in open alehouses that scholars used to whisper behind locked vaults.`;
  }
  return `Evening, travelers. Quiet corners are scarce in ${tavernName} once the minstrel tunes up, so pull a chair closer to the hearth while the ember glow lasts.`;
}

function isInnkeeperNpc(roleTitle: string): boolean {
  const r = roleTitle.toLowerCase();
  return r.includes("innkeeper") || r.includes("inn keeper") || r.includes("royal innkeeper");
}

export const TavernView: React.FC<TavernViewProps> = ({
  tavern,
  parentTown,
  npcsByLocation,
  questsByKey,
  partyOrder,
  partyLevel,
  acceptedQuestIds,
  completedQuestIds = [],
  onAcceptQuest,
  onOpenParty,
  onReturnToTown,
  onClose,
}) => {
  const [currentBallad, setCurrentBallad] = useState<TavernTrackInfo | null>(null);
  const [showSongBlurb, setShowSongBlurb] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  useEffect(() => {
    return audioEngine.subscribeTrackChange(setCurrentBallad);
  }, [tavern.id]);

  useEffect(() => {
    setSelectedPersonId(null);
    setShowAbout(false);
    setShowSongBlurb(true);
  }, [tavern.id]);

  useEffect(() => {
    // Switching tracks brings the newly playing song overview forward cleanly when no chat is open
    if (currentBallad?.relPath && !selectedPersonId && !showAbout) {
      setShowSongBlurb(true);
    }
  }, [currentBallad?.relPath]);

  const people = useMemo<{ party: TavernPerson[]; patrons: TavernPerson[] }>(() => {
    const party: TavernPerson[] = partyOrder.map((hid) => {
      const hero = getHeroById(hid);
      return {
        id: `party_${hid}`,
        group: "party",
        displayName: hero.name,
        displayRole: `Your Party · ${hero.className}`,
        portraitPath: hero.avatarPath,
        quest: null,
        dialogue: buildPartyTavernLine(hid, tavern.name, parentTown.name, currentBallad?.title),
      };
    });

    const patrons: TavernPerson[] = [];
    const group = npcsByLocation[parentTown.id];
    const hasOrin = partyOrder.includes("orin");

    for (const npc of group?.npcs ?? []) {
      if (npc.id === "npc_keep_69_defenders") continue;
      // Hide Innkeeper in Tavern so the room feels like a genuine patron tavern & gathering hall
      if (isInnkeeperNpc(npc.roleTitle)) continue;

      let displayName = npc.name;
      let displayRole = sanitizeRoleTitle(npc.roleTitle);
      let portraitPath = npc.portraitPath ?? "assets/portraits/heroes/valen_avatar.webp";

      if (npc.id === "npc_loc_01_overgrown_garden_sanctuary_orin_capital_guard") {
        if (hasOrin) {
          displayName = "Sgt. Marcus Locke";
          displayRole = "Capital Watch Sergeant";
        } else {
          displayName = "Commander Orin";
          displayRole = "Highcrown Vanguard Lead";
          portraitPath = getHeroById("orin").avatarPath;
        }
      }

      const firstQuestTitle = npc.questsOffered?.[0];
      const matchedQuest = firstQuestTitle
        ? questsByKey[`${parentTown.id}::${firstQuestTitle}`] ?? questsByKey[firstQuestTitle] ?? null
        : null;

      patrons.push({
        id: npc.id,
        group: "patron",
        displayName,
        displayRole,
        portraitPath,
        quest: matchedQuest,
        dialogue: buildPatronTavernLine(displayRole, parentTown.name, tavern.name, matchedQuest),
      });
    }

    if (parentTown.id === HIGHCROWN_ID) {
      patrons.unshift({
        id: "tavern_bard_corinne_bellamy",
        group: "patron",
        displayName: "Corinne Bellamy",
        displayRole: "Tavern Minstrel",
        portraitPath: "assets/portraits/npcs/npc_res_wandering_bard.webp",
        quest: null,
        dialogue:
          "Pull up a chair near the rafters! Every tavern across Ethoria remembers the old ballads differently—stay awhile by the fire, or ask for another song whenever your mug runs dry.",
      });
    } else if (parentTown.id === "loc_31_rimeport") {
      patrons.unshift({
        id: "tavern_skald_torvald_frost_voice",
        group: "patron",
        displayName: "Torvald Frost-Voice",
        displayRole: "Northern Clan Skald",
        portraitPath: "assets/portraits/npcs/npc_res_frostmere_skald.webp",
        quest: null,
        dialogue:
          "Even out here where sea-spray freezes on the seawalls, singers still remember the bitter chapters of Highcrown's fall. Warm your hands while the hearth coals burn bright.",
      });
    }

    return { party, patrons };
  }, [partyOrder, npcsByLocation, questsByKey, parentTown.id, parentTown.name, tavern.name, currentBallad?.title]);

  const allPeople = useMemo(() => [...people.party, ...people.patrons], [people]);
  const selectedPerson = useMemo(
    () => (selectedPersonId ? allPeople.find((p) => p.id === selectedPersonId) ?? null : null),
    [allPeople, selectedPersonId]
  );

  const acceptedSet = new Set(acceptedQuestIds);
  const completedSet = new Set(completedQuestIds);
  const questCompleted = Boolean(selectedPerson?.quest && completedSet.has(selectedPerson.quest.questId));
  const questAccepted = Boolean(selectedPerson?.quest && acceptedSet.has(selectedPerson.quest.questId));

  const renderPersonButton = (person: TavernPerson) => {
    const isSelected = selectedPersonId === person.id;
    const hasQuest = Boolean(person.quest);
    const qCompleted = Boolean(person.quest && completedSet.has(person.quest.questId));
    const qAccepted = Boolean(person.quest && acceptedSet.has(person.quest.questId));
    const done = qCompleted || qAccepted;
    return (
      <button
        key={person.id}
        type="button"
        onClick={() => {
          audioEngine.playUiClick(0.32);
          setShowAbout(false);
          setSelectedPersonId((cur) => (cur === person.id ? null : person.id));
        }}
        className={[
          "w-full rounded border px-2 py-1.5 flex items-center gap-2.5 text-left cursor-pointer transition-all shrink-0 backdrop-blur-sm",
          isSelected
            ? "bg-[#251d11]/94 border-[#ebca7e] shadow-[0_0_16px_rgba(226,190,115,0.28)]"
            : person.group === "party"
              ? "bg-[#111623]/86 border-[#47536e]/85 hover:border-[#c9a356] hover:bg-[#192030]/92"
              : "bg-[#0d111a]/82 border-[#2a3142]/90 hover:border-[#947945] hover:bg-[#161c2a]/90",
        ].join(" ")}
      >
        <img
          src={assetUrl(person.portraitPath)}
          alt={person.displayName}
          draggable={false}
          className={[
            "w-[42px] h-[42px] object-cover shrink-0 border",
            person.group === "party" ? "rounded-full" : "rounded-sm",
            isSelected ? "border-[#f3d489]" : "border-[#4b566d]",
          ].join(" ")}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className={["font-display text-[13.5px] font-bold leading-tight truncate", isSelected ? "text-[#fff2cc]" : "text-[#ede3cf]"].join(" ")}>
              {person.displayName}
            </span>
            {hasQuest && (
              <span
                className={[
                  "px-1.5 py-0.5 rounded-sm border text-[10px] font-bold uppercase shrink-0",
                  qCompleted
                    ? "bg-[#2a2214] border-[#96783b] text-[#f5d88f]"
                    : done
                      ? "bg-[#162a21] border-[#3c7358] text-[#8be0b2]"
                      : "bg-[#8c6422]/45 border-[#e3b963] text-[#ffe29e]",
                ].join(" ")}
              >
                {qCompleted ? "★" : done ? "✓" : "!"}
              </span>
            )}
          </div>
          <div className={["text-[11px] leading-snug truncate", hasQuest ? "text-[#edd08b]" : "text-[#9caac0]"].join(" ")}>
            {person.quest ? person.quest.title : person.displayRole}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[25] bg-[#05060a] flex flex-col justify-between overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={tavern.name}
    >
      {/* Full-Screen 16:9 Painted Tavern Hall */}
      {tavern.interiorAssetPath && (
        <img
          src={assetUrl(tavern.interiorAssetPath)}
          alt={tavern.name}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
      )}

      {/* Lighter Vignette Shading: Preserves Center Tavern Floor & Right Bard Stage Openly */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: [
            "linear-gradient(180deg, rgba(5,7,12,0.72) 0%, rgba(5,7,12,0.06) 14%, rgba(5,7,12,0.0) 62%, rgba(4,6,10,0.76) 100%)",
            "linear-gradient(90deg, rgba(5,7,12,0.72) 0%, rgba(5,7,12,0.34) 22%, rgba(5,7,12,0) 42%)",
          ].join(", "),
        }}
      />

      {/* TOP CANOPY HEADER */}
      <header className="relative z-[3] w-full max-w-[1680px] mx-auto px-5 md:px-8 pt-4 md:pt-5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5 min-w-0 drop-shadow-[0_3px_12px_rgba(0,0,0,0.9)]">
          {tavern.bannerAssetPath ? (
            <img
              src={assetUrl(tavern.bannerAssetPath)}
              alt=""
              className="w-[38px] h-[52px] object-contain shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.9)]"
              draggable={false}
            />
          ) : (
            <img
              src={assetUrl(tavern.assetPath)}
              alt=""
              className="w-[42px] h-[42px] object-contain shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.9)]"
              draggable={false}
            />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display m-0 text-[22px] md:text-[28px] font-bold tracking-[0.04em] text-[#fae4b0] leading-none truncate">
                {tavern.name}
              </h1>
              {tavern.factionName && (
                <span
                  style={{
                    borderColor: tavern.factionPrimaryColor ?? "#8c7445",
                    backgroundColor: tavern.factionSecondaryColor ?? "#1d2230",
                    color: tavern.factionPrimaryColor ?? "#f4cf83",
                  }}
                  className="px-2.5 py-0.5 rounded-sm border text-[11px] font-semibold tracking-wide shrink-0 shadow"
                >
                  {tavern.factionName}
                </span>
              )}
            </div>
            <div className="text-[11.5px] uppercase tracking-[0.14em] text-[#c7d3e6] mt-1 truncate">
              {parentTown.name} Tavern{tavern.playerRegion ? ` · ${tavern.playerRegion}` : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick();
              onOpenParty();
            }}
            className="hidden sm:flex items-center gap-2.5 rounded border border-[#4a5266]/90 hover:border-[#c8a35a] bg-[#0e121b]/88 hover:bg-[#171d2b]/95 backdrop-blur-sm px-3 py-1.5 cursor-pointer transition-colors shadow-lg"
            title="Open Party & Equipment (P)"
          >
            <div className="flex items-center -space-x-1.5">
              {partyOrder.map((hid) => {
                const hero = getHeroById(hid);
                return (
                  <img
                    key={hid}
                    src={assetUrl(hero.avatarPath)}
                    alt={hero.name}
                    draggable={false}
                    className="w-[28px] h-[28px] rounded-full object-cover border border-[#8e7445]"
                  />
                );
              })}
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold text-[#f2dba6] leading-tight">Party · Lv {partyLevel}</div>
              <div className="text-[10px] text-[#9aa8be] leading-tight">Open (P)</div>
            </div>
          </button>

          <div className="hidden md:flex items-center rounded border border-[#b89146]/90 bg-[#1a150e]/92 text-[#fae4b0] text-[11.5px] font-semibold shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick();
                setSelectedPersonId(null);
                setShowAbout(false);
                setShowSongBlurb((cur) => !cur);
              }}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#2d2417] hover:text-[#fff6dc] cursor-pointer transition-colors"
              title={showSongBlurb ? "Hide Song Story" : "Show Song Story"}
            >
              <span className="text-[#f0c869]">♪</span>
              <span className="max-w-[230px] truncate">{currentBallad?.shortTitle ?? "Tavern Ballad"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick();
                setSelectedPersonId(null);
                setShowAbout(false);
                setShowSongBlurb(true);
                audioEngine.playNextTavernBallad();
              }}
              className="px-2.5 py-1.5 border-l border-[#5b4827] hover:bg-[#352a19] text-[#d4b06a] hover:text-[#fff6dc] text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
            >
              Next Song
            </button>
          </div>

          <button
            type="button"
            onClick={onReturnToTown}
            className="px-4 py-2 rounded border border-[#d7b267]/90 bg-[#251e11]/92 hover:bg-[#382d19] text-[#fae4b0] hover:text-[#fff6dc] text-[12px] font-semibold tracking-wider uppercase cursor-pointer transition-colors shadow-lg"
          >
            ← Back to {parentTown.name}
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playSfx("ui_close", 0.28);
              onClose();
            }}
            className="px-4 py-2 rounded border border-[#7c653e] hover:border-[#e5c174] bg-[#10141e]/90 hover:bg-[#1b2232] text-[#efe0bc] hover:text-[#fff4d2] text-[12px] font-semibold tracking-wider uppercase cursor-pointer transition-colors shadow-lg backdrop-blur-sm"
          >
            Leave to Map (Esc)
          </button>
        </div>
      </header>

      {/* MAIN TAVERN STAGE: Sleek Left Patrons + Party Column, Open Center Blurb, and Slim Lower-Right Floor Bar */}
      <div className="relative z-[2] flex-1 min-h-0 w-full max-w-[1680px] mx-auto px-5 md:px-8 pb-5 md:pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        {/* LEFT RAIL: Your 4 Party Companions + Local Townsfolk Patrons (No Innkeeper) */}
        <aside className="w-full lg:w-[276px] xl:w-[296px] max-h-[42vh] lg:max-h-[calc(100vh-115px)] flex flex-col justify-end gap-3 shrink-0 min-h-0">
          <div className="overflow-y-auto pr-1 space-y-3 min-h-0">
            <div>
              <div className="flex items-center justify-between px-1 mb-1.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#e2be73]">
                  Your Company
                </span>
                <span className="text-[10.5px] text-[#aebbd0]">{people.party.length} Here</span>
              </div>
              <div className="flex flex-col gap-1.5">{people.party.map(renderPersonButton)}</div>
            </div>

            {people.patrons.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-1 mb-1.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#e2be73]">
                    Tavern Patrons
                  </span>
                  <span className="text-[10.5px] text-[#aebbd0]">{people.patrons.length} Inside</span>
                </div>
                <div className="flex flex-col gap-1.5">{people.patrons.map(renderPersonButton)}</div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER OVERLAY: Song Chronicle Blurb (Sits freely in middle tavern floor with generous room & zero scrollbars) */}
        {showSongBlurb && currentBallad && !selectedPerson && !showAbout && (
          <div className="hidden lg:flex fixed inset-x-0 top-[76px] bottom-[84px] lg:pl-[310px] pr-6 z-[3] items-center justify-center pointer-events-none">
            <div className="relative w-[740px] max-w-full h-[332px] xl:h-[344px] pointer-events-auto rounded-[4px] border border-[#c79d4b]/90 bg-[#0b0e17]/90 backdrop-blur-md shadow-[0_24px_70px_rgba(0,0,0,0.92)] px-6 py-5 flex flex-col">
              <CornerFiligree size="sm" />
              <div className="flex items-center justify-between gap-3 border-b border-[#2e364a] pb-3 shrink-0">
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#dfba6b] truncate">
                    Ethoria Tavern Chronicle · {currentBallad.chapterLabel} · {currentBallad.speaker}
                  </div>
                  <h2 className="font-display m-0 text-[20px] xl:text-[22px] font-bold text-[#fae2aa] leading-tight mt-1 truncate">
                    {currentBallad.title}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiClick();
                      audioEngine.playNextTavernBallad();
                    }}
                    className="px-3 py-1 rounded border border-[#8e7445] bg-[#1d180f] hover:bg-[#2d2415] hover:border-[#e2be73] text-[#f5dfb0] text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    ♪ Next Song
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      audioEngine.playUiClick();
                      setShowSongBlurb(false);
                    }}
                    className="px-3 py-1 rounded border border-[#4a5368] bg-[#131824] hover:border-[#d7b267] text-[#cfd9ea] hover:text-white text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    Hide
                  </button>
                </div>
              </div>

              <div className="flex-1 pt-4 flex flex-col justify-between gap-4 min-h-0">
                <p className="text-[13.5px] xl:text-[14.5px] leading-[1.6] text-[#eef2fa]">
                  {currentBallad.overview}
                </p>
                <div className="h-[112px] shrink-0 rounded-sm border-l-2 border-[#d7b267] bg-[#141926]/85 px-4 py-3 flex flex-col gap-1.5">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-[#d9b468]">
                    How It Shaped Ethoria
                  </div>
                  <p className="text-[13px] xl:text-[13.5px] leading-[1.55] text-[#f3dfb1]">
                    {currentBallad.worldHistory}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LOWER-RIGHT TAVERN FLOOR AREA: Slim Controls by Default, or Focused Conversation/About Drawer When Selected */}
        <main className="min-w-0 flex-1 flex flex-col items-end justify-end gap-3">
          {selectedPerson ? (
            <div className="ledger-panel relative w-full max-w-[820px] rounded-[4px] px-5 py-4 flex flex-col gap-3">
              <CornerFiligree size="sm" />
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="shrink-0 rounded-[4px] p-[2px] bg-gradient-to-b from-[#ffe7ad] via-[#c79948] to-[#563d18] shadow-xl">
                  <img
                    src={assetUrl(selectedPerson.portraitPath)}
                    alt={selectedPerson.displayName}
                    draggable={false}
                    className="w-[108px] h-[108px] md:w-[132px] md:h-[132px] rounded-sm object-cover block"
                  />
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3 border-b border-[#2c3446] pb-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#d9b468]">
                        {selectedPerson.displayRole}
                      </div>
                      <h2 className="font-display m-0 text-[21px] md:text-[24px] font-bold text-[#fae2aa] leading-tight mt-0.5">
                        {selectedPerson.displayName}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playUiClick();
                        setSelectedPersonId(null);
                      }}
                      className="px-3 py-1 rounded border border-[#5f5034] hover:border-[#d7b267] bg-[#19150f] text-[#e8d5a8] hover:text-white text-[11px] font-semibold uppercase tracking-wider cursor-pointer shrink-0"
                    >
                      Close
                    </button>
                  </div>

                  <p className="m-0 text-[14px] md:text-[15px] leading-[1.58] text-[#eff3fa] border-l-2 border-[#c8a256] pl-3.5">
                    “{selectedPerson.dialogue}”
                  </p>

                  {selectedPerson.quest && (
                    <div className="border-t border-[#2c3446] pt-2.5 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <QuestCardThumb
                          cardId={selectedPerson.quest.questId}
                          fallbackPath={selectedPerson.quest.assetPath}
                          badgeCardId={questCompleted ? "quest_complete_royal_seal" : undefined}
                          className="w-[54px] h-[54px] rounded border border-[#967741] bg-[#090c12] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#d9b468]">
                            {selectedPerson.quest.title}
                          </div>
                          <div className="text-[12px] text-[#b8c8df] mt-0.5">
                            Reward: {formatRewardLine(selectedPerson.quest.reward)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={questAccepted || questCompleted}
                        onClick={() => onAcceptQuest(selectedPerson.quest!)}
                        className={[
                          "px-4 py-2 rounded border text-[12px] font-bold uppercase tracking-wider shrink-0 transition-colors",
                          questCompleted
                            ? "border-[#96783b] bg-[#261f12] text-[#f5d88f] cursor-default"
                            : questAccepted
                              ? "border-[#3c785b] bg-[#142920] text-[#91e3b8] cursor-default"
                              : "border-[#e6c170] bg-[#c99b44]/35 hover:bg-[#c99b44]/55 text-[#fff4d4] cursor-pointer",
                        ].join(" ")}
                      >
                        {questCompleted ? "★ Completed" : questAccepted ? "✓ Quest Accepted" : "Accept Quest"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : showAbout ? (
            <div className="ledger-panel relative w-full max-w-[760px] rounded-[4px] px-5 py-4 flex flex-col gap-2.5">
              <CornerFiligree size="sm" />
              <div className="flex items-center justify-between gap-3 border-b border-[#2c3446] pb-2">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[#d7b267] font-semibold">
                    {parentTown.name} · {tavern.playerRegion ?? "Ethoria"}
                  </div>
                  <h2 className="font-display m-0 text-[22px] font-bold text-[#fae2aa] leading-tight mt-0.5">
                    {tavern.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playUiClick();
                    setShowAbout(false);
                  }}
                  className="px-3 py-1 rounded border border-[#5f5034] hover:border-[#d7b267] bg-[#19150f] text-[#e8d5a8] hover:text-white text-[11px] font-semibold uppercase tracking-wider cursor-pointer"
                >
                  Close
                </button>
              </div>
              <p className="m-0 text-[14.5px] leading-[1.6] text-[#e7ecf6] border-l-2 border-[#c8a256] pl-3.5">
                {tavern.playerDescription}
              </p>
            </div>
          ) : null}

          {/* Slim Compact Tavern Action Bar (Never crowds room artwork) */}
          <div className="rounded-[4px] border border-[#323a4d] bg-[#0a0d15]/90 backdrop-blur-sm px-4 py-2.5 flex flex-wrap items-center gap-2 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick();
                setSelectedPersonId(null);
                setShowAbout(false);
                setShowSongBlurb(true);
                audioEngine.playNextTavernBallad();
              }}
              className="rounded border border-[#b89146] bg-[#292112]/94 hover:bg-[#382d18] hover:border-[#f4d182] text-[#fff0c2] px-3.5 py-2 text-[12.5px] font-bold leading-none transition-all cursor-pointer"
            >
              ♪ Next Song
            </button>

            {currentBallad && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.playUiClick();
                  setSelectedPersonId(null);
                  setShowAbout(false);
                  setShowSongBlurb((cur) => !cur);
                }}
                className={[
                  "rounded border px-3.5 py-2 text-[12.5px] font-semibold leading-none transition-all cursor-pointer",
                  showSongBlurb && !selectedPerson && !showAbout
                    ? "border-[#e2be73] bg-[#2a2214] text-[#fff1c9]"
                    : "border-[#5e4d30] bg-[#1a150e] hover:border-[#d7b267] text-[#efd9a6] hover:text-[#fff1c9]",
                ].join(" ")}
              >
                {showSongBlurb && !selectedPerson && !showAbout ? "Hide Song Story" : "Song Story"}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                audioEngine.playUiClick();
                setSelectedPersonId(null);
                setShowAbout((cur) => !cur);
              }}
              className={[
                "rounded border px-3.5 py-2 text-[12.5px] font-semibold leading-none transition-all cursor-pointer",
                showAbout
                  ? "border-[#e2be73] bg-[#2a2214] text-[#fff1c9]"
                  : "border-[#3c4559] bg-[#141925] hover:border-[#9e8453] text-[#ccd6e8] hover:text-[#f8e4b6]",
              ].join(" ")}
            >
              About Tavern
            </button>

            <button
              type="button"
              onClick={onReturnToTown}
              className="rounded border border-[#7c653e] bg-[#1c160d] hover:border-[#e2be73] hover:bg-[#2a2113] text-[#f5dfb0] px-3.5 py-2 text-[12.5px] font-semibold leading-none transition-all cursor-pointer"
            >
              ← Back to {parentTown.name}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
