"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ProspectModal, { type ProspectInput, type ProspectStatus, type ProspectCategorie } from "@/components/prospects/ProspectModal";
import GenerationModal from "@/components/prospects/GenerationModal";
import RelanceModal from "@/components/relances/RelanceModal";
import SiteHeader from "@/components/site-header";

type ProspectGenRow = {
  id: string;
  type: string;
  description: string | null;
  content: string | null;
  created_at: string;
};

type Prospect = ProspectInput & {
  id: string;
  created_at: string;
  updated_at: string;
  categorie?: ProspectCategorie;
};

type Relance = {
  id: string;
  titre: string;
  scheduled_at: string;
  statut: "planifiée" | "envoyée" | "annulée";
  prospect_id: string | null;
  prospect_email: string | null;
  message: string | null;
  type: "email" | "rappel" | "les deux";
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

function relanceStatusClass(status: Relance["statut"]) {
  if (status === "planifiée") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (status === "envoyée") return "bg-green-500/10 text-green-400 border-green-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

function temperatureClass(temperature: "chaud" | "tiède" | "froid") {
  if (temperature === "chaud") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (temperature === "tiède") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-blue-500/10 text-blue-400 border-blue-500/20";
}

function temperatureLabel(temperature: "chaud" | "tiède" | "froid") {
  if (temperature === "chaud") return "🔴 Chaud";
  if (temperature === "tiède") return "🟡 Tiède";
  return "🔵 Froid";
}

function normalizeCategorie(value: string | null | undefined): ProspectCategorie {
  return value === "vendeur" ? "vendeur" : "acheteur";
}

function generationTypeTitle(type: string): string {
  if (type === "email") return "Email généré";
  if (type === "compte-rendu") return "Compte-rendu";
  if (type === "annonce") return "Annonce";
  return "Génération";
}

function excerpt100(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= 100) return t;
  return `${t.slice(0, 100)}…`;
}

function fullGenerationText(row: ProspectGenRow): string {
  const c = row.content?.trim();
  if (c) return c;
  const d = row.description?.trim();
  if (d) return d;
  return "Aucun contenu détaillé disponible.";
}

function formatBudget(budget: string) {
  const num = parseInt(budget.replace(/\D/g, ""));
  if (isNaN(num)) return budget;
  return new Intl.NumberFormat("fr-FR").format(num) + " €";
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date
    .toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    })
    .replace(":", "h");
}

