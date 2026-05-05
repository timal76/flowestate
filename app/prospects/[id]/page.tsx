"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ProspectModal, { type ProspectInput, type ProspectStatus } from "@/components/prospects/ProspectModal";
import SiteHeader from "@/components/site-header";

type Generation = {
  id: string;
  type: "annonce" | "email" | "compte-rendu";
  description: string | null;
  created_at: string;
};

type Prospect = ProspectInput & {
  id: string;
  created_at: string;
  updated_at: string;
};

const statuses: ProspectStatus[] = ["Nouveau", "Contacté", "Visite planifiée", "Offre faite", "Signé", "Perdu"];

function statusClass(status: ProspectStatus) {
  if (status === "Nouveau") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (status === "Contacté") return "bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/20";
  if (status === "Visite planifiée") return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  if (status === "Offre faite") return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (status === "Signé") return "bg-green-500/10 text-green-400 border-green-500/20";
  return "bg-red-500/10 text-red-400/60 border-red-500/20";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProspectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    if (!params?.id) return;
    setLoading(true);
    const res = await fetch(`/api/prospects/${params.id}`);
    const data = (await res.json()) as { prospect?: Prospect; generations?: Generation[] };
    setProspect(data.prospect ?? null);
    setGenerations(data.generations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [params?.id]);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const editInitial: ProspectInput | undefined = useMemo(() => {
    if (!prospect) return undefined;
    return {
      nom: prospect.nom,
      telephone: prospect.telephone,
      email: prospect.email,
      statut: prospect.statut,
      budget: prospect.budget,
      type_bien: prospect.type_bien,
      notes: prospect.notes,
    };
  }, [prospect]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-10">Chargement...</div>
      </main>
    );
  }

  if (!prospect) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-10">Prospect introuvable.</div>
      </main>
    );
  }

  async function updateStatus(next: ProspectStatus) {
    if (!prospect) return;
    const res = await fetch(`/api/prospects/${prospect.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: next }),
    });
    const data = (await res.json()) as { prospect?: Prospect; error?: string };
    if (!res.ok || !data.prospect) {
      toast.error(data.error ?? "Impossible de mettre à jour le statut");
      return;
    }
    setProspect(data.prospect);
    toast.success("Statut mis à jour");
  }

  async function removeProspect() {
    if (!prospect) return;
    const res = await fetch(`/api/prospects/${prospect.id}`, { method: "DELETE" });
    const data = (await res.json()) as { success?: boolean; error?: string };
    if (!res.ok || !data.success) {
      toast.error(data.error ?? "Impossible de supprimer");
      return;
    }
    router.push("/prospects");
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 md:px-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link href="/prospects" className="text-sm text-[#A0A0A0] transition hover:text-[#C9A96E]">← Prospects</Link>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C9A96E]/15 text-lg font-medium text-[#C9A96E]">{initials(prospect.nom)}</div>
              <div>
                <h1 className="text-2xl font-semibold">{prospect.nom}</h1>
                <span className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs ${statusClass(prospect.statut)}`}>{prospect.statut}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setEditOpen(true)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-[#C9A96E]/40 hover:text-[#C9A96E]">Modifier</button>
            {confirmDelete ? (
              <button type="button" onClick={() => void removeProspect()} className="rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-300">Confirmer ?</button>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-red-500/40 hover:text-red-300">Supprimer</button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Email", prospect.email || "—"],
            ["Téléphone", prospect.telephone || "—"],
            ["Budget", prospect.budget || "—"],
            ["Type de bien", prospect.type_bien || "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-xs uppercase tracking-wider text-[#555]">{label}</p>
              <p className="mt-1 text-sm text-[#F5F5F0]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-wider text-[#555]">Notes</p>
          <p className="mt-2 text-sm leading-relaxed text-[#A0A0A0]">{prospect.notes || "Aucune note"}</p>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-wider text-[#555]">Statut</p>
          <select value={prospect.statut} onChange={(e) => void updateStatus(e.target.value as ProspectStatus)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-[#F5F5F0] outline-none md:max-w-xs">
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Historique des générations</h2>
            <span className="text-sm text-[#A0A0A0]">{generations.length}</span>
          </div>

          {generations.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-[#A0A0A0]">Aucune génération liée à ce prospect</p>
          ) : (
            <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
              {generations.map((g) => (
                <li key={g.id} className="px-5 py-4">
                  <p className="text-xs text-[#A0A0A0]">{new Date(g.created_at).toLocaleDateString("fr-FR")} • {g.type}</p>
                  <p className="mt-1 text-sm text-[#F5F5F0]">{(g.description || "Génération").slice(0, 80)}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/annonces?prospect_id=${prospect.id}`} className="rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]">Générer une annonce pour ce prospect</Link>
            <Link href={`/emails?prospect_id=${prospect.id}`} className="rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]">Générer un email pour ce prospect</Link>
          </div>
        </section>
      </div>

      <ProspectModal
        open={editOpen}
        mode="edit"
        initialValue={editInitial}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setProspect(updated as Prospect);
          void load();
        }}
      />
    </main>
  );
}
