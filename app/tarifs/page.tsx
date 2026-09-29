"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import SiteHeader from "@/components/site-header";
import StripePlanCheckoutButton from "@/components/stripe-plan-checkout-button";
import {
  annualDiscountPercent,
  PLAN_AMOUNTS_CENTS,
  type PaidPlanId,
} from "@/lib/plans";

function PlanFeature({
  included,
  children,
}: {
  included: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex items-start gap-3 py-2.5 ${included ? "text-[#A0A0A0]" : "text-[#555555]"}`}
    >
      <span className={`mt-0.5 shrink-0 ${included ? "text-[#C9A96E]" : "text-[#555555]"}`}>
        {included ? "✓" : "✗"}
      </span>
      <span>{children}</span>
    </li>
  );
}

function formatEurosFromCents(cents: number): string {
  const euros = cents / 100;
  const rounded = Math.round(euros * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}€`;
  return `${rounded.toFixed(2).replace(".", ",")}€`;
}

function formatMonthlyEquivalent(annualCents: number): string {
  const perMonth = annualCents / 12 / 100;
  const rounded = Math.round(perMonth);
  return `${rounded}€`;
}

function formatAnnualTotal(annualCents: number): string {
  const euros = annualCents / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: euros % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros);
}

export default function TarifsPage() {
  const [annuel, setAnnuel] = useState(false);

  const discountBadge = useMemo(() => {
    const discounts = (["essentiel", "pro", "expert"] as PaidPlanId[]).map(
      (plan) => annualDiscountPercent(plan),
    );
    const unique = [...new Set(discounts)];
    if (unique.length === 1) return `-${unique[0]}%`;
    const min = Math.min(...discounts);
    const max = Math.max(...discounts);
    return min === max ? `-${min}%` : `jusqu'à -${max}%`;
  }, []);

  function planPriceLabel(plan: PaidPlanId): string {
    const amounts = PLAN_AMOUNTS_CENTS[plan];
    if (!annuel) return formatEurosFromCents(amounts.monthly);
    return formatMonthlyEquivalent(amounts.annual);
  }

  function planFooter(plan: PaidPlanId): string {
    const amounts = PLAN_AMOUNTS_CENTS[plan];
    if (!annuel) {
      return `${formatEurosFromCents(amounts.monthly)}/mois — facturation immédiate`;
    }
    const pct = annualDiscountPercent(plan);
    return `${formatAnnualTotal(amounts.annual)}/an (−${pct}%) — facturation immédiate`;
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <SiteHeader />

      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(700px circle at 8% 8%, rgba(201,169,110,0.12), transparent 65%)",
        }}
        aria-hidden
      />

      <section className="px-6 py-28 pt-32 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-14 max-w-2xl space-y-4">
            <h1 className="text-3xl font-semibold md:text-5xl">Tarifs</h1>
            <p className="text-lg text-[#A0A0A0] md:text-xl">
              Choisissez le niveau d&apos;automatisation adapté à votre équipe.
            </p>
          </div>

          <div className="mb-10 flex items-center gap-4">
            <span className={`text-sm font-medium ${!annuel ? "text-[#F5F5F0]" : "text-[#A0A0A0]"}`}>
              Mensuel
            </span>
            <button
              type="button"
              onClick={() => setAnnuel(!annuel)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${annuel ? "bg-[#B8943F]" : "bg-white/20"}`}
              aria-pressed={annuel}
              aria-label={annuel ? "Facturation annuelle" : "Facturation mensuelle"}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${annuel ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <span className={`text-sm font-medium ${annuel ? "text-[#F5F5F0]" : "text-[#A0A0A0]"}`}>
              Annuel
              <span className="ml-2 rounded-full bg-[#C9A96E]/20 px-2 py-0.5 text-xs text-[#C9A96E]">
                {discountBadge}
              </span>
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 md:items-stretch">
            {/* Découverte */}
            <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#C9A96E]/60 hover:bg-white/[0.04]">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">
                Découverte
              </p>
              <p className="mt-4 text-4xl font-semibold text-[#F5F5F0]">
                0€
                <span className="text-base font-medium text-[#A0A0A0]">/mois</span>
              </p>

              <ul className="mt-6 divide-y divide-white/10 text-sm">
                <PlanFeature included>1 utilisateur</PlanFeature>
                <PlanFeature included>Générateur d&apos;annonces</PlanFeature>
                <PlanFeature included>Emails de relance</PlanFeature>
                <PlanFeature included>Comptes rendus de visite</PlanFeature>
                <PlanFeature included>5 générations offertes</PlanFeature>
                <PlanFeature included>1 génération Programmes neufs offerte</PlanFeature>
                <PlanFeature included>Sans carte bancaire</PlanFeature>
                <PlanFeature included={false}>CRM Prospects</PlanFeature>
              </ul>

              <Link
                href="/register"
                className="mt-auto inline-flex w-full items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
              >
                Commencer gratuitement
              </Link>
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">
                5 générations offertes, sans carte bancaire
              </p>
            </article>

            {/* Essentiel */}
            <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#C9A96E]/60 hover:bg-white/[0.04]">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">
                Essentiel
              </p>
              <p className="mt-4 text-4xl font-semibold text-[#F5F5F0]">
                {planPriceLabel("essentiel")}
                <span className="text-base font-medium text-[#A0A0A0]">/mois</span>
              </p>
              {annuel ? (
                <p className="mt-1 text-xs text-[#C9A96E]">
                  −{annualDiscountPercent("essentiel")}% vs mensuel
                </p>
              ) : null}

              <ul className="mt-6 divide-y divide-white/10 text-sm">
                <PlanFeature included>1 utilisateur</PlanFeature>
                <PlanFeature included>40 générations/mois</PlanFeature>
                <PlanFeature included>CRM Prospects (50 fiches actives)</PlanFeature>
                <PlanFeature included>Emails de relance manuels</PlanFeature>
                <PlanFeature included>Comptes rendus de visite</PlanFeature>
                <PlanFeature included>Templates (5 max)</PlanFeature>
                <PlanFeature included>Support par email</PlanFeature>
                <PlanFeature included={false}>Programmes neufs</PlanFeature>
              </ul>

              <StripePlanCheckoutButton
                plan="essentiel"
                billing={annuel ? "annual" : "monthly"}
                className="mt-auto inline-flex w-full cursor-pointer items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:cursor-wait disabled:opacity-70"
              >
                Passer à Essentiel
              </StripePlanCheckoutButton>
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">{planFooter("essentiel")}</p>
            </article>

            {/* Pro */}
            <article
              className="relative flex flex-col rounded-2xl border border-[#C9A96E] bg-white/[0.03] p-8 transition-all duration-300 hover:border-[#C9A96E] hover:bg-white/[0.05]"
              style={{ boxShadow: "0 0 28px rgba(201, 169, 110, 0.18)" }}
            >
              <div className="mb-3 inline-flex w-fit rounded-full border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-3 py-1 text-xs font-medium text-[#C9A96E]">
                Le plus populaire
              </div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">Pro</p>
              <p className="mt-4 text-4xl font-semibold text-[#F5F5F0]">
                {planPriceLabel("pro")}
                <span className="text-base font-medium text-[#A0A0A0]">/mois</span>
              </p>
              {annuel ? (
                <p className="mt-1 text-xs text-[#C9A96E]">−{annualDiscountPercent("pro")}% vs mensuel</p>
              ) : null}

              <ul className="mt-6 divide-y divide-white/10 text-sm">
                <PlanFeature included>1 utilisateur</PlanFeature>
                <PlanFeature included>150 générations/mois</PlanFeature>
                <PlanFeature included>CRM Prospects illimité</PlanFeature>
                <PlanFeature included>Relances automatiques</PlanFeature>
                <PlanFeature included>Programmes neufs (5/mois)</PlanFeature>
                <PlanFeature included>Export PDF</PlanFeature>
                <PlanFeature included>Templates illimités</PlanFeature>
                <PlanFeature included>Support prioritaire</PlanFeature>
              </ul>

              <StripePlanCheckoutButton
                plan="pro"
                billing={annuel ? "annual" : "monthly"}
                className="mt-auto inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-[#B8943F] bg-[#B8943F] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition-all duration-300 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
              >
                Passer à Pro
              </StripePlanCheckoutButton>
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">{planFooter("pro")}</p>
            </article>

            {/* Expert */}
            <article className="flex flex-col rounded-2xl border border-white/20 bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/30 hover:bg-white/[0.04]">
              <div className="mb-3 inline-flex w-fit rounded-full border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-3 py-1 text-xs font-medium text-[#C9A96E]">
                Illimité
              </div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">
                Expert
              </p>
              <p className="mt-4 text-4xl font-semibold text-[#F5F5F0]">
                {planPriceLabel("expert")}
                <span className="text-base font-medium text-[#A0A0A0]">/mois</span>
              </p>
              {annuel ? (
                <p className="mt-1 text-xs text-[#C9A96E]">
                  −{annualDiscountPercent("expert")}% vs mensuel
                </p>
              ) : null}

              <ul className="mt-6 divide-y divide-white/10 text-sm">
                <PlanFeature included>1 utilisateur</PlanFeature>
                <PlanFeature included>Générations illimitées</PlanFeature>
                <PlanFeature included>Programmes neufs illimités</PlanFeature>
                <PlanFeature included>Génération par lot</PlanFeature>
                <PlanFeature included>Analyse concurrentielle + scoring</PlanFeature>
                <PlanFeature included>Enrichissement de données</PlanFeature>
                <PlanFeature included>Onboarding personnalisé</PlanFeature>
                <PlanFeature included>Support dédié</PlanFeature>
              </ul>

              <StripePlanCheckoutButton
                plan="expert"
                billing={annuel ? "annual" : "monthly"}
                className="mt-auto inline-flex w-full cursor-pointer items-center justify-center rounded-full border-2 border-white/30 bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:border-white/50 hover:bg-white/5 disabled:cursor-wait disabled:opacity-70"
              >
                Passer à Expert
              </StripePlanCheckoutButton>
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">{planFooter("expert")}</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
