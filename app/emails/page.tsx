"use client";

import ReactMarkdown from "react-markdown";
import { FormEvent, useState } from "react";

import SiteHeader from "@/components/site-header";

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

export default function EmailsGeneratorPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState("");

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerationError("");
    setCopied(false);

    try {
      setIsLoading(true);
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { email?: string; error?: string };
      if (!response.ok || !payload.email) {
        throw new Error(payload.error || "Erreur lors de la generation de l'email.");
      }

      setGeneratedEmail(payload.email);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      setGenerationError(message);
      setGeneratedEmail("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedEmail) return;
    await navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
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
          <div className="mb-12 max-w-3xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-[0.02em] md:text-6xl">Emails de relance</h1>
            <p className="text-lg text-[#A0A0A0] md:text-xl">
              Décrivez la situation, FlowEstate rédige l&apos;email.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleGenerate}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-8"
            >
              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Prénom et nom de l&apos;agent</span>
                  <input
                    type="text"
                    value={form.agentName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agentName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: Thomas Bernard"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Nom de l&apos;agence</span>
                  <input
                    type="text"
                    value={form.agencyName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agencyName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: FlowEstate Lyon"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Téléphone de l&apos;agent</span>
                  <input
                    type="text"
                    value={form.agentPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agentPhone: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: 06 12 34 56 78"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Email de l&apos;agent</span>
                  <input
                    type="email"
                    value={form.agentEmail}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agentEmail: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: thomas@flowestate.fr"
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
                    placeholder="Ex: Camille Martin"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Email du prospect</span>
                  <input
                    type="email"
                    value={form.prospectEmail}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, prospectEmail: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: camille@email.com"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Type de bien visité</span>
                  <select
                    value={form.propertyType}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, propertyType: event.target.value as PropertyType }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                    placeholder="Ex: Lyon 6e"
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
                    placeholder="Ex: 420000"
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
                    placeholder="Ex: 450000"
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
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  >
                    <option>Urgent (moins d'1 mois)</option>
                    <option>Court terme (1-3 mois)</option>
                    <option>Moyen terme (3-6 mois)</option>
                    <option>Flexible</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ton de l'email</span>
                  <select
                    value={form.tone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, tone: event.target.value as EmailTone }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  >
                    <option>Professionnel</option>
                    <option>Chaleureux</option>
                    <option>Urgent</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Longueur</span>
                  <select
                    value={form.length}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, length: event.target.value as EmailLength }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                    placeholder="Ex: prix trop élevé, travaux à prévoir, trop petit"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Informations personnelles du prospect</span>
                  <textarea
                    rows={4}
                    value={form.personalInfo}
                    onChange={(event) => setForm((prev) => ({ ...prev, personalInfo: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: jeune couple, 2 enfants, chien, télétravail"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#B8943F] px-8 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Génération en cours..." : "Générer l'email"}
              </button>
            </form>

            <div className="rounded-2xl border border-[#C9A96E]/20 bg-white/[0.02] p-8">
              <h2 className="text-xl font-semibold text-[#F5F5F0]">Votre email</h2>
              {generationError ? (
                <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {generationError}
                </p>
              ) : null}

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
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-8 inline-flex items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                  >
                    {copied ? "Copié" : "Copier"}
                  </button>
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
                    Votre email personnalisé apparaîtra ici
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
    </main>
  );
}
