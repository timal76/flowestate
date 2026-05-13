"use client";

import { useMemo, useState } from "react";

import GenerationModal from "@/components/prospects/GenerationModal";

const goldRgb = "201, 169, 110";

type ActivityType = "annonce" | "email" | "compte-rendu";

export type ClickableGenerationItem = {
  id: string;
  type: string;
  description: string;
  secondaryLine: string;
  fullContent: string;
};

function isActivityType(t: string): t is ActivityType {
  return t === "annonce" || t === "email" || t === "compte-rendu";
}

function typeLabel(type: ActivityType) {
  if (type === "annonce") return "Annonce";
  if (type === "email") return "Email";
  return "Compte-rendu";
}

const activityIconShellClass =
  "inline-flex h-10 w-10 flex-none shrink-0 items-center justify-center rounded-full border border-solid box-border aspect-square";
const activityIconShellStyle = {
  borderColor: `rgba(${goldRgb}, 0.45)`,
  backgroundColor: `rgba(${goldRgb}, 0.12)`,
} as const;

function ActivityIcon({ type }: { type: ActivityType }) {
  const iconClass = "block shrink-0 text-[#C9A96E]";
  if (type === "annonce") {
    return (
      <div className={`${activityIconShellClass} text-[#F5F5F0]`} style={activityIconShellStyle}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
    );
  }
  if (type === "email") {
    return (
      <div className={`${activityIconShellClass} text-[#F5F5F0]`} style={activityIconShellStyle}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}
          aria-hidden
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`${activityIconShellClass} text-[#F5F5F0]`} style={activityIconShellStyle}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={iconClass}
        aria-hidden
      >
        <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" />
        <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    </div>
  );
}

type Selected = ClickableGenerationItem & { activityType: ActivityType };

export default function ClickableGenerationsList({ items }: { items: ClickableGenerationItem[] }) {
  const [selected, setSelected] = useState<Selected | null>(null);

  const modalTitle = useMemo(() => {
    if (!selected) return "";
    return `${typeLabel(selected.activityType)} — ${selected.secondaryLine}`;
  }, [selected]);

  return (
    <>
      <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
        {items.map((row) => {
          const activityType: ActivityType = isActivityType(row.type) ? row.type : "annonce";
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setSelected({ ...row, activityType })}
                className="flex w-full cursor-pointer flex-wrap items-center gap-4 border border-transparent px-5 py-4 text-left transition hover:border-[#C9A96E]/30 sm:flex-nowrap"
              >
                <div className="shrink-0">
                  <ActivityIcon type={activityType} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#F5F5F0]">{row.description}</p>
                  <p className="mt-0.5 text-xs text-[#A0A0A0]">{row.secondaryLine}</p>
                </div>
                <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-[#C9A96E]">
                  {typeLabel(activityType)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <GenerationModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={modalTitle}
        content={selected?.fullContent ?? ""}
      />
    </>
  );
}
