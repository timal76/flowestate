"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

export type ProspectStatus = "Nouveau" | "Contacté" | "Visite planifiée" | "Offre faite" | "Signé" | "Perdu";

export type ProspectInput = {
  nom: string;
  telephone: string;
  email: string;
  statut: ProspectStatus;
  budget: string;
  type_bien: string;
  notes: string;
};

type ProspectModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: ProspectInput;
  onClose: () => void;
  onSaved: (prospect: unknown) => void;
};

const statuses: ProspectStatus[] = [
  "Nouveau",
  "Contacté",
  "Visite planifiée",
  "Offre faite",
  "Signé",
  "Perdu",
];

const emptyForm: ProspectInput = {
  nom: "",
  telephone: "",
  email: "",
  statut: "Nouveau",
  budget: "",
  type_bien: "",
  notes: "",
};

export default function ProspectModal({ open, mode, initialValue, onClose, onSaved }: ProspectModalProps) {
  const [form, setForm] = useState<ProspectInput>(initialValue ?? emptyForm);
  const [saving, setSaving] = useState(false);

  useMemo(() => {
    if (!open) return;
    setForm(initialValue ?? emptyForm);
  }, [initialValue, open]);

  if (!open) return null;

  async function handleSubmit() {
    const nom = form.nom.trim();
    if (!nom) {
      toast.error("Le nom est requis");
      return;
    }

    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast.error("Format email invalide");
      return;
    }

    setSaving(true);
    try {
      const endpoint = mode === "create" ? "/api/prospects" : `/api/prospects/${(initialValue as any)?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { prospect?: unknown; error?: string };
      if (!res.ok || !data.prospect) throw new Error(data.error ?? "Erreur lors de l'enregistrement.");

      toast.success(mode === "create" ? "Prospect créé" : "Prospect mis à jour");
      onSaved(data.prospect);
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
          <h3 className="text-base font-medium text-[#F5F5F0]">
            {mode === "create" ? "Nouveau prospect" : "Modifier le prospect"}
          </h3>
          <button type="button" onClick={onClose} className="text-[#555] transition hover:text-[#888]" aria-label="Fermer">✕</button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Nom*</span>
            <input value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-[#666]">Email</span>
              <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-[#666]">Téléphone</span>
              <input value={form.telephone} onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Statut</span>
            <select value={form.statut} onChange={(e) => setForm((p) => ({ ...p, statut: e.target.value as ProspectStatus }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50">
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Budget</span>
            <input placeholder="Ex: 350 000 €" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Type de bien recherché</span>
            <input placeholder="Ex: Appartement 3 pièces Paris" value={form.type_bien} onChange={(e) => setForm((p) => ({ ...p, type_bien: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Notes</span>
            <textarea rows={3} placeholder="Informations complémentaires..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
          </label>

          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={onClose} className="text-sm text-[#555] transition hover:text-[#888]">Annuler</button>
            <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="rounded-full border-[1.5px] border-[#C9A96E] px-5 py-2 text-sm font-medium text-[#C9A96E] transition duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
