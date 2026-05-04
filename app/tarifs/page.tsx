import type { Metadata } from "next";

import SiteHeader from "@/components/site-header";
import StripePlanCheckoutButton from "@/components/stripe-plan-checkout-button";
import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/tarifs";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Offres Starter et Pro FlowEstate : essai 14 jours, générations automatisées pour annonces, emails et comptes-rendus. Paiement sécurisé Stripe.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Tarifs | FlowEstate",
    description:
      "Offres Starter et Pro FlowEstate : essai 14 jours, générations automatisées pour annonces, emails et comptes-rendus. Paiement sécurisé Stripe.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function TarifsPage() {
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

          <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
            <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#C9A96E]/60 hover:bg-white/[0.04]">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">
                Starter
              </p>
              <p className="mt-4 text-4xl font-semibold text-[#F5F5F0]">
                49€<span className="text-base font-medium text-[#A0A0A0]">/mois</span>
              </p>

              <ul className="mt-6 divide-y divide-white/10 text-sm text-[#A0A0A0]">
                <li className="flex items-center gap-3 py-3">
                  <span className="text-[#C9A96E]">✓</span>
                  <span>1 utilisateur</span>
                </li>
                <li className="flex items-center gap-3 py-3">
                  <span className="text-[#C9A96E]">✓</span>
                  <span>Accès aux 3 outils</span>
                </li>
                <li className="flex items-center gap-3 py-3">
                  <span className="text-[#C9A96E]">✓</span>
                  <span>30 générations/mois</span>
                </li>
              </ul>

              <StripePlanCheckoutButton
                plan="starter"
                className="mt-auto inline-flex w-full cursor-pointer items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:cursor-wait disabled:opacity-70"
              >
                Essayer Starter gratuitement
              </StripePlanCheckoutButton>
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">
                14 jours gratuits, puis 49€/mois
              </p>
            </article>

            <article
              className="flex flex-col rounded-2xl border border-[#C9A96E] bg-white/[0.03] p-8 transition-all duration-300 hover:border-[#C9A96E] hover:bg-white/[0.05]"
              style={{ boxShadow: "0 0 28px rgba(201, 169, 110, 0.18)" }}
            >
              <div className="mb-3 inline-flex w-fit rounded-full border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-3 py-1 text-xs font-medium text-[#C9A96E]">
                Le plus populaire
              </div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">Pro</p>
              <p className="mt-4 text-4xl font-semibold text-[#F5F5F0]">
                99€<span className="text-base font-medium text-[#A0A0A0]">/mois</span>
              </p>

              <ul className="mt-6 divide-y divide-white/10 text-sm text-[#A0A0A0]">
                <li className="flex items-center gap-3 py-3">
                  <span className="text-[#C9A96E]">✓</span>
                  <span>2 utilisateurs</span>
                </li>
                <li className="flex items-center gap-3 py-3">
                  <span className="text-[#C9A96E]">✓</span>
                  <span>Accès aux 3 outils</span>
                </li>
                <li className="flex items-center gap-3 py-3">
                  <span className="text-[#C9A96E]">✓</span>
                  <span>Générations illimitées</span>
                </li>
                <li className="flex items-center gap-3 py-3">
                  <span className="text-[#C9A96E]">✓</span>
                  <span>Support prioritaire</span>
                </li>
              </ul>

              <StripePlanCheckoutButton
                plan="pro"
                className="mt-auto inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-[#B8943F] bg-[#B8943F] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition-all duration-300 hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
              >
                Essayer Pro gratuitement
              </StripePlanCheckoutButton>
              <p className="mt-2 text-center text-xs text-[#A0A0A0]">
                14 jours gratuits, puis 99€/mois
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
