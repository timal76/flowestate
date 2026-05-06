"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type RelanceStatus = "planifiée" | "envoyée" | "annulée";
export type RelanceType = "email" | "rappel" | "les deux";

export type RelanceInput = {
  titre: string;
  message: string;
  scheduled_at: string;
  type: RelanceType;
  prospect_id: string | null;
  prospect_email: string;
};

type ProspectLite = { id: string; nom: string; email: string | null };

type RelanceModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: RelanceInput & { id?: string };
  defaultProspectId?: string | null;
  onClose: () => void;
  onSaved: (relance: unknown) => void;
};

const empty: RelanceInput = {
  titre: "",
  message: "",
  scheduled_at: "",
  type: "email",
  prospect_id: null,
  prospect_email: "",
};

export default function RelanceModal({ open, mode, initialValue, defaultProspectId, onClose, onSaved }: RelanceModalProps) {
  const [form, setForm] = useState<RelanceInput>(initialValue ?? empty);
  const [prospects, setProspects] = useState<ProspectLite[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialValue ?? { ...empty, prospect_id: defaultProspectId ?? null });
    void (async () => {
      const res = await fetch("/api/prospects");
      const data = (await res.json()) as { prospects?: ProspectLite[] };
      setProspects((data.prospects ?? []).map((p) => ({ id: p.id, nom: p.nom, email: p.email ?? null })));
    })();
  }, [open, initialValue, defaultProspectId]);

  const selectedProspect = useMemo(
    () => prospects.find((p) => p.id === form.prospect_id) ?? null,
    [prospects, form.prospect_id],
  );

  if (!open) return null;

  async function submit() {
    if (!form.titre.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (!form.scheduled_at) {
      toast.error("La date est requise");
      return;
    }
    if ((form.type === "email" || form.type === "les deux") && !form.prospect_email.trim()) {
      toast.error("L'email destinataire est requis");
      return;
    }

    setSaving(true);
    try {
      const endpoint = mode === "create" ? "/api/relances" : `/api/relances/${initialValue?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { relance?: unknown; error?: string };
      if (!res.ok || !data.relance) throw new Error(data.error ?? "Erreur lors de l'enregistrement.");
      toast.success(mode === "create" ? "Relance programmée" : "Relance mise à jour");
      onSaved(data.relance);
      onClose();
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[#C9A96E]/20 bg-[#0A0A0A]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#C9A96E]/10 bg-[#060606] px-6 py-4">
          <h3 className="text-base font-medium text-[#F5F5F0]">{mode === "create" ? "Nouvelle relance" : "Modifier la relance"}</h3>
          <button type="button" onClick={onClose} className="text-[#555] hover:text-[#888]">✕</button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Titre*</span>
            <input value={form.titre} onChange={(e) => setForm((p) => ({ ...p, titre: e.target.value }))} placeholder="Ex: Relance suite visite appartement" className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Prospect lié (optionnel)</span>
            <select
              value={form.prospect_id ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                const found = prospects.find((p) => p.id === id);
                setForm((p) => ({ ...p, prospect_id: id, prospect_email: found?.email ?? p.prospect_email }));
              }}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50"
            >
              <option value="">Aucun prospect</option>
              {prospects.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Email destinataire</span>
            <input type="email" value={form.prospect_email} onChange={(e) => setForm((p) => ({ ...p, prospect_email: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Date et heure</span>
            <input type="datetime-local" min={new Date().toISOString().slice(0, 16)} value={form.scheduled_at} onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
          </label>

          <div className="space-y-1">
            <span className="text-xs text-[#666]">Type</span>
            <div className="flex flex-wrap gap-2">
              {([
                ["email", "Email"],
                ["rappel", "Rappel dans l'app"],
                ["les deux", "Les deux"],
              ] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setForm((p) => ({ ...p, type: key }))} className={`rounded-full border px-3 py-1 text-xs ${form.type === key ? "border-[#C9A96E]/40 bg-[#C9A96E]/15 text-[#C9A96E]" : "border-white/10 bg-white/[0.03] text-[#A0A0A0]"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="flex items-center justify-between text-xs text-[#666]">
              <span>Message</span>
              <button
                type="button"
                onClick={() => {
                  const prospectId = selectedProspect?.id;
                  const url = prospectId ? `/emails?prospect_id=${prospectId}` : "/emails";
                  window.open(url, "_blank");
                }}
                className="text-[#C9A96E] hover:underline"
              >
                Rédiger l&apos;email →
              </button>
            </span>
            <textarea rows={4} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
          </label>

          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={onClose} className="text-sm text-[#555] hover:text-[#888]">Annuler</button>
            <button type="button" onClick={() => void submit()} disabled={saving} className="rounded-full border-[1.5px] border-[#C9A96E] px-5 py-2 text-sm font-medium text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:opacity-50">
              {saving ? "Enregistrement..." : "Programmer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
