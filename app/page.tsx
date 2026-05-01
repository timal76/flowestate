export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      {/* Header fixe */}
      <header className="fixed inset-x-0 top-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md">
  <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 md:px-10">
    <div className="text-xl font-semibold tracking-wide text-[#C9A96E]">
      FlowEstate
    </div>

    <nav className="flex items-center gap-8 text-sm font-medium text-[#A0A0A0]">
      <a href="/annonces" className="transition hover:text-[#F5F5F0]">
        Annonces
      </a>
      <a href="/emails" className="transition hover:text-[#F5F5F0]">
        Emails
      </a>
      <a href="/comptes-rendus" className="transition hover:text-[#F5F5F0]">
        Comptes-rendus
      </a>
      <a href="/" className="transition hover:text-[#F5F5F0]">
        Accueil
      </a>
    </nav>
  </div>
  <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#C9A96E]/100 to-transparent" />
</header>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center px-6 pt-32 md:px-10">
  <div
    className="pointer-events-none absolute inset-0"
    style={{
      background:
        "radial-gradient(700px circle at 8% 8%, rgba(201,169,110,0.12), transparent 65%)",
    }}
    aria-hidden="true"
  />
  <div className="mx-auto w-full max-w-7xl">
    <div className="max-w-3xl space-y-8">
      <h1 className="animate-fade-in-up text-5xl font-semibold leading-tight tracking-[0.02em] md:text-7xl">
        Gagnez du temps sur l'opérationnel.
        <span className="block text-[#C9A96E]">Concentrez-vous sur vos mandats.</span>
      </h1>

      <p className="max-w-2xl text-xl leading-relaxed text-[#C9A96E] md:text-2xl">
        Moins de tâches. Plus de ventes.
      </p>

      <div className="pt-4">
        <a
          href="#"
          className="animate-fade-in-up-delayed inline-flex items-center rounded-full border-2 border-[#C9A96E] bg-transparent px-8 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 ease-out hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
        >
          Commencer gratuitement
        </a>
      </div>
    </div>
  </div>
</section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="px-6 py-28 md:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-14 max-w-2xl space-y-4">
            <h2 className="text-3xl font-semibold md:text-4xl">
              Automatisez l'essentiel, gardez l'humain.
            </h2>
            <p className="text-[#A0A0A0]">
              Trois modules pensés pour les agences exigeantes.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#C9A96E]/60 hover:bg-white/[0.04]">
              <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Générateur d'annonces</h3>
              <p className="text-sm leading-relaxed text-[#A0A0A0]">
                Créez des annonces claires et convaincantes en quelques secondes, adaptées à chaque
                bien.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.02]p-8 transition-all duration-300 hover:border-[#C9A96E]/60 hover:bg-white/[0.04]">
              <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M4 6h16v12H4zM4 7l8 6 8-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Emails de relance</h3>
              <p className="text-sm leading-relaxed text-[#A0A0A0]">
                Envoyez des relances personnalisées automatiquement pour ne manquer aucune opportunité.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#C9A96E]/60 hover:bg-white/[0.04]">"
              <div className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M7 4h10M7 20h10M6 8h12M6 12h8M6 16h12"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Compte-rendu de visite</h3>
              <p className="text-sm leading-relaxed text-[#A0A0A0]">
                Générez un compte-rendu structuré après chaque visite, prêt à partager avec vendeurs
                et acquéreurs.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Ancres demandées dans la navigation */}
     {/* Tarifs */}
<section id="tarifs" className="px-6 py-28 md:px-10">
  <div className="mx-auto w-full max-w-7xl">
    <div className="mb-14 max-w-2xl space-y-4">
      <h2 className="text-3xl font-semibold md:text-4xl">Des plans simples et efficaces.</h2>
      <p className="text-[#A0A0A0]">
        Choisissez le niveau d'automatisation adapté à votre équipe.
      </p>
    </div>

    <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
    <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-8 transition-all duration-300 hover:border-[#C9A96E]/60 hover:bg-white/[0.04]">
  <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#A0A0A0]">Starter</p>
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
      <span>Accès aux 3 outils IA</span>
    </li>
    <li className="flex items-center gap-3 py-3">
      <span className="text-[#C9A96E]">✓</span>
      <span>50 générations/mois</span>
    </li>
  </ul>

  <a
    href="#"
    className="mt-auto inline-flex w-full items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
  >
    Commencer
  </a>
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
      <span>5 utilisateurs</span>
    </li>
    <li className="flex items-center gap-3 py-3">
      <span className="text-[#C9A96E]">✓</span>
      <span>Accès aux 3 outils IA</span>
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

  <a
    href="#"
    className="mt-auto inline-flex w-full items-center justify-center rounded-full border border-[#B8943F] bg-[#B8943F] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition-all duration-300 hover:opacity-90"
  >
    Choisir Pro
  </a>
</article>

      
    </div>
  </div>
</section>
      <section id="connexion" className="sr-only" aria-hidden="true" />

      {/* CTA */}
      <section className="border-t border-white/10 bg-white/[0.02] px-6 py-28 md:px-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <h2 className="text-3xl font-semibold text-[#F5F5F0] md:text-4xl">
            Prêt à transformer votre quotidien ?
          </h2>
          <p className="mt-4 text-lg text-[#A0A0A0] md:text-xl">
            Rejoignez les agences qui gagnent du temps chaque jour.
          </p>
          <a
            href="#"
            className="mt-10 inline-flex items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-8 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 ease-out hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
          >
            Commencer gratuitement
          </a>
        </div>
      </section>

      {/* Footer minimaliste */}
      <footer className="border-t border-white/10 px-6 py-8 md:px-10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between text-xs text-[#A0A0A0]">
          <span>© {new Date().getFullYear()} FlowEstate</span>
          <span className="text-[#C9A96E]">Moins de tâches. Plus de ventes.</span>
        </div>
      </footer>
    </main>
  );
}