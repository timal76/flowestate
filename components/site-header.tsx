"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const desktopNavClass =
  "hidden md:flex md:flex-wrap md:items-center md:gap-x-8 md:gap-y-2 text-sm font-medium text-[#A0A0A0]";

const desktopLinkClass = "transition hover:text-[#F5F5F0]";

const desktopDashboardActiveClass =
  "font-semibold text-[#C9A96E] underline decoration-[#C9A96E] decoration-2 underline-offset-4";

const mobileLinkClass =
  "block w-full border-b border-[#C9A96E]/20 px-6 py-3 text-sm font-medium text-[#A0A0A0] transition hover:bg-white/[0.03] hover:text-[#F5F5F0]";

const mobileDashboardActiveClass =
  "block w-full border-b border-[#C9A96E]/20 px-6 py-3 text-sm font-semibold text-[#C9A96E] underline decoration-[#C9A96E] decoration-2 underline-offset-4";

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);

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
          <Link
            href="/login"
            className={`inline-flex items-center rounded-full border border-[#C9A96E] bg-transparent px-4 py-2 text-xs font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A] md:ml-8`}
          >
            Connexion
          </Link>
        </nav>
      </div>

      {menuOpen ? (
        <div
          id="site-mobile-nav"
          className="md:hidden w-full bg-[#0a0a0a] border-b border-[#C9A96E]"
        >
          <nav className="w-full py-3" aria-label="Navigation principale mobile">
            {dashboardMobile}
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
            <div className="border-b border-[#C9A96E]/20 px-6 py-3">
              <Link
                href="/login"
                onClick={closeMenu}
                className="inline-flex w-full items-center justify-center rounded-full border border-[#C9A96E] bg-transparent px-4 py-2 text-xs font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
              >
                Connexion
              </Link>
            </div>
          </nav>
        </div>
      ) : null}

      <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent" />
    </header>
  );
}
