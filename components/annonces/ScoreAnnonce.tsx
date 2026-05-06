"use client";

import type { ScoreResult } from "@/lib/scoreAnnonce";

type ScoreAnnonceProps = {
  score: ScoreResult;
};

function scoreTone(total: number) {
  if (total >= 8) {
    return {
      circle: "border-2 border-green-500/50 bg-green-500/10 text-green-400",
      bar: "bg-green-400",
    };
  }
  if (total >= 5) {
    return {
      circle: "border-2 border-[#C9A96E]/50 bg-[#C9A96E]/10 text-[#C9A96E]",
      bar: "bg-[#C9A96E]",
    };
  }
  return {
    circle: "border-2 border-red-500/50 bg-red-500/10 text-red-400",
    bar: "bg-red-400",
  };
}

export default function ScoreAnnonce({ score }: ScoreAnnonceProps) {
  const tone = scoreTone(score.total);
  const width = `${(score.total / 10) * 100}%`;

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#F5F5F0]">Score de l'annonce</p>
          <p className="mt-0.5 text-xs text-[#555]">Basé sur 7 critères objectifs</p>
        </div>
        <div className={`flex h-14 w-14 items-center justify-center rounded-full text-sm font-semibold ${tone.circle}`}>
          {score.total}/10
        </div>
      </div>

      <div className="mb-5 h-1 rounded-sm bg-white/10">
        <div className={`h-1 rounded-sm transition-all duration-700 ease-out ${tone.bar}`} style={{ width }} />
      </div>

      <ul>
        {score.details.map((detail, index) => {
          const hasPoints = detail.points > 0;
          const isLast = index === score.details.length - 1;
          return (
            <li key={detail.critere} className={`py-2 ${isLast ? "" : "border-b border-white/[0.04]"}`}>
              <div className="flex items-center gap-3">
                <span className={hasPoints ? "text-green-400" : "text-red-400/60"}>{hasPoints ? "✓" : "✗"}</span>
                <p className="flex-1 text-sm text-[#A0A0A0]">{detail.critere}</p>
                <p className="text-xs text-[#555]">{detail.points}/{detail.maxPoints} pts</p>
              </div>
              {detail.conseil ? <p className="mt-[3px] text-xs italic text-[#C9A96E]/70">{detail.conseil}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
