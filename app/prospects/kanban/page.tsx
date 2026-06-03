"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ProspectModal, {
  type ProspectInput,
  type ProspectStatus,
  type ProspectCategorie,
} from "@/components/prospects/ProspectModal";
import SiteHeader from "@/components/site-header";

type ProspectTemperature = "chaud" | "tiède" | "froid";

type Prospect = ProspectInput & {
  id: string;
  created_at: string;
  updated_at: string;
};

const KANBAN_COLUMNS: ProspectStatus[] = [
  "Nouveau",
  "Contacté",
  "Visite planifiée",
  "Offre faite",
  "Signé",
  "Perdu",
];

function normalizeProspectTemperature(value: string | null | undefined): ProspectTemperature {
  if (value === "chaud" || value === "tiède" || value === "froid") return value;
  return "tiède";
}

function normalizeProspectCategorie(value: string | null | undefined): ProspectCategorie {
  if (value === "vendeur") return "vendeur";
  return "acheteur";
}

function columnBorderClass(status: ProspectStatus) {
  if (status === "Nouveau") return "border-blue-500/25";
  if (status === "Contacté") return "border-[#C9A96E]/25";
  if (status === "Visite planifiée") return "border-purple-500/25";
  if (status === "Offre faite") return "border-orange-500/25";
  if (status === "Signé") return "border-green-500/25";
  return "border-red-500/25";
}

function temperatureBadgeClass(temperature: ProspectTemperature) {
  if (temperature === "chaud") return "bg-red-500/10 text-red-400 border-red-500/20";
  if (temperature === "froid") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
}

function temperatureLabel(temperature: ProspectTemperature) {
  if (temperature === "chaud") return "🔴 Chaud";
  if (temperature === "tiède") return "🟡 Tiède";
  return "🔵 Froid";
}

function formatBudget(budget: string) {
  const num = parseInt(budget.replace(/\D/g, ""));
  if (isNaN(num)) return budget || "—";
  return new Intl.NumberFormat("fr-FR").format(num) + " €";
}

export default function ProspectsKanbanPage() {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ProspectStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadProspects = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/prospects");
    const data = (await res.json()) as { prospects?: Prospect[] };
    const raw = data.prospects ?? [];
    setProspects(
      raw.map((p) => ({
        ...p,
        temperature: normalizeProspectTemperature(p.temperature as string | null | undefined),
        categorie: normalizeProspectCategorie((p as { categorie?: string }).categorie),
        telephone: p.telephone ?? "",
        email: p.email ?? "",
        budget: p.budget ?? "",
        type_bien: p.type_bien ?? "",
        adresse: (p as { adresse?: string | null }).adresse ?? "",
        notes: p.notes ?? "",
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadProspects();
  }, [loadProspects]);

  const byStatus = useMemo(() => {
    const map = new Map<ProspectStatus, Prospect[]>();
    for (const col of KANBAN_COLUMNS) map.set(col, []);
    for (const p of prospects) {
      const list = map.get(p.statut);
      if (list) list.push(p);
      else map.get("Nouveau")!.push(p);
    }
    return map;
  }, [prospects]);

  async function moveProspect(prospectId: string, newStatus: ProspectStatus) {
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect || prospect.statut === newStatus) return;

    setUpdatingId(prospectId);
    setProspects((prev) =>
      prev.map((p) => (p.id === prospectId ? { ...p, statut: newStatus } : p)),
    );

    const res = await fetch(`/api/prospects/${prospectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: newStatus }),
    });
    const data = (await res.json()) as { prospect?: Prospect; error?: string };

    if (!res.ok || !data.prospect) {
      setProspects((prev) =>
        prev.map((p) => (p.id === prospectId ? { ...p, statut: prospect.statut } : p)),
      );
      toast.error(data.error ?? "Impossible de déplacer le prospect");
      setUpdatingId(null);
      return;
    }

    toast.success(`Prospect déplacé vers « ${newStatus} »`);
    setUpdatingId(null);
  }

  function handleDrop(e: React.DragEvent, columnStatus: ProspectStatus) {
    e.preventDefault();
    setDropTarget(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    void moveProspect(id, columnStatus);
    setDraggingId(null);
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <SiteHeader />
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-24 pt-32 md:px-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/prospects"
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-[#C9A96E]/40 hover:text-[#C9A96E]"
          >
            Vue liste
          </Link>
          <h1 className="flex-1 text-center text-2xl font-semibold text-[#F5F5F0] md:text-left">
            Kanban prospects
          </h1>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-full border border-[#C9A96E] px-4 py-2 text-sm text-[#C9A96E] transition duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
          >
            Nouveau prospect
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-[#A0A0A0]">Chargement des prospects...</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((columnStatus) => {
              const columnProspects = byStatus.get(columnStatus) ?? [];
              const isTarget = dropTarget === columnStatus;

              return (
                <div
                  key={columnStatus}
                  className={`min-w-[260px] flex-1 rounded-2xl border bg-white/[0.02] p-4 transition-colors ${columnBorderClass(columnStatus)} ${
                    isTarget ? "bg-white/[0.05] ring-1 ring-[#C9A96E]/30" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDropTarget(columnStatus);
                  }}
                  onDragLeave={() => {
                    setDropTarget((prev) => (prev === columnStatus ? null : prev));
                  }}
                  onDrop={(e) => handleDrop(e, columnStatus)}
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-medium text-[#F5F5F0]">{columnStatus}</h2>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-[#A0A0A0]">
                      {columnProspects.length}
                    </span>
                  </div>

                  <ul className="space-y-3">
                    {columnProspects.map((prospect) => (
                      <li key={prospect.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          draggable={updatingId !== prospect.id}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", prospect.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggingId(prospect.id);
                          }}
                          onDragEnd={() => setDraggingId(null)}
                          onClick={() => {
                            if (draggingId) return;
                            router.push(`/prospects/${prospect.id}`);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              router.push(`/prospects/${prospect.id}`);
                            }
                          }}
                          className={`cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] p-4 transition duration-200 hover:border-[#C9A96E]/30 hover:bg-white/[0.05] ${
                            draggingId === prospect.id ? "opacity-50" : ""
                          } ${updatingId === prospect.id ? "pointer-events-none opacity-60" : ""}`}
                        >
                          <p className="font-medium text-[#F5F5F0]">{prospect.nom}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${temperatureBadgeClass(prospect.temperature)}`}
                            >
                              {temperatureLabel(prospect.temperature)}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs text-[#A0A0A0]">
                              {prospect.categorie === "vendeur" ? "Vendeur" : "Acheteur"}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-xs text-[#A0A0A0]">
                            {prospect.email || "—"}
                          </p>
                          <p className="mt-1 text-xs text-[#C9A96E]">
                            {prospect.budget ? formatBudget(prospect.budget) : "—"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
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
