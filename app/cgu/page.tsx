import Link from "next/link";

import SiteHeader from "@/components/site-header";

export default function CguPage() {
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

      <article className="px-6 pb-24 pt-32 md:px-10 md:pt-36">
        <div className="mx-auto w-full max-w-3xl">
          <header className="mb-14 space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Conditions Générales d&apos;Utilisation
            </h1>
            <p className="text-sm text-[#C9A96E] md:text-base">Dernière mise à jour : mai 2026</p>
          </header>

          <div className="max-w-none space-y-12 text-[#A0A0A0]">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-[#F5F5F0]">1. Objet</h2>
              <p className="leading-relaxed">
                FlowEstate est un service SaaS d&apos;automatisation pour agents immobiliers, permettant la
                génération d&apos;annonces, emails de relance et comptes-rendus de visite via intelligence
                artificielle.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-[#F5F5F0]">2. Accès au service</h2>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed marker:text-[#C9A96E]">
                <li>Essai gratuit de 14 jours sans engagement</li>
                <li>Plans payants : Starter (49€/mois) et Pro (99€/mois)</li>
                <li>Résiliation possible à tout moment depuis l&apos;espace client</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-[#F5F5F0]">3. Utilisation du service</h2>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed marker:text-[#C9A96E]">
                <li>Usage professionnel uniquement</li>
                <li>Contenu généré sous la responsabilité de l&apos;utilisateur</li>
                <li>Interdiction d&apos;utiliser le service à des fins illégales</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-[#F5F5F0]">4. Données personnelles</h2>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed marker:text-[#C9A96E]">
                <li>Données hébergées sur des serveurs sécurisés (Supabase)</li>
                <li>Aucune revente de données à des tiers</li>
                <li>Droit d&apos;accès, modification et suppression sur demande</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-[#F5F5F0]">5. Propriété intellectuelle</h2>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed marker:text-[#C9A96E]">
                <li>Le contenu généré appartient à l&apos;utilisateur</li>
                <li>L&apos;interface et le code FlowEstate sont protégés</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-[#F5F5F0]">6. Responsabilité</h2>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed marker:text-[#C9A96E]">
                <li>FlowEstate ne garantit pas l&apos;exactitude du contenu généré par IA</li>
                <li>L&apos;utilisateur est responsable de la vérification du contenu</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-[#F5F5F0]">7. Modification des CGU</h2>
              <ul className="list-disc space-y-2 pl-5 leading-relaxed marker:text-[#C9A96E]">
                <li>FlowEstate se réserve le droit de modifier les CGU</li>
                <li>Les utilisateurs seront informés par email</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-[#F5F5F0]">8. Contact</h2>
              <p className="leading-relaxed">
                Pour toute question :{" "}
                <a
                  href="mailto:contact@flowestate.fr"
                  className="font-medium text-[#C9A96E] underline decoration-[#C9A96E]/40 underline-offset-2 transition hover:text-[#d4b882]"
                >
                  contact@flowestate.fr
                </a>
                {" · "}
                <Link href="/contact" className="font-medium text-[#C9A96E] underline decoration-[#C9A96E]/40 underline-offset-2 transition hover:text-[#d4b882]">
                  Formulaire de contact
                </Link>
              </p>
            </section>
          </div>
        </div>
      </article>
    </main>
  );
}
