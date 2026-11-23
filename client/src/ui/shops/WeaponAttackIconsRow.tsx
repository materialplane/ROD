import React from "react";
import { assetUrl } from "../api";
import { weaponAttackTooltipHandlers } from "./itemTooltip";
import { getWeaponAttackSpecs } from "./shopLogic";

interface WeaponAttackIconsRowProps {
  subType: string | undefined;
  damageType?: string;
  size?: "sm" | "md";
  suppressParentItemTooltip?: boolean;
}

/** Framed weapon attack icons row; hovering either icon opens its Attack Skill Tooltip. */
export const WeaponAttackIconsRow: React.FC<WeaponAttackIconsRowProps> = ({
  subType,
  damageType,
  size = "md",
  suppressParentItemTooltip = false,
}) => {
  const pair = getWeaponAttackSpecs(subType, damageType);
  const boxCls = size === "sm" ? "w-8 h-8" : "w-11 h-11";

  return (
    <div className="flex items-center gap-2 shrink-0">
      {pair.map((info) => (
        <button
          key={info.spec.id}
          type="button"
          aria-label={info.spec.name}
          {...weaponAttackTooltipHandlers(subType, info.slot, damageType, {
            suppressItemTooltip: suppressParentItemTooltip,
          })}
          className={`relative ${boxCls} rounded border border-[#8c703b] bg-[#0b0e16] hover:border-[#f4d182] hover:shadow-[0_0_12px_rgba(244,209,130,0.34)] hover:-translate-y-px transition-all overflow-hidden cursor-pointer shrink-0`}
        >
          <img
            src={assetUrl(info.iconPath)}
            alt={info.spec.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </button>
      ))}
    </div>
  );
};
