"use client";

import Link from "next/link";

import StripePlanCheckoutButton from "@/components/stripe-plan-checkout-button";

type QuotaExceededModalProps = {
  open: boolean;
  onClose: () => void;
  plan?: string | null;
};

const DECOUVERTE_BENEFITS = [
  "100 générations par mois",
  "Générateur d'annonces, emails et comptes-rendus",
  "CRM Prospects et relances automatiques",
  "Templates et historique des générations",
];

const ESSENTIEL_BENEFITS = [
  "Générations illimitées",
  "Tout le plan Essentiel inclus",
  "Export PDF et templates illimités",
  "Support prioritaire",
];

export default function QuotaExceededModal({ open, onClose, plan }: QuotaExceededModalProps) {
  if (!open) return null;

  const isEssentielLimit = plan === "essentiel";
  const title = isEssentielLimit
    ? "Limite mensuelle atteinte"
    : "Vous avez utilisé vos 5 générations gratuites de ce mois";
  const subtitle = isEssentielLimit
    ? "Vous avez atteint les 100 générations incluses dans votre plan Essentiel ce mois-ci."
    : "Passez à Essentiel pour continuer à générer sans interruption.";
  const benefits = isEssentielLimit ? ESSENTIEL_BENEFITS : DECOUVERTE_BENEFITS;
  const ctaPlan = isEssentielLimit ? "pro" : "essentiel";
  const ctaLabel = isEssentielLimit ? "Passer à Pro" : "Passer à Essentiel";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quota-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#C9A96E]/25 bg-[#0A0A0A] shadow-[0_0_48px_-12px_rgba(201,169,110,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#C9A96E]/15 bg-[#060606] px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#C9A96E]">
            {isEssentielLimit ? "Quota Essentiel" : "Plan Découverte"}
          </p>
          <h2 id="quota-modal-title" className="mt-2 text-xl font-semibold text-[#F5F5F0]">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#A0A0A0]">{subtitle}</p>
        </div>

        <div className="px-6 py-5">
          <p className="mb-3 text-sm font-medium text-[#F5F5F0]">
            {isEssentielLimit ? "Avec le plan Pro :" : "Avec Essentiel :"}
          </p>
          <ul className="space-y-2.5 text-sm text-[#A0A0A0]">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-[#C9A96E]" aria-hidden>
                  ✓
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-[#666]">Facturation immédiate — sans période d&apos;essai</p>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 px-6 py-5">
          <StripePlanCheckoutButton
            plan={ctaPlan}
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-[#B8943F] bg-[#B8943F] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          >
            {ctaLabel}
          </StripePlanCheckoutButton>
          <Link
            href="/tarifs"
            onClick={onClose}
            className="text-center text-xs text-[#666] transition hover:text-[#A0A0A0]"
          >
            Comparer tous les plans
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 text-center text-xs text-[#555] transition hover:text-[#888]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
