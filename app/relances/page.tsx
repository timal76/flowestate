"use client";

import { useEffect, useMemo, useState } from "react";

import RelanceModal from "@/components/relances/RelanceModal";
import SiteHeader from "@/components/site-header";

type StatusFilter = "toutes" | "planifiée" | "envoyée" | "annulée";

type Relance = {
  id: string;
  titre: string;
  message: string | null;
  scheduled_at: string;
  statut: "planifiée" | "envoyée" | "annulée";
  type: "email" | "rappel" | "les deux";
  prospect?: { id: string; nom: string } | null;
};

function statusClass(status: Relance["statut"]) {
  if (status === "planifiée") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (status === "envoyée") return "bg-green-500/10 text-green-400 border-green-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

export default function RelancesPage() {
  const [relances, setRelances] = useState<Relance[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("toutes");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Relance | null>(null);

  async function load() {
    const q = filter === "toutes" ? "" : `?statut=${encodeURIComponent(filter)}`;
    const res = await fetch(`/api/relances${q}`);
    const data = (await res.json()) as { relances?: Relance[] };
    setRelances(data.relances ?? []);
  }

  useEffect(() => {
    void load();
  }, [filter]);

  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    return relances.filter((r) => {
      if (r.statut !== "planifiée") return false;
      const t = new Date(r.scheduled_at);
      return t.getFullYear() === y && t.getMonth() === m && t.getDate() === day;
    });
  }, [relances]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 md:px-10">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Relances programmées</h1>
          <button type="button" onClick={() => { setEditing(null); setOpen(true); }} className="rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A]">Nouvelle relance</button>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {([
            ["toutes", "Toutes"],
            ["planifiée", "Planifiées"],
            ["envoyée", "Envoyées"],
            ["annulée", "Annulées"],
          ] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-xs ${filter === k ? "border-[#C9A96E]/40 bg-[#C9A96E]/15 text-[#C9A96E]" : "border-white/10 text-[#A0A0A0]"}`}>
              {label}
            </button>
          ))}
        </div>

        {today.length > 0 ? (
          <div className="mb-6 rounded-2xl border border-[#C9A96E]/20 bg-[#C9A96E]/5 p-4">
            <p className="text-sm font-medium text-[#C9A96E]">📅 Aujourd&apos;hui</p>
            <ul className="mt-2 space-y-1 text-sm text-[#A0A0A0]">
              {today.map((r) => <li key={`today-${r.id}`}>{r.titre}</li>)}
            </ul>
          </div>
        ) : null}

        {relances.length === 0 ? (
          <div className="py-16 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={1.8} className="mx-auto mb-3" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p className="text-sm text-[#555]">Aucune relance programmée</p>
            <button type="button" onClick={() => { setEditing(null); setOpen(true); }} className="mt-3 rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]">Programmer ma première relance</button>
          </div>
        ) : (
          <div>
            {relances.map((r) => (
              <div key={r.id} className="mb-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition duration-200 hover:border-[#C9A96E]/30">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C9A96E]/25 bg-[#C9A96E]/10 text-[#C9A96E]">
                    <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-[#F5F5F0]">{r.titre}</p>
                    {r.prospect ? <p className="mt-1 text-xs text-[#C9A96E]">Pour {r.prospect.nom}</p> : null}
                    <p className="mt-1 text-sm text-[#A0A0A0]">{(r.message || "").slice(0, 80)}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusClass(r.statut)}`}>{r.statut}</span>
                    <p className="mt-1 text-xs text-[#A0A0A0]">{new Date(r.scheduled_at).toLocaleString("fr-FR")}</p>
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => { setEditing(r); setOpen(true); }} className="text-[#A0A0A0] hover:text-[#C9A96E]" aria-label="Modifier">✎</button>
                      <button type="button" onClick={() => void (async () => { await fetch(`/api/relances/${r.id}`, { method: "DELETE" }); await load(); })()} className="text-[#A0A0A0] hover:text-red-400" aria-label="Supprimer">🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RelanceModal
        open={open}
        mode={editing ? "edit" : "create"}
        initialValue={editing ? {
          id: editing.id,
          titre: editing.titre,
          message: editing.message ?? "",
          type: editing.type,
          prospect_id: (editing as any).prospect_id ?? null,
          prospect_email: (editing as any).prospect_email ?? "",
          scheduled_at: new Date(editing.scheduled_at).toISOString().slice(0, 16),
        } : undefined}
        onClose={() => setOpen(false)}
        onSaved={() => void load()}
      />
    </main>
  );
}
