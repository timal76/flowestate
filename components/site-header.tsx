"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

const desktopNavClass =
  "hidden md:flex md:flex-wrap md:items-center md:gap-x-8 md:gap-y-2 text-sm font-medium text-[#A0A0A0]";

const desktopLinkClass = "transition hover:text-[#F5F5F0]";

const desktopDashboardActiveClass =
  "font-semibold text-[#C9A96E] underline decoration-[#C9A96E] decoration-2 underline-offset-4";

const mobileLinkClass =
  "block w-full border-b border-[#C9A96E]/20 px-6 py-3 text-sm font-medium text-[#A0A0A0] transition hover:bg-white/[0.03] hover:text-[#F5F5F0]";

const mobileDashboardActiveClass =
  "block w-full border-b border-[#C9A96E]/20 px-6 py-3 text-sm font-semibold text-[#C9A96E] underline decoration-[#C9A96E] decoration-2 underline-offset-4";

const connexionLinkClass =
  "inline-flex items-center rounded-full border border-[#C9A96E] bg-transparent px-4 py-2 text-xs font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]";

const signOutButtonClass =
  "inline-flex items-center rounded-full border border-red-500/40 bg-transparent px-4 py-2 text-xs font-semibold text-red-300/95 transition hover:border-red-400/55 hover:bg-red-500/10 hover:text-red-200";

const planBadgeBase = "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold";

const offersButtonClass =
  "inline-flex shrink-0 items-center rounded-full border border-[#C9A96E] bg-transparent px-3 py-1 text-xs font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]";

function sessionFirstName(session: { user?: { name?: string | null; email?: string | null } } | null) {
  const name = session?.user?.name?.trim();
  if (name) {
    const first = name.split(/\s+/)[0];
    if (first) return first;
  }
  const email = session?.user?.email?.trim();
  if (email) {
    const local = email.split("@")[0];
    if (local) return local;
  }
  return "Agent";
}

type BillingRow = { plan: string | null; subscription_status: string | null };

