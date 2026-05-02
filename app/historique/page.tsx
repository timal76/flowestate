import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import SiteHeader from "@/components/site-header";

export const dynamic = "force-dynamic";

const goldRgb = "201, 169, 110";

type ActivityType = "annonce" | "email" | "compte-rendu";

type GenerationRow = {
  id: string;
  type: string;
  description: string | null;
  created_at: string;
};

type TypeFilter = "all" | ActivityType;

const PAGE_SIZE = 20;

function parseTypeFilter(raw: string | undefined): TypeFilter {
  if (raw === "annonce" || raw === "email" || raw === "compte-rendu") return raw;
  return "all";
}

function formatDateTimeFr(iso: string): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const h = d.getHours();
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${dateStr} à ${h}h${min}`;
}

function isActivityType(t: string): t is ActivityType {
  return t === "annonce" || t === "email" || t === "compte-rendu";
}

function typeLabel(type: ActivityType) {
  if (type === "annonce") return "Annonce";
  if (type === "email") return "Email";
  return "Compte-rendu";
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

function filterHref(filter: TypeFilter, search?: string): string {
  const q = new URLSearchParams();
  if (filter !== "all") q.set("type", filter);
  const s = search?.trim() ?? "";
  if (s) q.set("search", s);
  return q.toString() ? `/historique?${q}` : "/historique";
}

function pageHref(pageNum: number, typeFilter: TypeFilter, search?: string): string {
  const q = new URLSearchParams();
  if (typeFilter !== "all") q.set("type", typeFilter);
  const s = search?.trim() ?? "";
  if (s) q.set("search", s);
  if (pageNum > 1) q.set("page", String(pageNum));
  return q.toString() ? `/historique?${q}` : "/historique";
}

function resultsCountLabel(count: number): string {
  if (count === 0) return "0 résultat trouvé";
  if (count === 1) return "1 résultat trouvé";
  return `${count} résultats trouvés`;
}

const filterButtonBase =
  "inline-flex flex-1 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition sm:flex-none sm:min-w-[7.5rem]";
const filterInactiveClass = `${filterButtonBase} border-white/15 bg-transparent text-[#A0A0A0] hover:border-white/25 hover:text-[#F5F5F0]`;
const filterActiveClass = `${filterButtonBase} border-[#C9A96E] bg-[#C9A96E]/10 text-[#C9A96E]`;

type HistoriquePageProps = {
  searchParams: Promise<{ type?: string; page?: string; search?: string }>;
};

export default async function HistoriquePage({ searchParams }: HistoriquePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const sp = await searchParams;
  const typeFilter = parseTypeFilter(sp.type);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const searchTrim =
    typeof sp.search === "string" ? sp.search.trim() : "";
  const userId = session.user.id;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let rows: GenerationRow[] = [];
  let totalCount = 0;

  if (url && key) {
    const supabase = createClient(url, key);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("generations")
      .select("id,type,description,created_at", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter);
    }

    if (searchTrim) {
      query = query.ilike("prospect_name", `%${searchTrim}%`);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      console.error("[historique] generations", error);
    } else {
      rows = (data ?? []) as GenerationRow[];
      totalCount = count ?? 0;
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  if (page > totalPages) {
    const q = new URLSearchParams();
    if (typeFilter !== "all") q.set("type", typeFilter);
    if (searchTrim) q.set("search", searchTrim);
    if (totalPages > 1) q.set("page", String(totalPages));
    redirect(q.size ? `/historique?${q}` : "/historique");
  }

  const safePage = Math.min(page, totalPages);
  const showPrev = safePage > 1;
  const showNext = safePage < totalPages;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <SiteHeader />

      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: `radial-gradient(700px circle at 10% 5%, rgba(${goldRgb}, 0.10), transparent 65%)`,
        }}
        aria-hidden
      />

      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-32 md:px-10">
        <header className="mb-10 max-w-3xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Historique</h1>
          <p className="text-lg text-[#A0A0A0] md:text-xl">
            Toutes vos générations FlowEstate
          </p>
        </header>

        <div
          className="mb-8 flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrer par type de génération"
        >
          <Link
            href={filterHref("all", searchTrim)}
            className={typeFilter === "all" ? filterActiveClass : filterInactiveClass}
            aria-current={typeFilter === "all" ? "true" : undefined}
          >
            Tout
          </Link>
          <Link
            href={filterHref("annonce", searchTrim)}
            className={typeFilter === "annonce" ? filterActiveClass : filterInactiveClass}
            aria-current={typeFilter === "annonce" ? "true" : undefined}
          >
            Annonces
          </Link>
          <Link
            href={filterHref("email", searchTrim)}
            className={typeFilter === "email" ? filterActiveClass : filterInactiveClass}
            aria-current={typeFilter === "email" ? "true" : undefined}
          >
            Emails
          </Link>
          <Link
            href={filterHref("compte-rendu", searchTrim)}
            className={typeFilter === "compte-rendu" ? filterActiveClass : filterInactiveClass}
            aria-current={typeFilter === "compte-rendu" ? "true" : undefined}
          >
            Comptes-rendus
          </Link>
        </div>

        <form method="get" action="/historique" className="mb-2 space-y-2">
          {typeFilter !== "all" ? (
            <input type="hidden" name="type" value={typeFilter} />
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Rechercher par nom de prospect</span>
              <input
                type="search"
                name="search"
                defaultValue={searchTrim}
                placeholder="Rechercher par nom de prospect..."
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              className="shrink-0 rounded-xl border border-[#C9A96E]/45 bg-[#C9A96E]/10 px-5 py-3 text-sm font-semibold text-[#C9A96E] transition hover:border-[#C9A96E] hover:bg-[#C9A96E]/15 sm:self-stretch"
            >
              Rechercher
            </button>
          </div>
        </form>
        <p className="mb-8 text-sm text-[#A0A0A0]">{resultsCountLabel(totalCount)}</p>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center text-sm text-[#A0A0A0]">
            Aucune génération pour l&apos;instant
          </p>
        ) : (
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.02]">
            {rows.map((row) => {
              const type: ActivityType = isActivityType(row.type) ? row.type : "annonce";
              const description = row.description?.trim() || "Génération enregistrée";
              const dateLabel = formatDateTimeFr(row.created_at);
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
                    <p className="mt-0.5 text-xs text-[#A0A0A0]">{dateLabel}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-[#C9A96E]">
                    {typeLabel(type)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {totalCount > PAGE_SIZE ? (
          <nav
            className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8"
            aria-label="Pagination"
          >
            {showPrev ? (
              <Link
                href={pageHref(safePage - 1, typeFilter, searchTrim)}
                className="rounded-xl border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-2 text-sm font-semibold text-[#C9A96E] transition hover:border-[#C9A96E] hover:bg-[#C9A96E]/15"
              >
                Page précédente
              </Link>
            ) : (
              <span className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#A0A0A0]/50">
                Page précédente
              </span>
            )}
            <p className="text-sm text-[#A0A0A0]">
              Page {safePage} sur {totalPages}
            </p>
            {showNext ? (
              <Link
                href={pageHref(safePage + 1, typeFilter, searchTrim)}
                className="rounded-xl border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-2 text-sm font-semibold text-[#C9A96E] transition hover:border-[#C9A96E] hover:bg-[#C9A96E]/15"
              >
                Page suivante
              </Link>
            ) : (
              <span className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#A0A0A0]/50">
                Page suivante
              </span>
            )}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
