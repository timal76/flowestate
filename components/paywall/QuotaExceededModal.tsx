"use client";

import Link from "next/link";

import StripePlanCheckoutButton from "@/components/stripe-plan-checkout-button";
import type { QuotaType } from "@/lib/plans";

type QuotaExceededModalProps = {
  open: boolean;
  onClose: () => void;
  plan?: string | null;
  quotaType?: QuotaType | null;
};

type PaywallCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  benefitsLabel: string;
  benefits: string[];
  ctaPlan: "essentiel" | "pro" | "expert";
  ctaLabel: string;
};

function resolvePaywallCopy(plan: string | null | undefined, quotaType: QuotaType | null | undefined): PaywallCopy {
  const kind = quotaType ?? "classic";

  // CRM Essentiel → Pro
  if (kind === "crm-prospects") {
    return {
      eyebrow: "CRM Essentiel",
      title: "Limite de 50 fiches prospects atteinte",
      subtitle:
        "Votre plan Essentiel est plafonné à 50 fiches prospects actives. Passez à Pro pour un CRM illimité et des relances automatiques.",
      benefitsLabel: "Avec le plan Pro :",
      benefits: [
        "CRM Prospects illimité",
        "Relances automatiques",
        "150 générations/mois",
        "5 conversions Programmes neufs/mois",
      ],
      ctaPlan: "pro",
      ctaLabel: "Passer à Pro",
    };
  }

  // Programmes neufs
  if (kind === "programmes-neufs") {
    if (plan === "pro") {
      return {
        eyebrow: "Quota Pro",
        title: "Conversions Programmes neufs épuisées",
        subtitle:
          "Vous avez utilisé vos 5 conversions Programmes neufs de ce mois. Passez à Expert pour un accès illimité.",
        benefitsLabel: "Avec le plan Expert :",
        benefits: [
          "Programmes neufs illimités",
          "Générations illimitées",
          "Génération par lot",
          "Analyse concurrentielle + scoring",
        ],
        ctaPlan: "expert",
        ctaLabel: "Passer à Expert",
      };
    }

    // Découverte ou Essentiel (PN non inclus) → Pro
    return {
      eyebrow: plan === "essentiel" ? "Plan Essentiel" : "Plan Découverte",
      title:
        plan === "essentiel"
          ? "Programmes neufs non inclus"
          : "Génération Programmes neufs offerte utilisée",
      subtitle:
        plan === "essentiel"
          ? "Programmes neufs est disponible à partir du plan Pro (5 conversions/mois)."
          : "Vous avez utilisé votre génération Programmes neufs offerte. Passez au plan Pro pour continuer.",
      benefitsLabel: "Avec le plan Pro :",
      benefits: [
        "5 conversions Programmes neufs/mois",
        "150 générations/mois",
        "CRM Prospects illimité + relances auto",
        "Export PDF et templates illimités",
      ],
      ctaPlan: "pro",
      ctaLabel: "Passer à Pro",
    };
  }

  // Générations classiques
  if (plan === "pro") {
    return {
      eyebrow: "Quota Pro",
      title: "Limite mensuelle atteinte",
      subtitle:
        "Vous avez atteint les 150 générations incluses dans votre plan Pro ce mois-ci. Passez à Expert pour des générations illimitées.",
      benefitsLabel: "Avec le plan Expert :",
      benefits: [
        "Générations illimitées",
        "Programmes neufs illimités",
        "Génération par lot",
        "Analyse concurrentielle + support dédié",
      ],
      ctaPlan: "expert",
      ctaLabel: "Passer à Expert",
    };
  }

  if (plan === "essentiel") {
    return {
      eyebrow: "Quota Essentiel",
      title: "Limite mensuelle atteinte",
      subtitle:
        "Vous avez atteint les 40 générations incluses dans votre plan Essentiel ce mois-ci.",
      benefitsLabel: "Avec le plan Pro :",
      benefits: [
        "150 générations par mois",
        "CRM Prospects illimité + relances auto",
        "5 conversions Programmes neufs/mois",
        "Export PDF et templates illimités",
      ],
      ctaPlan: "pro",
      ctaLabel: "Passer à Pro",
    };
  }

  // Découverte — classiques
  return {
    eyebrow: "Plan Découverte",
    title: "Vous avez utilisé vos 5 générations offertes",
    subtitle: "Passez à Essentiel pour continuer à générer sans interruption.",
    benefitsLabel: "Avec Essentiel :",
    benefits: [
      "40 générations par mois",
      "CRM Prospects (jusqu'à 50 fiches)",
      "Emails de relance manuels",
      "Compte-rendu de visite et 5 templates",
    ],
    ctaPlan: "essentiel",
    ctaLabel: "Passer à Essentiel",
  };
}

export default function QuotaExceededModal({
  open,
  onClose,
  plan,
  quotaType,
}: QuotaExceededModalProps) {
  if (!open) return null;

  const copy = resolvePaywallCopy(plan, quotaType);

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
            {copy.eyebrow}
          </p>
          <h2 id="quota-modal-title" className="mt-2 text-xl font-semibold text-[#F5F5F0]">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#A0A0A0]">{copy.subtitle}</p>
        </div>

        <div className="px-6 py-5">
          <p className="mb-3 text-sm font-medium text-[#F5F5F0]">{copy.benefitsLabel}</p>
          <ul className="space-y-2.5 text-sm text-[#A0A0A0]">
            {copy.benefits.map((benefit) => (
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
            plan={copy.ctaPlan}
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-[#B8943F] bg-[#B8943F] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
          >
            {copy.ctaLabel}
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
