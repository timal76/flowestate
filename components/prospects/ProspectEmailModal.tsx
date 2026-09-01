"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { ProspectInput } from "@/components/prospects/ProspectModal";
import QuotaExceededModal from "@/components/paywall/QuotaExceededModal";
import { buildProspectEmailPayload } from "@/lib/prospect-email-context";
import type { GenerationApiErrorPayload } from "@/lib/generation-limit-api";
import { isQuotaExceededResponse } from "@/lib/generation-limit-api";
import { supabase } from "@/lib/supabase";

type ProspectForEmail = ProspectInput & { id: string };

type ProspectEmailModalProps = {
  open: boolean;
  prospect: ProspectForEmail | null;
  onClose: () => void;
  onGenerated?: () => void;
};

type AgentProfile = {
  agentName: string;
  agencyName: string;
  agentPhone: string;
  agentEmail: string;
};

type RelanceRow = {
  id: string;
  statut: "planifiée" | "envoyée" | "annulée";
};

export default function ProspectEmailModal({
  open,
  prospect,
  onClose,
  onGenerated,
}: ProspectEmailModalProps) {
  const { data: session } = useSession();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [tone, setTone] = useState<"Professionnel" | "Chaleureux" | "Urgent">("Professionnel");
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMarkingSent, setIsMarkingSent] = useState(false);
  const [quotaPaywallOpen, setQuotaPaywallOpen] = useState(false);
  const [quotaPaywallPlan, setQuotaPaywallPlan] = useState<string | null>(null);
  const [plannedRelanceId, setPlannedRelanceId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !prospect) return;

    setGeneratedEmail("");
    setTone("Professionnel");
    setPlannedRelanceId(null);

    void (async () => {
      if (!session?.user?.id) return;

      const [profileRes, relanceRes, historyRes] = await Promise.all([
        supabase
          .from("users")
          .select("agency_name, first_name, last_name, phone, email")
          .eq("id", session.user.id)
          .single(),
        fetch(`/api/relances?prospect_id=${prospect.id}`),
        fetch(`/api/generations?prospect_id=${prospect.id}&type=email`),
      ]);

      const profile = profileRes.data;
      if (profile) {
        setAgent({
          agentName:
            profile.first_name && profile.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : "",
          agencyName: profile.agency_name || "",
          agentPhone: profile.phone || "",
          agentEmail: profile.email || "",
        });
      }

      const relanceData = (await relanceRes.json()) as { relances?: RelanceRow[] };
      const planned = (relanceData.relances ?? []).find((r) => r.statut === "planifiée");
      setPlannedRelanceId(planned?.id ?? null);

      const historyData = (await historyRes.json()) as {
        generations?: Array<{ description?: string | null; content?: string | null; created_at?: string }>;
      };
      void historyData;
    })();
  }, [open, prospect, session?.user?.id]);

  const handleGenerate = useCallback(async () => {
    if (!prospect || !agent) return;

    setIsGenerating(true);
    try {
      const historyRes = await fetch(`/api/generations?prospect_id=${prospect.id}&type=email`);
      const historyData = (await historyRes.json()) as {
        generations?: Array<{ description?: string | null; content?: string | null; created_at?: string }>;
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.user?.id) headers["x-user-id"] = session.user.id;

      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers,
        body: JSON.stringify(
          buildProspectEmailPayload(prospect, agent, {
            tone,
            emailHistory: historyData.generations ?? [],
          }),
        ),
      });

      const payload = (await response.json()) as GenerationApiErrorPayload & { email?: string };

      if (!response.ok) {
        if (isQuotaExceededResponse(response.status, payload)) {
          setQuotaPaywallPlan(payload.plan ?? "decouverte");
          setQuotaPaywallOpen(true);
          return;
        }
        const errorText = `${payload.error ?? ""} ${payload.message ?? ""}`.toLowerCase();
        if (response.status === 529 || errorText.includes("overloaded")) {
          toast.error("Le service est momentanément surchargé. Réessayez dans quelques secondes.");
        } else {
          toast.error(payload.error || "Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }

      if (!payload.email) {
        toast.error("Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      setGeneratedEmail(payload.email);
      toast.success("Email généré avec succès !");
      onGenerated?.();
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsGenerating(false);
    }
  }, [agent, onGenerated, prospect, session?.user?.id, tone]);

  const handleCopy = useCallback(async () => {
    if (!generatedEmail) return;
    try {
      await navigator.clipboard.writeText(generatedEmail);
      toast.success("Email copié !");
    } catch {
      toast.error("Impossible de copier");
    }
  }, [generatedEmail]);

  const handleMarkSent = useCallback(async () => {
    if (!prospect || !generatedEmail) return;
    setIsMarkingSent(true);
    try {
      const now = new Date().toISOString();
      if (plannedRelanceId) {
        await fetch(`/api/relances/${plannedRelanceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            statut: "envoyée",
            message: generatedEmail,
            sent_at: now,
          }),
        });
      } else {
        const createRes = await fetch("/api/relances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titre: `Email envoyé — ${prospect.nom}`,
            message: generatedEmail,
            scheduled_at: now,
            type: "email",
            prospect_id: prospect.id,
            prospect_email: prospect.email || null,
          }),
        });
        const createData = (await createRes.json()) as { relance?: { id: string } };
        if (createData.relance?.id) {
          await fetch(`/api/relances/${createData.relance.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statut: "envoyée", sent_at: now }),
          });
        }
      }
      toast.success("Email marqué comme envoyé");
      onGenerated?.();
      onClose();
    } catch {
      toast.error("Impossible de mettre à jour la relance");
    } finally {
      setIsMarkingSent(false);
    }
  }, [generatedEmail, onClose, onGenerated, plannedRelanceId, prospect]);

  if (!open || !prospect) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prospect-email-modal-title"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#C9A96E]/20 bg-[#0A0A0A] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-white/10 px-5 py-4 sm:px-6">
            <h2 id="prospect-email-modal-title" className="text-lg font-semibold text-[#F5F5F0]">
              Générer un email — {prospect.nom}
            </h2>
            <p className="mt-1 text-sm text-[#A0A0A0]">
              Pré-rempli avec les données du CRM (profil, température, bien, notes).
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {!generatedEmail ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-[#A0A0A0]">
                  <p>
                    <span className="text-[#F5F5F0]">{prospect.nom}</span>
                    {prospect.email ? ` · ${prospect.email}` : ""}
                  </p>
                  <p className="mt-2">
                    {prospect.categorie === "vendeur" ? "Vendeur" : "Acheteur"} · {prospect.statut} ·{" "}
                    {prospect.temperature}
                  </p>
                  {prospect.type_bien ? <p className="mt-1">Bien : {prospect.type_bien}</p> : null}
                  {prospect.budget ? <p className="mt-1">Budget / prix : {prospect.budget}</p> : null}
                  {prospect.notes ? (
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed">{prospect.notes}</p>
                  ) : null}
                </div>

                <label className="block space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ton de l&apos;email</span>
                  <select
                    value={tone}
                    onChange={(e) =>
                      setTone(e.target.value as "Professionnel" | "Chaleureux" | "Urgent")
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-sm text-[#F5F5F0] outline-none focus:border-[#C9A96E]"
                  >
                    <option value="Professionnel">Professionnel</option>
                    <option value="Chaleureux">Chaleureux</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#A0A0A0]">
                {generatedEmail}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-5 py-4 sm:px-6">
            {!generatedEmail ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-white/25"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={isGenerating || !agent}
                  className="rounded-full border border-[#B8943F] bg-[#B8943F] px-5 py-2 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90 disabled:opacity-60"
                >
                  {isGenerating ? "Génération…" : "Générer l'email"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-2 text-sm font-medium text-[#C9A96E] transition hover:border-[#C9A96E]"
                >
                  Copier
                </button>
                <button
                  type="button"
                  onClick={() => void handleMarkSent()}
                  disabled={isMarkingSent}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-[#A0A0A0] transition hover:border-[#C9A96E]/40 hover:text-[#C9A96E] disabled:opacity-60"
                >
                  {isMarkingSent ? "Enregistrement…" : "Marquer comme envoyé"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-[#B8943F] bg-[#B8943F] px-4 py-2 text-sm font-semibold text-[#0A0A0A]"
                >
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <QuotaExceededModal
        open={quotaPaywallOpen}
        onClose={() => setQuotaPaywallOpen(false)}
        plan={quotaPaywallPlan}
      />
    </>
  );
}
