import React from "react";
import { formatSaveTime } from "../api";
import { audioEngine } from "../audio";
import type { AudioSettings, SaveSlotData } from "../types";

interface LoadModalProps {
  open: boolean;
  saves: SaveSlotData[];
  onSelect: (slot: SaveSlotData) => void;
  onClose: () => void;
}

export const LoadCampaignModal: React.FC<LoadModalProps> = ({ open, saves, onSelect, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 bg-[#06070b]/80 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="rpg-modal-panel w-[540px] max-w-[90vw] max-h-[82vh] rounded p-6 flex flex-col">
        <header className="flex items-center justify-between border-b border-[#353b4a] pb-3 mb-4">
          <h2 className="font-display m-0 text-[17px] tracking-[0.14em] uppercase text-[#f0d79d]">Load Game</h2>
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick();
              onClose();
            }}
            className="w-[30px] h-[30px] rounded border border-[#484f60] hover:border-[#d7b267] text-[#c8c0af] hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[55vh]">
          {saves.length === 0 ? (
            <div className="text-center py-7 px-4 text-[#9ba3b4] text-[14px]">No saved campaigns found yet.</div>
          ) : (
            saves.map((s) => (
              <button
                key={s.slotId}
                type="button"
                onClick={() => {
                  audioEngine.playDoorOpen();
                  onSelect(s);
                }}
                className="flex items-center justify-between gap-3 px-3.5 py-3 bg-[#171b25]/95 hover:bg-[#222735] border border-[#454b5c] hover:border-[#d7b267] rounded cursor-pointer text-left transition-colors"
              >
                <div>
                  <div className="text-[15px] font-bold text-[#f3dfb1]">
                    {s.label} — {s.heroName} (Lv {s.level})
                  </div>
                  <div className="text-[12px] text-[#a6afbf] mt-0.5">
                    {s.regionLabel} · Saved {formatSaveTime(s.savedAt)}
                  </div>
                </div>
                <span className="font-display text-[13px] tracking-widest uppercase text-[#d7b267]">Load</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  open: boolean;
  audio: AudioSettings;
  onChangeAudio: <K extends keyof AudioSettings>(key: K, value: AudioSettings[K]) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, audio, onChangeAudio, onClose }) => {
  if (!open) return null;
  const rows: Array<{ key: "master" | "music" | "sfx"; label: string }> = [
    { key: "master", label: "Master Volume" },
    { key: "music", label: "Music Volume" },
    { key: "sfx", label: "SFX Volume" },
  ];

  return (
    <div className="fixed inset-0 z-30 bg-[#06070b]/80 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="rpg-modal-panel w-[380px] max-w-[90vw] rounded p-6 flex flex-col">
        <header className="flex items-center justify-between border-b border-[#353b4a] pb-3 mb-4">
          <h2 className="font-display m-0 text-[17px] tracking-[0.14em] uppercase text-[#f0d79d]">Settings</h2>
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick();
              onClose();
            }}
            className="w-[30px] h-[30px] rounded border border-[#484f60] hover:border-[#d7b267] text-[#c8c0af] hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-3.5">
          {rows.map((r) => (
            <div key={r.key} className="flex flex-col gap-1.5">
              <label className="flex justify-between text-[13px] text-[#ddd4c1]">
                <span>{r.label}</span>
                <span>{audio[r.key]}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={audio[r.key]}
                onChange={(e) => onChangeAudio(r.key, Number(e.target.value))}
                onMouseUp={() => {
                  if (r.key === "sfx" || r.key === "master") audioEngine.playUiClick();
                }}
                className="w-full accent-[#d7b267]"
              />
            </div>
          ))}
          <label className="flex items-center justify-between gap-3 pt-1 text-[13px] text-[#ddd4c1] cursor-pointer select-none">
            <span>Mute Audio When Unfocused</span>
            <input
              type="checkbox"
              checked={audio.muteOnUnfocus}
              onChange={(e) => {
                audioEngine.playUiClick();
                onChangeAudio("muteOnUnfocus", e.target.checked);
              }}
              className="w-4 h-4 accent-[#d7b267] cursor-pointer"
            />
          </label>
          <p className="mt-1 pt-2.5 border-t border-[#2b303e] text-[12px] text-[#9ba3b4] leading-relaxed m-0">
            Move with WASD, Arrow Keys, or Left-Click.
          </p>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  open: boolean;
  onResume: () => void;
  onOpenParty: () => void;
  onSave: () => void;
  onOpenLoad: () => void;
  onOpenSettings: () => void;
  onReturnTitle: () => void;
  onQuit: () => void;
}

export const PauseMenuModal: React.FC<PauseModalProps> = ({
  open,
  onResume,
  onOpenParty,
  onSave,
  onOpenLoad,
  onOpenSettings,
  onReturnTitle,
  onQuit,
}) => {
  if (!open) return null;
  const items = [
    { label: "Resume", action: onResume, quit: false },
    { label: "Party (P)", action: onOpenParty, quit: false },
    { label: "Save Game", action: onSave, quit: false },
    { label: "Load Game", action: onOpenLoad, quit: false },
    { label: "Settings", action: onOpenSettings, quit: false },
    { label: "Return to Title", action: onReturnTitle, quit: false },
    { label: "Quit to Desktop", action: onQuit, quit: true },
  ];

  return (
    <div className="fixed inset-0 z-25 bg-[#06070b]/80 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="rpg-modal-panel w-[380px] max-w-[90vw] rounded p-6 flex flex-col">
        <header className="flex items-center justify-between border-b border-[#353b4a] pb-3 mb-4">
          <h2 className="font-display m-0 text-[17px] tracking-[0.14em] uppercase text-[#f0d79d]">Pause Menu</h2>
        </header>
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                if (it.label !== "Save Game") audioEngine.playUiClick();
                it.action();
              }}
              className={[
                "flex items-center gap-3 w-full text-left py-2.5 px-3.5 rounded border cursor-pointer transition-all",
                it.quit
                  ? "text-[#ffd7d2] border-[#c96358]/30 hover:bg-[#a8483e]/20 hover:border-[#c96358]/50"
                  : "text-[#e9dec6] border-transparent hover:text-[#fff2cc] hover:bg-[#c49848]/20 hover:border-[#d7b267]/35",
              ].join(" ")}
            >
              <span className={it.quit ? "text-[#e87a6e] text-[11px]" : "text-[#f2c96c] text-[11px]"}>◆</span>
              <span className="font-display text-[15px] font-semibold tracking-[0.12em] uppercase">{it.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ConfirmNewCampaignModalProps {
  open: boolean;
  existingSave: SaveSlotData | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmNewCampaignModal: React.FC<ConfirmNewCampaignModalProps> = ({
  open,
  existingSave,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 bg-[#06070b]/85 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="rpg-modal-panel relative w-[460px] max-w-[92vw] rounded p-6 flex flex-col">
        <span className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t-2 border-l-2 border-[#e0ba6c] pointer-events-none" />
        <span className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t-2 border-r-2 border-[#e0ba6c] pointer-events-none" />
        <span className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b-2 border-l-2 border-[#e0ba6c] pointer-events-none" />
        <span className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b-2 border-r-2 border-[#e0ba6c] pointer-events-none" />

        <header className="flex items-center justify-between border-b border-[#353b4a] pb-3 mb-4">
          <h2 className="font-display m-0 text-[17px] tracking-[0.14em] uppercase text-[#f0d79d]">
            Wipe Save &amp; Start Over?
          </h2>
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick();
              onCancel();
            }}
            className="w-[30px] h-[30px] rounded border border-[#484f60] hover:border-[#d7b267] text-[#c8c0af] hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </header>

        <p className="m-0 text-[13.5px] leading-relaxed text-[#dce3f0]">
          Starting a <strong className="text-[#f3dfb1]">New Campaign</strong> will{" "}
          <strong className="text-[#ffd2cc]">permanently wipe your current save</strong> and start your adventure over from
          Highcrown Keep.
        </p>

        {existingSave && (
          <div className="mt-3.5 px-3.5 py-2.5 rounded bg-[#141822]/95 border border-[#483e2b]">
            <div className="text-[11px] uppercase tracking-[0.12em] text-[#a89572] font-semibold">Current Save</div>
            <div className="text-[14px] font-bold text-[#f3dfb1] mt-0.5">
              {existingSave.heroName} · Level {existingSave.level || 1}
            </div>
            <div className="text-[12px] text-[#9aa6bc] mt-0.5">
              {existingSave.regionLabel} · Saved {formatSaveTime(existingSave.savedAt)}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick();
              onCancel();
            }}
            className="px-4 py-2 rounded border border-[#4a5266] hover:border-[#d7b267] bg-[#181c26] hover:bg-[#222735] text-[#dce2ee] hover:text-white text-[13px] font-semibold cursor-pointer transition-colors"
          >
            Keep Current Save
          </button>
          <button
            type="button"
            onClick={() => {
              audioEngine.playUiClick(0.5);
              onConfirm();
            }}
            className="px-4 py-2 rounded border border-[#c96358]/80 hover:border-[#f08b7e] bg-[#7c2923]/75 hover:bg-[#99332b]/85 text-[#ffe6e2] hover:text-white text-[13px] font-semibold tracking-wide cursor-pointer transition-colors"
          >
            Wipe Save &amp; Start Over
          </button>
        </div>
      </div>
    </div>
  );
};
