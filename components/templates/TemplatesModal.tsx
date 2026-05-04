"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export type TemplateType = "annonce" | "email" | "compte-rendu";

type TemplateRow = {
  id: string;
  user_id: string;
  type: TemplateType;
  name: string;
  content: string;
  created_at: string;
};

type TemplatesModalProps = {
  open: boolean;
  mode: "save" | "load";
  type: TemplateType;
  initialContent?: string;
  onClose: () => void;
  onLoad: (content: string) => void;
};

function typeLabel(type: TemplateType) {
  if (type === "annonce") return "Annonce";
  if (type === "email") return "Email";
  return "Compte-rendu";
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

export default function TemplatesModal({
  open,
  mode,
  type,
  initialContent,
  onClose,
  onLoad,
}: TemplatesModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [inlineError, setInlineError] = useState("");

  useEffect(() => {
    if (!open) return;

    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/templates?type=${encodeURIComponent(type)}`);
        const data = (await res.json()) as { templates?: TemplateRow[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger les templates.");
        setTemplates(data.templates ?? []);
      } catch {
        toast.error("Une erreur est survenue");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [open, type]);

  const templatesCount = templates.length;
  const hasLimitReached = templatesCount >= 10;
  const preview = (initialContent ?? "").trim();

  const saveDisabled = useMemo(() => {
    return isSaving || !templateName.trim() || !preview;
  }, [isSaving, templateName, preview]);

  if (!open) return null;

  async function handleSave() {
    if (hasLimitReached) {
      setInlineError("Limite de 10 templates atteinte. Supprimez-en un pour continuer.");
      toast.error("Limite de 10 templates atteinte");
      return;
    }

    setInlineError("");
    setIsSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          type,
          content: preview,
        }),
      });
      const data = (await res.json()) as { template?: TemplateRow; error?: string };
      if (!res.ok || !data.template) {
        throw new Error(data.error ?? "Impossible de sauvegarder le template.");
      }
      setTemplates((prev) => [data.template as TemplateRow, ...prev]);
      toast.success("Template sauvegardé");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur est survenue";
      if (message.includes("Limite de 10 templates atteinte")) {
        setInlineError("Limite de 10 templates atteinte. Supprimez-en un pour continuer.");
        toast.error("Limite de 10 templates atteinte");
      } else {
        toast.error("Une erreur est survenue");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Impossible de supprimer le template.");
      }
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
      toast.success("Template supprimé");
    } catch {
      toast.error("Une erreur est survenue");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm transition-opacity duration-200 opacity-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#C9A96E]/20 bg-[#0A0A0A] transition-all duration-200 scale-100 opacity-100"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#C9A96E]/10 bg-[#060606] px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-[#F5F5F0]">
              {mode === "save" ? "Sauvegarder comme template" : "Mes templates"}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-[#555] transition hover:text-[#888]"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {mode === "save" ? (
            <div className="space-y-4">
              {hasLimitReached ? (
                <p className="rounded-lg border border-[#C9A96E]/20 bg-[#C9A96E]/[0.08] px-3 py-2 text-xs text-[#C9A96E]">
                  Limite de 10 templates atteinte. Supprimez-en un pour continuer.
                </p>
              ) : null}
              {inlineError ? (
                <p className="rounded-lg border border-[#C9A96E]/20 bg-[#C9A96E]/[0.08] px-3 py-2 text-xs text-[#C9A96E]">
                  {inlineError}
                </p>
              ) : null}
              <label className="block">
                <span className="mb-1 block text-[11px] text-[#666]">Nom du template</span>
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="Ex: Annonce appartement standard"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-[#F5F5F0] outline-none transition focus:border-[#C9A96E]/50"
                />
              </label>

              <div>
                <span className="mb-1 block text-[11px] text-[#666]">Aperçu</span>
                <div className="max-h-24 overflow-hidden rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5 text-xs text-[#666] line-clamp-4">
                  {preview || "Aucun contenu à sauvegarder."}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-transparent text-sm text-[#555] transition hover:text-[#888]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saveDisabled}
                  className="rounded-full border-[1.5px] border-[#C9A96E] bg-transparent px-5 py-2 text-sm font-medium text-[#C9A96E] transition duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Sauvegarde..." : "Sauvegarder"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-end">
                <span className="text-xs text-[#555]">{templatesCount} / 10 templates</span>
              </div>

              {isLoading ? (
                <p className="py-8 text-center text-sm text-[#555]">Chargement...</p>
              ) : templates.length === 0 ? (
                <div className="py-8 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="mx-auto mb-3 text-[#555]"
                    aria-hidden
                  >
                    <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <p className="text-sm text-[#555]">Aucun template sauvegardé</p>
                  <p className="mt-1 text-xs text-[#444]">
                    Générez du contenu et sauvegardez-le comme template
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto pr-1">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        onLoad(template.content);
                        onClose();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onLoad(template.content);
                          onClose();
                        }
                      }}
                      className="mb-2 block w-full cursor-pointer rounded-xl border border-white/10 px-4 py-3 text-left transition hover:border-[#C9A96E]/30 hover:bg-[#C9A96E]/[0.03]"
                    >
                      <div className="flex items-start gap-2">
                        <p className="text-sm font-medium text-[#F5F5F0]">{template.name}</p>
                        <span className="rounded-full border border-[#C9A96E]/20 bg-[#C9A96E]/10 px-2 py-0.5 text-[10px] text-[#C9A96E]">
                          {typeLabel(template.type)}
                        </span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(template.id);
                          }}
                          className="ml-auto text-[#444] transition hover:text-red-400"
                          aria-label="Supprimer le template"
                        >
                          🗑
                        </button>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-[#555]">{template.content}</p>
                      <p className="mt-1 text-[10px] text-[#444]">{relativeDateLabel(template.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
