import Link from "next/link";

export const dynamic = "force-dynamic";

const goldRgb = "201, 169, 110";

function formatTodayFr() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type ActivityType = "annonce" | "email" | "compte-rendu";

type ActivityItem = {
  id: string;
  type: ActivityType;
  description: string;
  relativeTime: string;
};

const recentActivity: ActivityItem[] = [
  {
    id: "1",
    type: "annonce",
    description: "Annonce générée — Appartement 75m² Lyon 6e",
    relativeTime: "il y a 2h",
  },
  {
    id: "2",
    type: "email",
    description: "Email de relance — Prospect M. Durand, visite reportée",
    relativeTime: "hier",
  },
  {
    id: "3",
    type: "compte-rendu",
    description: "Compte-rendu — Maison 120m² Caluire, prospect enthousiaste",
    relativeTime: "il y a 3 jours",
  },
  {
    id: "4",
    type: "annonce",
    description: "Annonce générée — Studio investissement Part-Dieu",
    relativeTime: "il y a 3 jours",
  },
  {
    id: "5",
    type: "email",
    description: "Relance suite visite — T3 Garibaldi, pièces jointes mandat",
    relativeTime: "il y a 5 jours",
  },
];

function ActivityIcon({ type }: { type: ActivityType }) {
  const base =
    "inline-flex h-10 w-10 flex-none shrink-0 items-center justify-center rounded-full border border-solid text-[#F5F5F0] box-border aspect-square";
  if (type === "annonce") {
    return (
      <div
        className={base}
        style={{
          borderColor: `rgba(${goldRgb}, 0.45)`,
          backgroundColor: `rgba(${goldRgb}, 0.12)`,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="block shrink-0 text-[#C9A96E]"
          aria-hidden
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
    );
  }
  if (type === "email") {
    return (
      <div className={`${base} border-sky-500/35 bg-sky-500/10`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="block shrink-0 text-sky-300"
          aria-hidden
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`${base} border-emerald-500/35 bg-emerald-500/10`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="block shrink-0 text-emerald-300"
        aria-hidden
      >
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M12 11h4" />
        <path d="M12 16h4" />
      </svg>
    </div>
  );
}

function typeLabel(type: ActivityType) {
  if (type === "annonce") return "Annonce";
  if (type === "email") return "Email";
  return "Compte-rendu";
}

export default function DashboardPage() {
  const dateLabel = formatTodayFr();

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <header className="fixed inset-x-0 top-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 md:px-10">
          <Link href="/" className="text-xl font-semibold tracking-wide text-[#C9A96E]">
            FlowEstate
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-x-8 gap-y-2 text-sm font-medium text-[#A0A0A0]">
            <span
              className="font-semibold text-[#C9A96E] underline decoration-[#C9A96E] decoration-2 underline-offset-4"
              aria-current="page"
            >
              Dashboard
            </span>
            <Link href="/annonces" className="transition hover:text-[#F5F5F0]">
              Annonces
            </Link>
            <Link href="/emails" className="transition hover:text-[#F5F5F0]">
              Emails
            </Link>
            <Link href="/comptes-rendus" className="transition hover:text-[#F5F5F0]">
              Comptes-rendus
            </Link>
            <Link href="/" className="transition hover:text-[#F5F5F0]">
              Accueil
            </Link>
            <Link
              href="/login"
              className="ml-8 inline-flex items-center rounded-full border border-[#C9A96E] bg-transparent px-4 py-2 text-xs font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
            >
              Connexion
            </Link>
          </nav>
        </div>
        <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent" />
      </header>

      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(700px circle at 10% 5%, rgba(${goldRgb}, 0.10), transparent 65%)`,
        }}
        aria-hidden
      />

      <div className="mx-auto w-full max-w-7xl space-y-14 px-6 pb-24 pt-32 md:px-10">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Bonjour, Thomas <span aria-hidden>👋</span>
          </h1>
          <p className="text-base capitalize text-[#A0A0A0] md:text-lg">{dateLabel}</p>
        </header>

        {/* Stats */}
        <section aria-label="Statistiques rapides">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-[#A0A0A0]">Annonces générées</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#C9A96E]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-[#B8965A] md:text-4xl">12</p>
              <p className="mt-1 text-xs text-[#A0A0A0]/90">ce mois</p>
            </article>

            <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-[#A0A0A0]">Emails envoyés</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#C9A96E]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-[#B8965A] md:text-4xl">34</p>
              <p className="mt-1 text-xs text-[#A0A0A0]/90">ce mois</p>
            </article>

            <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-[#A0A0A0]">Comptes-rendus</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#C9A96E]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-[#B8965A] md:text-4xl">8</p>
              <p className="mt-1 text-xs text-[#A0A0A0]/90">ce mois</p>
            </article>

            <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="text-sm font-medium text-[#A0A0A0]">Temps économisé</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#C9A96E]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </span>
              </div>
              <p className="text-3xl font-semibold tracking-tight text-[#B8965A] md:text-4xl">~3h</p>
              <p className="mt-1 text-xs text-[#A0A0A0]/90">cette semaine</p>
            </article>
          </div>
        </section>

        {/* Outils */}
        <section aria-label="Accès rapide aux outils">
          <h2 className="mb-6 text-xl font-semibold text-[#F5F5F0] md:text-2xl">Accès rapide</h2>
          <div className="grid gap-6 md:grid-cols-3 md:items-stretch">
            <Link
              href="/annonces"
              className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-inherit no-underline outline-none transition-all duration-300 hover:border-[#C9A96E]/75 hover:bg-white/[0.055] hover:shadow-[0_0_32px_-12px_rgba(201,169,110,0.38)] focus-visible:ring-2 focus-visible:ring-[#C9A96E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] md:h-full"
            >
              <div className="mb-6 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Générateur d&apos;annonces</h3>
              <p className="mb-8 flex-1 text-sm leading-relaxed text-[#A0A0A0]">
                Rédigez des annonces percutantes à partir des infos du bien, en quelques clics.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-[#B8965A]">
                Accéder <span aria-hidden>→</span>
              </span>
            </Link>

            <Link
              href="/emails"
              className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-inherit no-underline outline-none transition-all duration-300 hover:border-[#C9A96E]/75 hover:bg-white/[0.055] hover:shadow-[0_0_32px_-12px_rgba(201,169,110,0.38)] focus-visible:ring-2 focus-visible:ring-[#C9A96E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] md:h-full"
            >
              <div className="mb-6 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Emails de relance</h3>
              <p className="mb-8 flex-1 text-sm leading-relaxed text-[#A0A0A0]">
                Relancez vos prospects avec des messages personnalisés et une signature pro.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-[#B8965A]">
                Accéder <span aria-hidden>→</span>
              </span>
            </Link>

            <Link
              href="/comptes-rendus"
              className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-inherit no-underline outline-none transition-all duration-300 hover:border-[#C9A96E]/75 hover:bg-white/[0.055] hover:shadow-[0_0_32px_-12px_rgba(201,169,110,0.38)] focus-visible:ring-2 focus-visible:ring-[#C9A96E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] md:h-full"
            >
              <div className="mb-6 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <path d="M12 11h4" />
                  <path d="M12 16h4" />
                  <path d="M8 11h.01" />
                  <path d="M8 16h.01" />
                </svg>
              </div>
              <h3 className="mb-3 text-xl font-semibold">Compte-rendu de visite</h3>
              <p className="mb-8 flex-1 text-sm leading-relaxed text-[#A0A0A0]">
                Transformez chaque visite en compte-rendu structuré, prêt à partager en PDF.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-[#B8965A]">
                Accéder <span aria-hidden>→</span>
              </span>
            </Link>
          </div>
        </section>

        {/* Activité */}
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="mb-6 text-xl font-semibold md:text-2xl">
            Activité récente
          </h2>
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
            {recentActivity.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap">
                <div className="shrink-0">
                  <ActivityIcon type={item.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#F5F5F0]">{item.description}</p>
                  <p className="mt-0.5 text-xs text-[#A0A0A0]">{item.relativeTime}</p>
                </div>
                <span className="shrink-0 rounded-full border border-[#C9A96E]/35 bg-[#C9A96E]/10 px-2.5 py-0.5 text-xs font-medium text-[#C9A96E]">
                  {typeLabel(item.type)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Conseil */}
        <section
          className="rounded-2xl border border-[#B8965A]/30 bg-white/[0.03] p-8 shadow-[0_0_48px_-18px_rgba(184,150,90,0.28)] md:p-10"
          aria-labelledby="tip-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className="text-3xl leading-none" aria-hidden>
              💡
            </span>
            <div>
              <h2 id="tip-heading" className="text-lg font-semibold text-[#C9A96E] md:text-xl">
                Conseil du jour
              </h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-[#A0A0A0]">
                En immobilier, la régularité bat l&apos;inspiration : fixez-vous trois créneaux par
                semaine pour vos relances et vos compte-rendus. L&apos;IA ne remplace pas le
                relationnel — elle vous aide à garder ce rythme sans sacrifier la qualité de vos
                échanges avec vendeurs et acquéreurs.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
