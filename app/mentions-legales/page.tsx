import SiteHeader from "@/components/site-header";

export default function MentionsLegalesPage() {
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
          <header className="mb-12 space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Mentions légales</h1>
            <p className="text-sm text-[#C9A96E] md:text-base">Informations relatives à l&apos;éditeur et à l&apos;hébergement</p>
          </header>

          <dl className="space-y-8 text-[#A0A0A0]">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#C9A96E]">Éditeur</dt>
              <dd className="mt-2 leading-relaxed text-[#F5F5F0]">
                FlowEstate — Timothé Costantin
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#C9A96E]">Hébergement</dt>
              <dd className="mt-2 leading-relaxed">
                Vercel Inc. —{" "}
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C9A96E] underline decoration-[#C9A96E]/40 underline-offset-2 transition hover:text-[#d4b882]"
                >
                  vercel.com
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#C9A96E]">Contact</dt>
              <dd className="mt-2 leading-relaxed">
                <a
                  href="mailto:contact@flowestate.fr"
                  className="font-medium text-[#C9A96E] underline decoration-[#C9A96E]/40 underline-offset-2 transition hover:text-[#d4b882]"
                >
                  contact@flowestate.fr
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#C9A96E]">Données personnelles</dt>
              <dd className="mt-2 leading-relaxed">
                Hébergement des données :{" "}
                <strong className="font-medium text-[#E8E4DC]">Supabase</strong> (Dublin, Irlande).
              </dd>
            </div>
          </dl>
        </div>
      </article>
    </main>
  );
}
