import React from "react";

interface ServiceChipProps {
  label: string;
}

export const ServiceChip: React.FC<ServiceChipProps> = ({ label }) => {
  const lower = label.toLowerCase();
  let cls = "bg-[#171d29] border-[#3d4a63] text-[#d6deec]";
  let icon = (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1.5 9.8 5.4l4.2.6-3 3 .7 4.2L8 11.2l-3.7 2 .7-4.2-3-3 4.2-.6L8 1.5z" />
    </svg>
  );

  if (lower.includes("inn") || lower.includes("rest") || lower.includes("barracks") || lower.includes("camp")) {
    cls = "bg-[#15241f] border-[#2e6650]/80 text-[#9ce0be]";
    icon = (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h9A1.5 1.5 0 0 1 14 5.5V12h-1.5v-1.5h-9V12H2V5.5Zm2 1.2V9h3.2V6.7H4Zm4.8 0V9H12V6.7H8.8Z" />
      </svg>
    );
  } else if (lower.includes("armory") || lower.includes("provisions")) {
    cls = "bg-[#251f15] border-[#785c30]/80 text-[#f1cb88]";
    icon = (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5 13 3.4v4.1c0 3.2-2.1 5.7-5 6.9-2.9-1.2-5-3.7-5-6.9V3.4L8 1.5Z" />
      </svg>
    );
  } else if (lower.includes("mystic") || lower.includes("herbal")) {
    cls = "bg-[#1c1a2c] border-[#524685]/80 text-[#c3b8f7]";
    icon = (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1 9.6 6.4 15 8l-5.4 1.6L8 15 6.4 9.6 1 8l5.4-1.6L8 1Z" />
      </svg>
    );
  } else if (lower.includes("arena") || lower.includes("bounties") || lower.includes("stronghold")) {
    cls = "bg-[#28181b] border-[#7a3742]/80 text-[#f2a8b2]";
    icon = (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="m12.8 1.8 1.4 1.4-6.9 6.9 1.3 1.3-1.1 1.1-1.6-1.6-2.4 2.4-1.2-1.2 2.4-2.4-1.6-1.6 1.1-1.1 1.3 1.3 7.3-6.5Z" />
      </svg>
    );
  } else if (lower.includes("ship") || lower.includes("sea") || lower.includes("ferry") || lower.includes("pass")) {
    cls = "bg-[#13222a] border-[#2e6678]/80 text-[#97d9eb]";
    icon = (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm2.7 3.8-1.6 3.8-3.8 1.6 1.6-3.8 3.8-1.6Z" />
      </svg>
    );
  } else if (lower.includes("keep")) {
    cls = "bg-[#262013] border-[#8c6c31]/80 text-[#f6dc9b]";
    icon = (
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 12.5h12V14H2v-1.5Zm.6-7.8 2.8 2.4L8 3.2l2.6 3.9 2.8-2.4-.9 6.5H3.5L2.6 4.7Z" />
      </svg>
    );
  }

  const displayLabel = label.replace(/\bFree\s+/gi, "").trim();

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10.5px] font-medium tracking-wide ${cls}`}>
      {icon}
      <span>{displayLabel}</span>
    </span>
  );
};
