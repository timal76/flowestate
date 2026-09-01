"use client";

import Link from "next/link";
import { useState } from "react";

import SiteHeader from "@/components/site-header";
import StripePlanCheckoutButton from "@/components/stripe-plan-checkout-button";

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

export default function TarifsPage() {
  const [annuel, setAnnuel] = useState(false);

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
                -10%
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
                <PlanFeature included>5 générations/mois</PlanFeature>
                <PlanFeature included>Sans carte bancaire</PlanFeature>
                <PlanFeature included={false}>CRM Prospects</PlanFeature>
                <PlanFeature included={false}>Programmes neufs</PlanFeature>
              </ul>

              <Link
                href="/register"
                className="mt-auto inline-flex w-full items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
              >
                Commencer gratuitement
              </Link>
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">
                5 générations gratuites par mois, sans carte bancaire
              </p>
            </article>

            {/* Essentiel */}
            <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#C9A96E]/60 hover:bg-white/[0.04]">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">
                Essentiel
              </p>
              <p className="mt-4 text-4xl font-semibold text-[#F5F5F0]">
                {annuel ? "67€" : "74,99€"}
                <span className="text-base font-medium text-[#A0A0A0]">/mois</span>
              </p>

              <ul className="mt-6 divide-y divide-white/10 text-sm">
                <PlanFeature included>1 utilisateur</PlanFeature>
                <PlanFeature included>Générateur d&apos;annonces</PlanFeature>
                <PlanFeature included>Emails de relance</PlanFeature>
                <PlanFeature included>Comptes rendus de visite</PlanFeature>
                <PlanFeature included>CRM Prospects</PlanFeature>
                <PlanFeature included>Templates (5 max)</PlanFeature>
                <PlanFeature included>100 générations/mois</PlanFeature>
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
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">
                {annuel ? "804€/an — facturation immédiate" : "74,99€/mois — facturation immédiate"}
              </p>
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
                {annuel ? "134€" : "149,99€"}
                <span className="text-base font-medium text-[#A0A0A0]">/mois</span>
              </p>

              <ul className="mt-6 divide-y divide-white/10 text-sm">
                <PlanFeature included>1 utilisateur</PlanFeature>
                <PlanFeature included>Tout le plan Essentiel</PlanFeature>
                <PlanFeature included>Générations illimitées</PlanFeature>
                <PlanFeature included>Templates illimités</PlanFeature>
                <PlanFeature included>Export PDF</PlanFeature>
                <PlanFeature included>Historique complet</PlanFeature>
                <PlanFeature included>Relances automatiques</PlanFeature>
                <PlanFeature included>Support prioritaire</PlanFeature>
                <PlanFeature included={false}>Programmes neufs</PlanFeature>
              </ul>

              <StripePlanCheckoutButton
                plan="pro"
                billing={annuel ? "annual" : "monthly"}
                className="mt-auto inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-[#B8943F] bg-[#B8943F] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition-all duration-300 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
              >
                Passer à Pro
              </StripePlanCheckoutButton>
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">
                {annuel ? "1 608€/an — facturation immédiate" : "149,99€/mois — facturation immédiate"}
              </p>
            </article>

            {/* Expert */}
            <article className="flex flex-col rounded-2xl border border-white/20 bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/30 hover:bg-white/[0.04]">
              <div className="mb-3 inline-flex w-fit rounded-full border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-3 py-1 text-xs font-medium text-[#C9A96E]">
                Programmes neufs inclus
              </div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">
                Expert
              </p>
              <p className="mt-4 text-4xl font-semibold text-[#F5F5F0]">
                {annuel ? "269€" : "299,99€"}
                <span className="text-base font-medium text-[#A0A0A0]">/mois</span>
              </p>

              <ul className="mt-6 divide-y divide-white/10 text-sm">
                <PlanFeature included>1 utilisateur</PlanFeature>
                <PlanFeature included>Tout le plan Pro</PlanFeature>
                <PlanFeature included>
                  Programmes neufs (plaquette PDF → 6 annonces différenciantes)
                </PlanFeature>
                <PlanFeature included>Génération par lot</PlanFeature>
                <PlanFeature included>Analyse annonces concurrentes</PlanFeature>
                <PlanFeature included>Enrichissement web données officielles</PlanFeature>
                <PlanFeature included>Score de différenciation</PlanFeature>
                <PlanFeature included>Export PDF annonces programmes</PlanFeature>
                <PlanFeature included>Support dédié + onboarding personnalisé</PlanFeature>
              </ul>

              <StripePlanCheckoutButton
                plan="expert"
                billing={annuel ? "annual" : "monthly"}
                className="mt-auto inline-flex w-full cursor-pointer items-center justify-center rounded-full border-2 border-white/30 bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:border-white/50 hover:bg-white/5 disabled:cursor-wait disabled:opacity-70"
              >
                Passer à Expert
              </StripePlanCheckoutButton>
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">
                {annuel ? "3 228€/an — facturation immédiate" : "299,99€/mois — facturation immédiate"}
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
