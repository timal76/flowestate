"use client";

import ReactMarkdown from "react-markdown";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import SiteHeader from "@/components/site-header";
import TemplatesModal from "@/components/templates/TemplatesModal";
import { supabase } from "@/lib/supabase";

type PropertyType = "Appartement" | "Maison" | "Studio" | "Loft" | "Villa";
type ProspectSituation = "Premier achat" | "Investissement" | "Résidence secondaire";
type VisitFeedback =
  | "Très intéressé"
  | "Intéressé"
  | "Hésitant"
  | "Sans nouvelles depuis la visite"
  | "A visité d'autres biens";
type SearchDelay =
  | "Urgent (moins d'1 mois)"
  | "Court terme (1-3 mois)"
  | "Moyen terme (3-6 mois)"
  | "Flexible";
type EmailTone = "Professionnel" | "Chaleureux" | "Urgent";
type EmailLength = "Court (5-8 lignes)" | "Standard (10-15 lignes)" | "Détaillé (15-20 lignes)";

type FormState = {
  agentName: string;
  agencyName: string;
  agentPhone: string;
  agentEmail: string;
  prospectName: string;
  prospectEmail: string;
  propertyType: PropertyType;
  propertyLocation: string;
  propertyPrice: string;
  visitDate: string;
  prospectBudget: string;
  prospectSituation: ProspectSituation;
  visitFeedback: VisitFeedback;
  searchDelay: SearchDelay;
  objections: string;
  personalInfo: string;
  tone: EmailTone;
  length: EmailLength;
};

const initialForm: FormState = {
  agentName: "",
  agencyName: "",
  agentPhone: "",
  agentEmail: "",
  prospectName: "",
  prospectEmail: "",
  propertyType: "Appartement",
  propertyLocation: "",
  propertyPrice: "",
  visitDate: "",
  prospectBudget: "",
  prospectSituation: "Premier achat",
  visitFeedback: "Intéressé",
  searchDelay: "Court terme (1-3 mois)",
  objections: "",
  personalInfo: "",
  tone: "Professionnel",
  length: "Standard (10-15 lignes)",
};

const selectFieldClassName =
  "w-full overflow-visible rounded-xl border border-white/15 bg-[#121212] pl-4 pr-10 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]";

