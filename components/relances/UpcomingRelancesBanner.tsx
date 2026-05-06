"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Relance = { id: string; scheduled_at: string; statut: string };

export default function UpcomingRelancesBanner() {
  const [relances, setRelances] = useState<Relance[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/relances?statut=planifiée");
      const data = (await res.json()) as { relances?: Relance[] };
      setRelances(data.relances ?? []);
    })();
  }, []);

  const soonCount = useMemo(() => {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;
    return relances.filter((r) => {
      const ts = new Date(r.scheduled_at).getTime();
      return ts >= now && ts <= in24h;
    }).length;
  }, [relances]);

  if (soonCount === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-[#C9A96E]/20 bg-[#C9A96E]/[0.08] px-5 py-4">
      <div className="flex items-center gap-2 text-[#C9A96E]">
        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
        <p className="text-sm font-medium">Vous avez {soonCount} relance(s) qui seront envoyées automatiquement aujourd&apos;hui</p>
      </div>
      <Link href="/relances" className="mt-2 inline-flex text-sm text-[#C9A96E] hover:underline">Voir les relances →</Link>
    </div>
  );
}