export default function ProspectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [emailGenerations, setEmailGenerations] = useState<ProspectGenRow[]>([]);
  const [crGenerations, setCrGenerations] = useState<ProspectGenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [relanceOpen, setRelanceOpen] = useState(false);
  const [relances, setRelances] = useState<Relance[]>([]);
  const [genModal, setGenModal] = useState<{ title: string; content: string } | null>(null);

  async function load() {
    if (!params?.id) return;
    setLoading(true);
    const [res, emailRes, crRes, relanceRes] = await Promise.all([
      fetch(`/api/prospects/${params.id}`),
      fetch(`/api/generations?prospect_id=${params.id}&type=email`),
      fetch(`/api/generations?prospect_id=${params.id}&type=compte-rendu`),
      fetch(`/api/relances?prospect_id=${params.id}`),
    ]);
    const data = (await res.json()) as { prospect?: Prospect; error?: string };
    setProspect(
      data.prospect
        ? {
            ...data.prospect,
            telephone: data.prospect.telephone ?? "",
            email: data.prospect.email ?? "",
            budget: data.prospect.budget ?? "",
            type_bien: data.prospect.type_bien ?? "",
            adresse: (data.prospect as { adresse?: string | null }).adresse ?? "",
            notes: data.prospect.notes ?? "",
          }
        : null,
    );

    const emailData = (await emailRes.json()) as { generations?: ProspectGenRow[]; error?: string };
    const crData = (await crRes.json()) as { generations?: ProspectGenRow[]; error?: string };
    setEmailGenerations(emailRes.ok ? (emailData.generations ?? []) : []);
    setCrGenerations(crRes.ok ? (crData.generations ?? []) : []);

    const relanceData = (await relanceRes.json()) as { relances?: Relance[] };
    setRelances(relanceData.relances ?? []);
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
      budget: prospect.budget ?? "",
      type_bien: prospect.type_bien ?? "",
      adresse: prospect.adresse ?? "",
      notes: prospect.notes,
      categorie: normalizeCategorie(prospect.categorie),
      temperature:
        prospect.temperature === "chaud" ||
        prospect.temperature === "tiède" ||
        prospect.temperature === "froid"
          ? prospect.temperature
          : "tiède",
    };
  }, [prospect]);

  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string;
      date: string;
      type: "creation" | "email" | "compte-rendu" | "relance";
      label: string;
      sublabel?: string;
      badge?: string;
      badgeClass?: string;
    }> = [];

    if (prospect) {
      items.push({
        id: "creation",
        date: prospect.created_at,
        type: "creation",
        label: "Prospect ajouté",
        sublabel: prospect.nom,
      });
    }

    for (const g of emailGenerations) {
      items.push({
        id: g.id,
        date: g.created_at,
        type: "email",
        label: "Email généré",
        sublabel: g.description ?? undefined,
      });
    }

    for (const g of crGenerations) {
      items.push({
        id: g.id,
        date: g.created_at,
        type: "compte-rendu",
        label: "Compte-rendu généré",
        sublabel: g.description ?? undefined,
      });
    }

    for (const r of relances) {
      items.push({
        id: r.id,
        date: r.scheduled_at,
        type: "relance",
        label: r.titre,
        badge: r.statut,
        badgeClass:
          r.statut === "planifiée"
            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
            : r.statut === "envoyée"
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20",
      });
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [prospect, emailGenerations, crGenerations, relances]);

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

  async function exportProspectPDF() {
    const p = prospect;
    if (!p) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    const categorie = normalizeCategorie(p.categorie);

    const tempLabel =
      p.temperature === "chaud"
        ? "Chaud"
        : String(p.temperature) === "tiede" || p.temperature === "tiède"
          ? "Tiede"
          : "Froid";
    const categorieLabel = categorie === "vendeur" ? "Vendeur" : "Acheteur";

    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 297, "F");
    doc.setFillColor(184, 150, 90);
    doc.rect(0, 0, 210, 2, "F");

    doc.setFontSize(22);
    doc.setTextColor(245, 245, 240);
    doc.text(p.nom, 20, 20);

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`${p.statut} - ${categorieLabel} - ${tempLabel}`, 20, 30);

    doc.setDrawColor(184, 150, 90);
    doc.setLineWidth(0.3);
    doc.line(20, 35, 190, 35);

    const fields =
      categorie === "vendeur"
        ? [
            ["Email", p.email || "-"],
            ["Telephone", p.telephone || "-"],
            ["Adresse du bien", p.adresse || "-"],
            ["Prix de vente souhaite", p.budget ? formatBudget(p.budget) : "-"],
            ["Type de bien", p.type_bien || "-"],
          ]
        : [
            ["Email", p.email || "-"],
            ["Telephone", p.telephone || "-"],
            ["Budget", p.budget ? formatBudget(p.budget) : "-"],
            ["Type de bien recherche", p.type_bien || "-"],
          ];

    let y = 45;
    for (const [label, value] of fields) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(label.toUpperCase(), 20, y);
      doc.setFontSize(11);
      doc.setTextColor(245, 245, 240);
      const lines = doc.splitTextToSize(value, 170);
      doc.text(lines, 20, y + 6);
      y += 8 + lines.length * 6;
    }

    if (p.notes) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("NOTES", 20, y + 4);
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(245, 245, 240);
      const lines = doc.splitTextToSize(p.notes, 170);
      doc.text(lines, 20, y);
      y += lines.length * 6 + 8;
    }

    if (relances.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("RELANCES", 20, y + 4);
      y += 10;
      for (const r of relances) {
        doc.setFontSize(10);
        doc.setTextColor(245, 245, 240);
        doc.text(`- ${r.titre} (${r.statut})`, 20, y);
        y += 7;
      }
    }

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Genere par FlowEstate - ${new Date().toLocaleDateString("fr-FR")}`, 20, 285);

    doc.save(`prospect-${p.nom.replace(/\s+/g, "-").toLowerCase()}.pdf`);
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
                <span className="ml-2 mt-1 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-xs text-[#A0A0A0]">
                  {normalizeCategorie(prospect.categorie) === "vendeur" ? "Vendeur" : "Acheteur"}
                </span>
                <span className={`ml-2 mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs ${temperatureClass(prospect.temperature)}`}>{temperatureLabel(prospect.temperature)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void exportProspectPDF()}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-[#C9A96E]/40 hover:text-[#C9A96E]"
            >
              Exporter PDF
            </button>
            <button type="button" onClick={() => setEditOpen(true)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-[#C9A96E]/40 hover:text-[#C9A96E]">Modifier</button>
            {confirmDelete ? (
              <button type="button" onClick={() => void removeProspect()} className="rounded-full border border-red-500/40 px-4 py-2 text-sm text-red-300">Confirmer ?</button>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-red-500/40 hover:text-red-300">Supprimer</button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(normalizeCategorie(prospect.categorie) === "vendeur"
            ? [
                ["Email", prospect.email || "—"],
                ["Téléphone", prospect.telephone || "—"],
                ["Adresse du bien", prospect.adresse || "—"],
                ["Prix de vente souhaité", prospect.budget ? formatBudget(prospect.budget) : "—"],
                ["Type de bien à vendre", prospect.type_bien || "—"],
              ]
            : [
                ["Email", prospect.email || "—"],
                ["Téléphone", prospect.telephone || "—"],
                ["Budget", prospect.budget ? formatBudget(prospect.budget) : "—"],
                ["Type de bien recherché", prospect.type_bien || "—"],
              ]
          ).map(([label, value]) => (
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

        <section className="mt-6">
          <h2 className="mb-4 text-lg font-semibold">Timeline</h2>
          <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="absolute left-[2.1rem] top-5 bottom-5 w-px bg-[#C9A96E]/15" aria-hidden />
            <ul className="space-y-4">
              {timelineItems.map((item) => {
                const iconColor =
                  item.type === "creation"
                    ? "bg-[#C9A96E]/20 text-[#C9A96E]"
                    : item.type === "email"
                      ? "bg-blue-500/20 text-blue-400"
                      : item.type === "compte-rendu"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-orange-500/20 text-orange-400";

                const icon =
                  item.type === "creation" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  ) : item.type === "email" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  ) : item.type === "compte-rendu" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  );

                return (
                  <li key={item.id} className="flex items-start gap-4">
                    <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconColor}`}>
                      {icon}
                    </span>
                    <div className="flex-1 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm text-[#F5F5F0]">{item.label}</p>
                        {item.badge ? (
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${item.badgeClass}`}>
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                      {item.sublabel ? (
                        <p className="mt-0.5 text-xs text-[#A0A0A0] line-clamp-1">{item.sublabel}</p>
                      ) : null}
                      <p className="mt-0.5 text-xs text-[#555]">{formatDate(item.date)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs uppercase tracking-wider text-[#555]">Statut</p>
          <select value={prospect.statut} onChange={(e) => void updateStatus(e.target.value as ProspectStatus)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#121212] px-3 py-2 text-sm text-[#F5F5F0] outline-none md:max-w-xs">
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Relances</h2>
            <button type="button" onClick={() => setRelanceOpen(true)} className="rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]">
              Programmer une relance
            </button>
          </div>

          {relances.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-[#A0A0A0]">Aucune relance liée à ce prospect</p>
          ) : (
            <ul className="space-y-3">
              {relances.map((r) => (
                <li key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#A0A0A0]">{formatDate(r.scheduled_at)}</p>
                      <p className="mt-1 text-sm text-[#F5F5F0]">{r.titre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${relanceStatusClass(r.statut)}`}>{r.statut}</span>
                      {r.statut === "planifiée" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void (async () => {
                              await fetch(`/api/relances/${r.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ statut: "annulée" }),
                              });
                              void load();
                            })()
                          }
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#A0A0A0] transition hover:border-red-500/40 hover:text-red-300"
                        >
                          Annuler
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Emails générés</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/emails?prospect_id=${prospect.id}`}
                className="rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
              >
                Générer un email
              </Link>
              <span className="text-sm text-[#A0A0A0]">{emailGenerations.length}</span>
            </div>
          </div>
          {emailGenerations.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-[#A0A0A0]">Aucun email généré pour ce prospect</p>
          ) : (
            <ul className="space-y-3">
              {emailGenerations.map((g) => (
                <li key={g.id} className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#A0A0A0]">{formatDate(g.created_at)}</p>
                      <p className="mt-1 text-sm text-[#F5F5F0]">{excerpt100(fullGenerationText(g))}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setGenModal({
                          title: `${generationTypeTitle(g.type)} — ${formatDate(g.created_at)}`,
                          content: fullGenerationText(g),
                        })
                      }
                      className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs text-[#C9A96E] transition hover:border-[#C9A96E]/40"
                    >
                      Voir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Comptes-rendus</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/comptes-rendus?prospect_id=${prospect.id}`}
                className="rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
              >
                Générer un compte-rendu
              </Link>
              <span className="text-sm text-[#A0A0A0]">{crGenerations.length}</span>
            </div>
          </div>
          {crGenerations.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-[#A0A0A0]">Aucun compte-rendu pour ce prospect</p>
          ) : (
            <ul className="space-y-3">
              {crGenerations.map((g) => (
                <li key={g.id} className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#A0A0A0]">{formatDate(g.created_at)}</p>
                      <p className="mt-1 text-sm text-[#F5F5F0]">{excerpt100(fullGenerationText(g))}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setGenModal({
                          title: `${generationTypeTitle(g.type)} — ${formatDate(g.created_at)}`,
                          content: fullGenerationText(g),
                        })
                      }
                      className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs text-[#C9A96E] transition hover:border-[#C9A96E]/40"
                    >
                      Voir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <GenerationModal
        open={Boolean(genModal)}
        onClose={() => setGenModal(null)}
        title={genModal?.title ?? ""}
        content={genModal?.content ?? ""}
      />

      <ProspectModal
        open={editOpen}
        mode="edit"
        prospectId={prospect.id}
        initialValue={editInitial}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          const u = updated as Prospect;
          setProspect({
            ...u,
            telephone: u.telephone ?? "",
            email: u.email ?? "",
            budget: u.budget ?? "",
            type_bien: u.type_bien ?? "",
            adresse: u.adresse ?? "",
            notes: u.notes ?? "",
          });
          void load();
        }}
      />
      <RelanceModal
        open={relanceOpen}
        mode="create"
        defaultProspectId={prospect.id}
        initialValue={{
          id: "",
          titre: "",
          message: "",
          type: "email",
          prospect_id: prospect.id,
          prospect_email: prospect.email ?? "",
          scheduled_at: "",
        }}
        onClose={() => setRelanceOpen(false)}
        onSaved={() => void load()}
      />
    </main>
  );
}
