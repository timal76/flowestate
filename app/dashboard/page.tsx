import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import SiteHeader from "@/components/site-header";
import { absoluteUrl } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

const CANONICAL_PATH = "/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Tableau de bord FlowEstate : activité récente, stats de génération, essai et accès rapide à vos outils IA.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Dashboard | FlowEstate",
    description:
      "Tableau de bord FlowEstate : activité récente, stats de génération, essai et accès rapide à vos outils IA.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

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

function startOfCurrentMonthIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function greetingNameFromSessionName(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "Agent";
  const first = trimmed.split(/\s+/)[0];
  return first || "Agent";
}

function formatSavedTimeMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 min";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

type ActivityType = "annonce" | "email" | "compte-rendu";

type GenerationRow = {
  id: string;
  type: string;
  description: string | null;
  created_at: string;
};

function formatRelativeTimeFr(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return "à l'instant";

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) {
    return diffMin < 1 ? "il y a 1 min" : `il y a ${diffMin} min`;
  }

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayStartNow = startOfDay(now);
  const dayStartThen = startOfDay(then);
  const calendarDayDiff = Math.round((dayStartNow - dayStartThen) / 86400000);

  if (calendarDayDiff === 1) return "hier";
  if (calendarDayDiff === 0) {
    const hours = Math.floor(diffMin / 60);
    return `il y a ${hours}h`;
  }
  return `il y a ${calendarDayDiff} jours`;
}

function isActivityType(t: string): t is ActivityType {
  return t === "annonce" || t === "email" || t === "compte-rendu";
}

const activityIconShellClass =
  "inline-flex h-10 w-10 flex-none shrink-0 items-center justify-center rounded-full border border-solid box-border aspect-square";
const activityIconShellStyle = {
  borderColor: `rgba(${goldRgb}, 0.45)`,
  backgroundColor: `rgba(${goldRgb}, 0.12)`,
} as const;

function ActivityIcon({ type }: { type: ActivityType }) {
  const iconClass = "block shrink-0 text-[#C9A96E]";
  if (type === "annonce") {
    return (
      <div className={`${activityIconShellClass} text-[#F5F5F0]`} style={activityIconShellStyle}>
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
          className={iconClass}
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
      <div className={`${activityIconShellClass} text-[#F5F5F0]`} style={activityIconShellStyle}>
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
          className={iconClass}
          aria-hidden
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`${activityIconShellClass} text-[#F5F5F0]`} style={activityIconShellStyle}>
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
        className={iconClass}
        aria-hidden
      >
        <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" />
        <path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
        <path d="M9 12h6M9 16h6" />
      </svg>
    </div>
  );
}

function typeLabel(type: ActivityType) {
  if (type === "annonce") return "Annonce";
  if (type === "email") return "Email";
  return "Compte-rendu";
}

type DashboardPageProps = {
  searchParams: Promise<{ success?: string; plan?: string }>;
};

