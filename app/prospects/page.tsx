"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ProspectModal, { type ProspectInput, type ProspectStatus } from "@/components/prospects/ProspectModal";
import SiteHeader from "@/components/site-header";

type Prospect = ProspectInput & {
  id: string;
  created_at: string;
  updated_at: string;
  generationsCount?: number;
};

type StatusFilter = "Tous" | ProspectStatus;
const statuses: StatusFilter[] = ["Tous", "Nouveau", "Contacté", "Visite planifiée", "Offre faite", "Signé", "Perdu"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusClass(status: ProspectStatus) {
  if (status === "Nouveau") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (status === "Contacté") return "bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/20";
  if (status === "Visite planifiée") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  if (status === "Offre faite") return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (status === "Signé") return "bg-green-500/10 text-green-400 border-green-500/20";
  return "bg-red-500/10 text-red-400/60 border-red-500/20";
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("Tous");
  const [modalOpen, setModalOpen] = useState(false);

  async function loadProspects() {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "Tous") params.set("statut", status);
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/prospects${params.size ? `?${params.toString()}` : ""}`);
    const data = (await res.json()) as { prospects?: Prospect[] };
    setProspects(data.prospects ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadProspects();
  }, [status]);

  useEffect(() => {
    const t = setTimeout(() => void loadProspects(), 250);
    return () => clearTimeout(t);
  }, [search]);

  const empty = useMemo(() => !loading && prospects.length === 0, [loading, prospects.length]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 md:px-10">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-[#F5F5F0]">Mes prospects</h1>
          <button type="button" onClick={() => setModalOpen(true)} className="rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A]">
            Nouveau prospect
          </button>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full border px-3 py-1 text-xs transition ${status === s ? "border-[#C9A96E]/40 bg-[#C9A96E]/15 text-[#C9A96E]" : "border-white/10 text-[#A0A0A0]"}`}
            >
              {s}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un prospect..."
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[#F5F5F0] outline-none"
        />

        {loading ? <p className="mt-6 text-sm text-[#A0A0A0]">Chargement...</p> : null}

        {empty ? (
          <div className="mt-10 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={1.8} className="mx-auto mb-3" aria-hidden>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6M23 11h-6" />
            </svg>
            <p className="text-sm text-[#555]">Aucun prospect pour l&apos;instant</p>
            <button type="button" onClick={() => setModalOpen(true)} className="mt-3 rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]">Ajouter mon premier prospect</button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prospects.map((prospect) => (
              <Link key={prospect.id} href={`/prospects/${prospect.id}`} className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition duration-200 hover:border-[#C9A96E]/30 hover:bg-white/[0.04]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C9A96E]/15 text-sm font-medium text-[#C9A96E]">{initials(prospect.nom)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base font-medium text-[#F5F5F0]">{prospect.nom}</p>
                      <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] ${statusClass(prospect.statut)}`}>{prospect.statut}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#A0A0A0]">{prospect.email || "—"} {prospect.telephone ? `• ${prospect.telephone}` : ""}</p>
                    <p className="mt-1 text-xs text-[#A0A0A0]">{prospect.type_bien || "Type non renseigné"} {prospect.budget ? `• ${prospect.budget}` : ""}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-[#555]">{prospect.notes || "Aucune note"}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#444]">
                      <span>Ajouté le {new Date(prospect.created_at).toLocaleDateString("fr-FR")}</span>
                      <span>{prospect.generationsCount ?? 0} générations</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ProspectModal
        open={modalOpen}
        mode="create"
        onClose={() => setModalOpen(false)}
        onSaved={() => void loadProspects()}
      />
    </main>
  );
}