export default function EmailsGeneratorPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(initialForm);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generationsUsed, setGenerationsUsed] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState<string>("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("");
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templatesModalMode, setTemplatesModalMode] = useState<"save" | "load">("load");

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) {
      setGenerationsUsed(null);
      setUserPlan("");
      setSubscriptionStatus("");
      return;
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const fromIso = startOfMonth.toISOString();

    const loadProfile = async () => {
      const { data } = await supabase
        .from("users")
        .select("agency_name, first_name, last_name, phone, email, plan, subscription_status")
        .eq("id", session.user.id)
        .single();

      if (!data) return;

      setUserPlan(typeof data.plan === "string" ? data.plan : "");
      setSubscriptionStatus(
        typeof data.subscription_status === "string" ? data.subscription_status : ""
      );

      const { count } = await supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .gte("created_at", fromIso);

      setGenerationsUsed(count ?? 0);

      setForm((prev) => ({
        ...prev,
        agentName:
          data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : prev.agentName,
        agencyName: data.agency_name || prev.agencyName,
        agentPhone: data.phone || prev.agentPhone,
        agentEmail: data.email || prev.agentEmail,
      }));
    };

    void loadProfile();
  }, [sessionStatus, session?.user?.id]);

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId) return;

    let cancelled = false;

    async function preloadTemplate() {
      try {
        const res = await fetch("/api/templates?type=email");
        const data = (await res.json()) as {
          templates?: Array<{ id: string; content: string }>;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger le template.");
        const selected = (data.templates ?? []).find((template) => template.id === templateId);
        if (!selected || cancelled) return;
        setForm((prev) => ({ ...prev, personalInfo: selected.content }));
        toast.success("Template chargé");
      } catch {
        if (!cancelled) toast.error("Une erreur est survenue");
      }
    }

    void preloadTemplate();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCopied(false);

    if (sessionStatus === "loading") {
      return;
    }

    if (!session?.user) {
      const count = parseInt(localStorage.getItem("free_generations") || "0", 10);
      if (count >= 5) {
        router.push("/register?reason=limit");
        return;
      }
      localStorage.setItem("free_generations", String(count + 1));
    }

    try {
      setIsLoading(true);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.user?.id) {
        headers["x-user-id"] = session.user.id;
      }

      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { email?: string; error?: string };
      if (!response.ok || !payload.email) {
        throw new Error(payload.error || "Erreur lors de la génération de l'e-mail.");
      }

      setGeneratedEmail(payload.email);
      toast.success("Email généré avec succès !");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      toast.error(message);
      setGeneratedEmail("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedEmail) return;
    await navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    toast.success("Email copié !");
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <SiteHeader />

      <section className="relative px-6 pb-24 pt-32 md:px-10">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px circle at 8% 8%, rgba(201,169,110,0.10), transparent 65%)",
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="mb-12 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-[0.02em] md:text-6xl">E-mails de relance</h1>
              <p className="text-lg text-[#A0A0A0] md:text-xl">
                Décrivez la situation, FlowEstate rédige l'e-mail.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTemplatesModalMode("load");
                setTemplatesModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-[#A0A0A0] transition hover:border-[#C9A96E]/40 hover:text-[#C9A96E]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Mes templates
            </button>
          </div>

          {userPlan === "starter" && subscriptionStatus === "active" && generationsUsed !== null ? (
            <div className="mb-8 max-w-3xl rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-[#A0A0A0]">Générations utilisées ce mois</span>
                <span className={generationsUsed >= 25 ? "text-red-400" : "text-[#C9A96E]"}>
                  {generationsUsed}/30
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className={`h-2 rounded-full transition-all ${generationsUsed >= 25 ? "bg-red-400" : "bg-[#C9A96E]"}`}
                  style={{ width: `${Math.min(100, (generationsUsed / 30) * 100)}%` }}
                />
              </div>
              {generationsUsed >= 25 ? (
                <p className="mt-2 text-xs text-red-400">
                  Plus que {30 - generationsUsed} génération{30 - generationsUsed > 1 ? "s" : ""}{" "}
                  restante{30 - generationsUsed > 1 ? "s" : ""} —
                  <Link href="/tarifs" className="ml-1 underline">
                    Passer au Pro
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleGenerate}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 overflow-visible"
            >
              <div className="grid gap-6 overflow-visible md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Prénom et nom de l'agent</span>
                  <input
                    type="text"
                    value={form.agentName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agentName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : Thomas Bernard"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Nom de l'agence</span>
                  <input
                    type="text"
                    value={form.agencyName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agencyName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : FlowEstate Lyon"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Téléphone de l'agent</span>
                  <input
                    type="text"
                    value={form.agentPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agentPhone: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : 06 12 34 56 78"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">E-mail de l'agent</span>
                  <input
                    type="email"
                    value={form.agentEmail}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agentEmail: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : thomas@flowestate.fr"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Prénom et nom du prospect</span>
                  <input
                    type="text"
                    value={form.prospectName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, prospectName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : Camille Martin"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">E-mail du prospect</span>
                  <input
                    type="email"
                    value={form.prospectEmail}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, prospectEmail: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : camille@email.com"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Type de bien visité</span>
                  <select
                    value={form.propertyType}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, propertyType: event.target.value as PropertyType }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Appartement</option>
                    <option>Maison</option>
                    <option>Studio</option>
                    <option>Loft</option>
                    <option>Villa</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Localisation du bien</span>
                  <input
                    type="text"
                    value={form.propertyLocation}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, propertyLocation: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : Lyon 6e"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Prix du bien</span>
                  <input
                    type="number"
                    min={0}
                    value={form.propertyPrice}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, propertyPrice: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : 420000"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Date de visite</span>
                  <input
                    type="date"
                    value={form.visitDate}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, visitDate: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Budget du prospect</span>
                  <input
                    type="number"
                    min={0}
                    value={form.prospectBudget}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, prospectBudget: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : 450000"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Situation du prospect</span>
                  <select
                    value={form.prospectSituation}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        prospectSituation: event.target.value as ProspectSituation,
                      }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Premier achat</option>
                    <option>Investissement</option>
                    <option>Résidence secondaire</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Retour après visite</span>
                  <select
                    value={form.visitFeedback}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, visitFeedback: event.target.value as VisitFeedback }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Très intéressé</option>
                    <option>Intéressé</option>
                    <option>Hésitant</option>
                    <option>Sans nouvelles depuis la visite</option>
                    <option>A visité d'autres biens</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Délai de recherche</span>
                  <select
                    value={form.searchDelay}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, searchDelay: event.target.value as SearchDelay }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Urgent (moins d'1 mois)</option>
                    <option>Court terme (1-3 mois)</option>
                    <option>Moyen terme (3-6 mois)</option>
                    <option>Flexible</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ton de l'e-mail</span>
                  <div className="flex gap-2" role="group" aria-label="Ton de l'e-mail">
                    {(["Professionnel", "Chaleureux", "Urgent"] as const).map((toneOption) => {
                      const selected = form.tone === toneOption;
                      return (
                        <button
                          key={toneOption}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setForm((prev) => ({ ...prev, tone: toneOption }))}
                          className={`flex-1 rounded-xl border py-3 px-2 text-center text-sm font-medium transition-all duration-300 ease-out ${
                            selected
                              ? "border-[#C9A96E] bg-[#C9A96E]/10 text-[#C9A96E]"
                              : "border-white/15 bg-transparent text-[#A0A0A0] hover:border-white/25 hover:text-[#C9C9C9]"
                          }`}
                        >
                          {toneOption}
                        </button>
                      );
                    })}
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Longueur</span>
                  <select
                    value={form.length}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, length: event.target.value as EmailLength }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Court (5-8 lignes)</option>
                    <option>Standard (10-15 lignes)</option>
                    <option>Détaillé (15-20 lignes)</option>
                  </select>
                </label>
              </div>

              <div className="mt-6 grid gap-6">
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Objections éventuelles</span>
                  <textarea
                    rows={4}
                    value={form.objections}
                    onChange={(event) => setForm((prev) => ({ ...prev, objections: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : prix trop élevé, travaux à prévoir, trop petit"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Informations personnelles du prospect</span>
                  <textarea
                    rows={4}
                    value={form.personalInfo}
                    onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : jeune couple, 2 enfants, chien, télétravail"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#B8943F] px-8 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-4 w-4 text-[#0A0A0A]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Génération en cours...
                  </>
                ) : (
                  "Générer l'e-mail"
                )}
              </button>
            </form>

            <div className="rounded-2xl border border-[#C9A96E]/20 bg-white/[0.02] p-8">
              <h2 className="text-xl font-semibold text-[#F5F5F0]">Votre e-mail</h2>

              {generatedEmail ? (
                <div className="mt-6">
                  <div className="text-[#A0A0A0] [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2">{children}</p>,
                        br: () => <br />,
                      }}
                    >
                      {generatedEmail}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                    >
                      {copied ? "Copié" : "Copier"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTemplatesModalMode("save");
                        setTemplatesModalOpen(true);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        aria-hidden
                      >
                        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                      Sauvegarder
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 6h16v12H4zM4 7l8 6 8-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-[#F5F5F0]">
                    Votre e-mail personnalisé apparaîtra ici
                  </p>
                  <p className="mt-2 text-sm text-[#A0A0A0]">
                    Remplissez le formulaire et cliquez sur Générer
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <TemplatesModal
        open={templatesModalOpen}
        mode={templatesModalMode}
        type="email"
        initialContent={generatedEmail}
        onClose={() => setTemplatesModalOpen(false)}
        onLoad={(content) => {
          setForm((prev) => ({ ...prev, personalInfo: content }));
          toast.success("Template chargé");
        }}
      />
    </main>
  );
}