function subscriptionSuccessMessage(plan: string | undefined): string {
  if (plan === "starter") {
    return "Bienvenue sur FlowEstate ! Votre abonnement Starter est actif.";
  }
  if (plan === "pro") {
    return "Bienvenue sur FlowEstate ! Votre abonnement Pro est actif.";
  }
  return "Bienvenue sur FlowEstate ! Votre abonnement est actif.";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const sp = await searchParams;
  const showSubscriptionSuccess = sp.success === "true";
  const planParam = typeof sp.plan === "string" ? sp.plan : undefined;

  const { data: userData } = await supabase
    .from("users")
    .select(
      "plan, subscription_status, trial_ends_at, created_at, onboarding_completed, first_name, last_name, agency_name, phone, logo_url"
    )
    .eq("id", session.user.id)
    .single();

  const trialDaysLeft = userData?.trial_ends_at
    ? Math.ceil(
        (new Date(userData.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const showTrialBanner =
    (userData?.subscription_status === "trialing" ||
      userData?.subscription_status === "trial") &&
    trialDaysLeft !== null &&
    trialDaysLeft > 0;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const fromIso = startOfCurrentMonthIso();
  const userId = session.user.id;

  let annoncesCeMois = 0;
  let emailsCeMois = 0;
  let comptesRendusCeMois = 0;
  let recentGenerations: GenerationRow[] = [];

  if (url && key) {
    const supabase = createClient(url, key);

    const countThisMonth = (type: "annonce" | "email" | "compte-rendu") =>
      supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("type", type)
        .eq("user_id", userId)
        .gte("created_at", fromIso);

    const [annRes, emailRes, crRes, recentRes] = await Promise.all([
      countThisMonth("annonce"),
      countThisMonth("email"),
      countThisMonth("compte-rendu"),
      supabase
        .from("generations")
        .select("id,type,description,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (annRes.error) console.error("[dashboard] generations count annonce", annRes.error);
    else annoncesCeMois = annRes.count ?? 0;
    if (emailRes.error) console.error("[dashboard] generations count email", emailRes.error);
    else emailsCeMois = emailRes.count ?? 0;
    if (crRes.error) console.error("[dashboard] generations count compte-rendu", crRes.error);
    else comptesRendusCeMois = crRes.count ?? 0;

    if (recentRes.error) {
      console.error("[dashboard] generations recent", recentRes.error);
    } else {
      recentGenerations = (recentRes.data ?? []) as GenerationRow[];
    }
  }

  const minutesEconomisees =
    annoncesCeMois * 15 + emailsCeMois * 10 + comptesRendusCeMois * 20;
  const tempsEconomiseLabel = formatSavedTimeMinutes(minutesEconomisees);

  const totalGenCeMois = annoncesCeMois + emailsCeMois + comptesRendusCeMois;
  const generationsRestantes = Math.max(0, 30 - totalGenCeMois);
  const showGenerationsRestantesCard =
    userData?.plan === "starter" && userData?.subscription_status === "active";
  const showOnboardingModal = userData?.onboarding_completed !== true;
  const generationsRestantesColorClass =
    generationsRestantes <= 5
      ? "text-red-400"
      : generationsRestantes <= 10
        ? "text-orange-400"
        : "text-[#B8965A]";

  const dateLabel = formatTodayFr();
  const prenom = greetingNameFromSessionName(session.user.name);

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      {showOnboardingModal ? (
        <OnboardingModal
          firstName={userData?.first_name ?? null}
          lastName={userData?.last_name ?? null}
          agencyName={userData?.agency_name ?? null}
          phone={userData?.phone ?? null}
          logoUrl={userData?.logo_url ?? null}
          createdAt={userData?.created_at ?? null}
          trialEndsAt={userData?.trial_ends_at ?? null}
        />
      ) : null}
      <SiteHeader />

      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(700px circle at 10% 5%, rgba(${goldRgb}, 0.10), transparent 65%)`,
        }}
        aria-hidden
      />

      <div className="mx-auto w-full max-w-7xl space-y-14 px-6 pb-24 pt-32 md:px-10">
        {showSubscriptionSuccess ? (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-4 text-green-300">
            {subscriptionSuccessMessage(planParam)}
          </div>
        ) : null}
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Bonjour, {prenom} <span aria-hidden>👋</span>
          </h1>
          {showTrialBanner && userData ? (
            <div className="rounded-xl border border-[#C9A96E]/40 bg-[#C9A96E]/15 px-6 py-4 text-[#C9A96E] font-medium">
              <span aria-hidden>⏱</span> Essai gratuit — {trialDaysLeft} jour
              {trialDaysLeft > 1 ? "s" : ""} restant{trialDaysLeft > 1 ? "s" : ""}. Votre plan{" "}
              {userData.plan === "pro" ? "Pro" : "Starter"} sera activé automatiquement.
            </div>
          ) : null}
          <p className="text-base capitalize text-[#A0A0A0] md:text-lg">{dateLabel}</p>
        </header>

        {/* Stats */}
        <section aria-label="Statistiques rapides">
          <div
            className={`grid gap-4 sm:grid-cols-2 ${showGenerationsRestantesCard ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
          >
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
              <p className="text-3xl font-semibold tracking-tight text-[#B8965A] md:text-4xl">
                {annoncesCeMois}
              </p>
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
              <p className="text-3xl font-semibold tracking-tight text-[#B8965A] md:text-4xl">
                {emailsCeMois}
              </p>
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
              <p className="text-3xl font-semibold tracking-tight text-[#B8965A] md:text-4xl">
                {comptesRendusCeMois}
              </p>
              <p className="mt-1 text-xs text-[#A0A0A0]/90">ce mois</p>
            </article>

            {showGenerationsRestantesCard ? (
              <article className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-[#A0A0A0]">Générations restantes</span>
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
                      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </span>
                </div>
                <p
                  className={`text-3xl font-semibold tracking-tight md:text-4xl ${generationsRestantesColorClass}`}
                >
                  {generationsRestantes}
                </p>
                <p className="mt-1 text-xs text-[#A0A0A0]/90">ce mois</p>
              </article>
            ) : null}

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
              <p className="text-3xl font-semibold tracking-tight text-[#B8965A] md:text-4xl">
                {tempsEconomiseLabel}
              </p>
              <p className="mt-1 text-xs text-[#A0A0A0]/90">ce mois</p>
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
          {recentGenerations.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-10 text-center text-sm text-[#A0A0A0]">
              Aucune activité ce mois — commencez à générer !
            </p>
          ) : (
            <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
              {recentGenerations.map((row) => {
                const type: ActivityType = isActivityType(row.type) ? row.type : "annonce";
                const description =
                  row.description?.trim() || "Génération enregistrée";
                const relativeTime = formatRelativeTimeFr(row.created_at);
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center gap-4 px-5 py-4 sm:flex-nowrap"
                  >
                    <div className="shrink-0">
                      <ActivityIcon type={type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#F5F5F0]">{description}</p>
                      <p className="mt-0.5 text-xs text-[#A0A0A0]">{relativeTime}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-[#C9A96E]">
                      {typeLabel(type)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
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