export default function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [billing, setBilling] = useState<BillingRow | null>(null);
  const [billingReady, setBillingReady] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);

  const isAuthed = status === "authenticated" && session?.user;
  const firstName = sessionFirstName(session);

  useEffect(() => {
    if (!isAuthed || !session?.user?.id) {
      setBilling(null);
      setBillingReady(false);
      return;
    }

    let cancelled = false;
    setBillingReady(false);

    void (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("plan, subscription_status")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      if (error || !data) {
        setBilling(null);
      } else {
        setBilling({
          plan: data.plan as string | null,
          subscription_status: data.subscription_status as string | null,
        });
      }
      setBillingReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthed, session?.user?.id]);

  const plan = billing?.plan ?? "free";
  const subStatus = billing?.subscription_status ?? "";
  const showOffers =
    billingReady && isAuthed && (plan === "free" || subStatus === "inactive");
  const isTrialish = subStatus === "trial" || subStatus === "trialing";
  const showPlanBadge =
    billingReady &&
    isAuthed &&
    !showOffers &&
    (isTrialish ||
      plan === "pro" ||
      (plan === "starter" && subStatus === "active"));

  async function handleSignOut() {
    closeMenu();
    await signOut({ callbackUrl: "/" });
  }

  const dashboardDesktop =
    pathname === "/dashboard" ? (
      <span
        className={desktopDashboardActiveClass}
        aria-current="page"
      >
        Dashboard
      </span>
    ) : (
      <Link href="/dashboard" className={desktopLinkClass}>
        Dashboard
      </Link>
    );

  const historiqueDesktop =
    pathname === "/historique" ? (
      <span className={desktopDashboardActiveClass} aria-current="page">
        Historique
      </span>
    ) : (
      <Link href="/historique" className={desktopLinkClass}>
        Historique
      </Link>
    );

  const dashboardMobile =
    pathname === "/dashboard" ? (
      <span
        className={mobileDashboardActiveClass}
        aria-current="page"
      >
        Dashboard
      </span>
    ) : (
      <Link href="/dashboard" className={mobileLinkClass} onClick={closeMenu}>
        Dashboard
      </Link>
    );

  const historiqueMobile =
    pathname === "/historique" ? (
      <span className={mobileDashboardActiveClass} aria-current="page">
        Historique
      </span>
    ) : (
      <Link href="/historique" className={mobileLinkClass} onClick={closeMenu}>
        Historique
      </Link>
    );

  const contactDesktop =
    pathname === "/contact" ? (
      <span className={desktopDashboardActiveClass} aria-current="page">
        Contact
      </span>
    ) : (
      <Link href="/contact" className={desktopLinkClass}>
        Contact
      </Link>
    );

  const contactMobile =
    pathname === "/contact" ? (
      <span className={mobileDashboardActiveClass} aria-current="page">
        Contact
      </span>
    ) : (
      <Link href="/contact" className={mobileLinkClass} onClick={closeMenu}>
        Contact
      </Link>
    );

  function renderPlanBadge() {
    if (!showPlanBadge || !billing) return null;
    if (isTrialish) {
      return (
        <span
          className={`${planBadgeBase} border-[#C9A96E]/55 bg-[#C9A96E]/12 text-[#C9A96E]`}
          title="Essai"
        >
          Trial
        </span>
      );
    }
    if (plan === "pro") {
      return (
        <span
          className={`${planBadgeBase} border-[#E8C77B] bg-[#C9A96E]/25 text-[#F0D9A8]`}
          title="Plan Pro"
        >
          Pro
        </span>
      );
    }
    if (plan === "starter" && subStatus === "active") {
      return (
        <span
          className={`${planBadgeBase} border-slate-500/45 bg-slate-500/15 text-slate-300`}
          title="Plan Starter"
        >
          Starter
        </span>
      );
    }
    return null;
  }

  const authDesktop = isAuthed ? (
    <div className="inline-flex flex-wrap items-center gap-2 md:ml-8">
      <Link
        href="/profil"
        className="cursor-pointer text-xs font-semibold tracking-wide text-[#C9A96E] hover:underline"
      >
        {firstName}
      </Link>
      {renderPlanBadge()}
      {showOffers ? (
        <Link href="/tarifs" className={offersButtonClass}>
          Voir les offres
        </Link>
      ) : null}
      <button type="button" onClick={() => void handleSignOut()} className={signOutButtonClass}>
        Déconnexion
      </button>
    </div>
  ) : (
    <Link href="/login" className={`${connexionLinkClass} md:ml-8`}>
      Connexion
    </Link>
  );

  const authMobile = isAuthed ? (
    <div className="space-y-3 border-b border-[#C9A96E]/20 px-6 py-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/profil"
          onClick={closeMenu}
          className="cursor-pointer text-center text-xs font-semibold tracking-wide text-[#C9A96E] hover:underline"
        >
          {firstName}
        </Link>
        {renderPlanBadge()}
      </div>
      {showOffers ? (
        <Link href="/tarifs" onClick={closeMenu} className={`${offersButtonClass} w-full justify-center`}>
          Voir les offres
        </Link>
      ) : null}
      <button type="button" onClick={() => void handleSignOut()} className={`${signOutButtonClass} w-full justify-center`}>
        Déconnexion
      </button>
    </div>
  ) : (
    <div className="border-b border-[#C9A96E]/20 px-6 py-3">
      <Link
        href="/login"
        onClick={closeMenu}
        className={`${connexionLinkClass} w-full justify-center`}
      >
        Connexion
      </Link>
    </div>
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="text-xl font-semibold tracking-wide text-[#C9A96E]">
          FlowEstate
        </Link>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-mobile-nav"
          onClick={toggleMenu}
          className="inline-flex items-center justify-center p-2 text-2xl leading-none text-[#C9A96E] transition hover:text-[#d4b882] md:hidden"
        >
          <span className="sr-only">{menuOpen ? "Fermer le menu" : "Ouvrir le menu"}</span>
          <span aria-hidden>{menuOpen ? "✕" : "☰"}</span>
        </button>

        <nav className={desktopNavClass} aria-label="Navigation principale">
          {dashboardDesktop}
          {historiqueDesktop}
          <Link href="/annonces" className={desktopLinkClass}>
            Annonces
          </Link>
          <Link href="/emails" className={desktopLinkClass}>
            Emails
          </Link>
          <Link href="/comptes-rendus" className={desktopLinkClass}>
            Comptes-rendus
          </Link>
          <Link href="/" className={desktopLinkClass}>
            Accueil
          </Link>
          {!isAuthed ? contactDesktop : null}
          {!isAuthed ? (
            <Link href="/tarifs" className={desktopLinkClass}>
              Tarifs
            </Link>
          ) : null}
          {authDesktop}
        </nav>
      </div>

      {menuOpen ? (
        <div
          id="site-mobile-nav"
          className="md:hidden w-full bg-[#0a0a0a] border-b border-[#C9A96E]"
        >
          <nav className="w-full py-3" aria-label="Navigation principale mobile">
            {dashboardMobile}
            {historiqueMobile}
            <Link href="/annonces" className={mobileLinkClass} onClick={closeMenu}>
              Annonces
            </Link>
            <Link href="/emails" className={mobileLinkClass} onClick={closeMenu}>
              Emails
            </Link>
            <Link href="/comptes-rendus" className={mobileLinkClass} onClick={closeMenu}>
              Comptes-rendus
            </Link>
            <Link href="/" className={mobileLinkClass} onClick={closeMenu}>
              Accueil
            </Link>
            {!isAuthed ? contactMobile : null}
            {!isAuthed ? (
              <Link href="/tarifs" className={mobileLinkClass} onClick={closeMenu}>
                Tarifs
              </Link>
            ) : null}
            {authMobile}
          </nav>
        </div>
      ) : null}

      <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent" />
    </header>
  );
}
