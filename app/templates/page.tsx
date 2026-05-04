"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import SiteHeader from "@/components/site-header";
import type { TemplateType } from "@/components/templates/TemplatesModal";

type TemplateRow = {
  id: string;
  user_id: string;
  type: TemplateType;
  name: string;
  content: string;
  created_at: string;
};

type TypeFilter = "all" | TemplateType;

const goldRgb = "201,169,110";

const filterButtonBase =
  "inline-flex flex-1 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition sm:flex-none sm:min-w-[7.5rem]";
const filterInactiveClass = `${filterButtonBase} border-white/15 bg-transparent text-[#A0A0A0] hover:border-white/25 hover:text-[#F5F5F0]`;
const filterActiveClass = `${filterButtonBase} border-[#C9A96E] bg-[#C9A96E]/10 text-[#C9A96E]`;

function typeLabel(type: TemplateType) {
  if (type === "annonce") return "Annonce";
  if (type === "email") return "Email";
  return "Compte-rendu";
}

function routeFromType(type: TemplateType) {
  if (type === "annonce") return "/annonces";
  if (type === "email") return "/emails";
  return "/comptes-rendus";
}

function relativeDateLabel(iso: string) {
  const created = new Date(iso).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - created) / 86400000);
  if (diffDays <= 0) return "aujourd'hui";
  if (diffDays === 1) return "il y a 1 jour";
  if (diffDays < 30) return `il y a ${diffDays} jours`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTemplates() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/templates");
        const data = (await res.json()) as { templates?: TemplateRow[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger les templates.");
        if (!mounted) return;
        setTemplates(data.templates ?? []);
      } catch {
        toast.error("Une erreur est survenue");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadTemplates();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!confirmDeleteId) return;
    const timeout = window.setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [confirmDeleteId]);

  const filteredTemplates = useMemo(() => {
    if (filter === "all") return templates;
    return templates.filter((template) => template.type === filter);
  }, [templates, filter]);

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Impossible de supprimer le template.");
      setTemplates((prev) => prev.filter((template) => template.id !== id));
      setConfirmDeleteId(null);
      toast.success("Template supprimé");
    } catch {
      toast.error("Une erreur est survenue");
    }
  }

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
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Mes templates</h1>
            <p className="text-lg text-[#A0A0A0] md:text-xl">Réutilisez vos meilleures structures de texte</p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-sm text-[#A0A0A0]">
            {templates.length} / 10
          </span>
        </header>

        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filtrer les templates">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={filter === "all" ? filterActiveClass : filterInactiveClass}
          >
            Tous
          </button>
          <button
            type="button"
            onClick={() => setFilter("annonce")}
            className={filter === "annonce" ? filterActiveClass : filterInactiveClass}
          >
            Annonces
          </button>
          <button
            type="button"
            onClick={() => setFilter("email")}
            className={filter === "email" ? filterActiveClass : filterInactiveClass}
          >
            Emails
          </button>
          <button
            type="button"
            onClick={() => setFilter("compte-rendu")}
            className={filter === "compte-rendu" ? filterActiveClass : filterInactiveClass}
          >
            Comptes-rendus
          </button>
        </div>

        {isLoading ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center text-sm text-[#A0A0A0]">
            Chargement...
          </p>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-12 text-center">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-base font-medium text-[#F5F5F0]">Aucun template sauvegardé</p>
            <p className="mt-2 text-sm text-[#A0A0A0]">Créez votre premier template après une génération</p>
            <Link
              href="/annonces"
              className="mt-5 inline-flex rounded-full border border-[#C9A96E] px-4 py-2 text-sm font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
            >
              Créer mon premier template
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredTemplates.map((template) => (
              <article
                key={template.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-[#C9A96E]/40"
              >
                <span className="inline-flex rounded-full border border-[#C9A96E]/20 bg-[#C9A96E]/10 px-2 py-0.5 text-[10px] text-[#C9A96E]">
                  {typeLabel(template.type)}
                </span>
                <h2 className="mt-2 text-lg font-medium text-[#F5F5F0]">{template.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-[#A0A0A0]">{template.content}</p>
                <footer className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#555]">{relativeDateLabel(template.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`${routeFromType(template.type)}?template=${template.id}`}
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-[#A0A0A0] transition hover:border-[#C9A96E]/40 hover:text-[#C9A96E]"
                    >
                      Utiliser
                    </Link>
                    {confirmDeleteId === template.id ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(template.id)}
                        className="rounded-full border border-red-400/50 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
                      >
                        Confirmer ?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(template.id)}
                        className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-[#A0A0A0] transition hover:border-red-400/50 hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
