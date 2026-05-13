"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export type ProspectStatus = "Nouveau" | "Contacté" | "Visite planifiée" | "Offre faite" | "Signé" | "Perdu";
export type ProspectTemperature = "chaud" | "tiède" | "froid";
export type ProspectCategorie = "acheteur" | "vendeur";

export type ProspectInput = {
  nom: string;
  telephone: string;
  email: string;
  statut: ProspectStatus;
  temperature: ProspectTemperature;
  categorie: ProspectCategorie;
  budget: string;
  type_bien: string;
  adresse: string;
  notes: string;
};

type ProspectModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: ProspectInput;
  /** Obligatoire en mode `edit` pour PATCH /api/prospects/:id */
  prospectId?: string;
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
  temperature: "tiède",
  categorie: "acheteur",
  budget: "",
  type_bien: "",
  adresse: "",
  notes: "",
};

export default function ProspectModal({ open, mode, initialValue, prospectId, onClose, onSaved }: ProspectModalProps) {
  const [form, setForm] = useState<ProspectInput>(initialValue ?? emptyForm);
  const [temperature, setTemperature] = useState<ProspectTemperature>("tiède");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = initialValue ?? emptyForm;
    setForm({
      ...next,
      categorie: next.categorie === "vendeur" ? "vendeur" : "acheteur",
      adresse: typeof next.adresse === "string" ? next.adresse : "",
    });
    setTemperature(
      next.temperature === "chaud" || next.temperature === "tiède" || next.temperature === "froid"
        ? next.temperature
        : "tiède",
    );
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

    if (mode === "edit" && !prospectId) {
      toast.error("Identifiant prospect manquant");
      return;
    }

    setSaving(true);
    try {
      const endpoint = mode === "create" ? "/api/prospects" : `/api/prospects/${prospectId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const payload = {
        nom: form.nom.trim(),
        telephone: form.telephone.trim(),
        email: form.email.trim(),
        statut: form.statut,
        temperature,
        categorie: form.categorie,
        budget: form.budget.trim() || null,
        type_bien: form.type_bien.trim() || null,
        adresse: form.categorie === "vendeur" ? form.adresse.trim() || null : null,
        notes: form.notes.trim() || null,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-[#C9A96E]/20 bg-[#0A0A0A]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#C9A96E]/10 bg-[#060606] px-6 py-4">
          <h3 className="text-base font-medium text-[#F5F5F0]">
            {mode === "create" ? "Nouveau prospect" : "Modifier le prospect"}
          </h3>
          <button type="button" onClick={onClose} className="text-[#555] transition hover:text-[#888]" aria-label="Fermer">✕</button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <span className="mb-2 block text-xs uppercase tracking-wider text-[#666]">Profil</span>
            <div className="flex gap-2">
              {(["acheteur", "vendeur"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, categorie: cat }))}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-medium transition ${
                    form.categorie === cat
                      ? "border-[#C9A96E]/40 bg-[#C9A96E]/15 text-[#C9A96E]"
                      : "border-white/10 bg-white/[0.03] text-[#A0A0A0]"
                  }`}
                >
                  {cat === "acheteur" ? "Acheteur" : "Vendeur"}
                </button>
              ))}
            </div>
          </div>

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

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wider text-[#666]">Température</label>
            <div className="flex gap-2">
              {(["chaud", "tiède", "froid"] as const).map((temp) => (
                <button
                  key={temp}
                  type="button"
                  onClick={() => {
                    setTemperature(temp);
                    setForm((p) => ({ ...p, temperature: temp }));
                  }}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-medium transition ${
                    temperature === temp
                      ? temp === "chaud"
                        ? "border-red-500/50 bg-red-500/20 text-red-400"
                        : temp === "froid"
                          ? "border-blue-500/50 bg-blue-500/20 text-blue-400"
                          : "border-yellow-500/50 bg-yellow-500/20 text-yellow-400"
                      : "border-white/10 bg-white/[0.03] text-[#A0A0A0]"
                  }`}
                >
                  {temp === "chaud" ? "🔴 Chaud" : temp === "froid" ? "🔵 Froid" : "🟡 Tiède"}
                </button>
              ))}
            </div>
          </div>

          {form.categorie === "acheteur" ? (
            <>
              <label className="block space-y-1">
                <span className="text-xs text-[#666]">Budget</span>
                <input
                  placeholder="Ex: 350 000 €"
                  value={form.budget}
                  onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[#666]">Type de bien recherché</span>
                <input
                  placeholder="Ex: Appartement 3 pièces Paris"
                  value={form.type_bien}
                  onChange={(e) => setForm((p) => ({ ...p, type_bien: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50"
                />
              </label>
            </>
          ) : (
            <>
              <label className="block space-y-1">
                <span className="text-xs text-[#666]">Adresse du bien</span>
                <input
                  placeholder="Ex: 12 rue de la Paix, Paris 75001"
                  value={form.adresse}
                  onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[#666]">Prix de vente souhaité</span>
                <input
                  placeholder="Ex: 450 000 €"
                  value={form.budget}
                  onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[#666]">Type de bien à vendre</span>
                <input
                  placeholder="Ex: Appartement 3 pièces"
                  value={form.type_bien}
                  onChange={(e) => setForm((p) => ({ ...p, type_bien: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50"
                />
              </label>
            </>
          )}

          <label className="block space-y-1">
            <span className="text-xs text-[#666]">Notes</span>
            <textarea rows={3} placeholder="Informations complémentaires..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]/50" />
          </label>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-white/10 bg-[#0A0A0A] px-6 pb-5 pt-4">
          <button type="button" onClick={onClose} className="text-sm text-[#555] transition hover:text-[#888]">Annuler</button>
          <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="rounded-full border-[1.5px] border-[#C9A96E] px-5 py-2 text-sm font-medium text-[#C9A96E] transition duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:opacity-50">
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
