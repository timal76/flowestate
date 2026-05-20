"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import SiteHeader from "@/components/site-header";
import { supabase } from "@/lib/supabase";

type TargetBuyer =
  | "Investisseur locatif"
  | "Primo-accédant"
  | "Résidence principale"
  | "Résidence secondaire"
  | "Tout profil";

type Tone = "Professionnel" | "Chaleureux" | "Percutant";

type TabId = "leboncoin" | "seloger" | "siteAgence";

type AnnonceBlock = { titre: string; corps: string };

type GeneratedResult = {
  leboncoin: AnnonceBlock;
  seloger: AnnonceBlock;
  siteAgence: AnnonceBlock;
};

type FormState = {
  angle: string;
  targetBuyer: TargetBuyer;
  tone: Tone;
  priceFrom: string;
  additionalInfo: string;
};

const initialForm: FormState = {
  angle: "",
  targetBuyer: "Tout profil",
  tone: "Professionnel",
  priceFrom: "",
  additionalInfo: "",
};

const selectFieldClassName =
  "w-full overflow-visible rounded-xl border border-white/15 bg-[#121212] pl-4 pr-10 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]";

const tabs: { id: TabId; label: string }[] = [
  { id: "leboncoin", label: "Leboncoin" },
  { id: "seloger", label: "SeLoger" },
  { id: "siteAgence", label: "Site propre" },
];

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return dataUrl.split(",")[1] ?? "";
}

export default function ProgrammesNeufsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("leboncoin");
  const [copiedTab, setCopiedTab] = useState<TabId | null>(null);
  const [generationsUsed, setGenerationsUsed] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState<string>("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("");

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
        .select("plan, subscription_status")
        .eq("id", session.user.id)
        .single();

      if (!data) return;

      setUserPlan(typeof data.plan === "string" ? data.plan : "");
      setSubscriptionStatus(
        typeof data.subscription_status === "string" ? data.subscription_status : "",
      );

      const { count } = await supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .gte("created_at", fromIso);

      setGenerationsUsed(count ?? 0);
    };

    void loadProfile();
  }, [sessionStatus, session?.user?.id]);

  const acceptPdf = useCallback((file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Le PDF ne doit pas dépasser 20 Mo.");
      return;
    }
    setPdfFile(file);
    setResult(null);
    setGenerationError(null);
  }, []);

  function handlePdfInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    acceptPdf(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptPdf(event.dataTransfer.files?.[0]);
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerationError(null);
    setCopiedTab(null);

    if (!pdfFile) {
      toast.error("Veuillez ajouter une plaquette PDF.");
      return;
    }
    if (!form.angle.trim()) {
      toast.error("Veuillez renseigner l'angle souhaité.");
      return;
    }

    if (sessionStatus === "loading") return;

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
      const pdfBase64 = await fileToBase64(pdfFile);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.user?.id) {
        headers["x-user-id"] = session.user.id;
      }

      const response = await fetch("/api/generate-programme-neuf", {
        method: "POST",
        headers,
        body: JSON.stringify({
          pdfBase64,
          angle: form.angle,
          targetBuyer: form.targetBuyer,
          tone: form.tone,
          priceFrom: form.priceFrom || undefined,
          additionalInfo: form.additionalInfo || undefined,
        }),
      });

      const payload = (await response.json()) as GeneratedResult & { error?: string; message?: string };

      if (!response.ok) {
        const errorText = `${payload?.error ?? ""} ${payload?.message ?? ""}`.toLowerCase();
        if (response.status === 529 || errorText.includes("overloaded")) {
          const message = "Le service est momentanément surchargé. Réessayez dans quelques secondes.";
          setGenerationError(message);
          toast.error(message);
        } else {
          const message = payload.error || "Une erreur est survenue. Veuillez réessayer.";
          setGenerationError(message);
          toast.error(message);
        }
        return;
      }

      if (!payload.leboncoin || !payload.seloger || !payload.siteAgence) {
        setGenerationError("Une erreur est survenue. Veuillez réessayer.");
        toast.error("Une erreur est survenue. Réessayez.");
        return;
      }

      setResult({
        leboncoin: payload.leboncoin,
        seloger: payload.seloger,
        siteAgence: payload.siteAgence,
      });
      setActiveTab("leboncoin");
      setGenerationError(null);
      toast.success("Les 3 annonces ont été générées !");
    } catch {
      setGenerationError("Une erreur est survenue. Veuillez réessayer.");
      toast.error("Une erreur est survenue. Réessayez.");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(tab: TabId) {
    if (!result) return;
    const block = result[tab];
    const text = `${block.titre}\n\n${block.corps}`;
    await navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    toast.success("Annonce copiée !");
  }

  const activeBlock = result ? result[activeTab] : null;

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
            <h1 className="text-4xl font-semibold tracking-[0.02em] md:text-6xl">Programmes neufs</h1>
            <p className="text-lg text-[#A0A0A0] md:text-xl">
              Générez 3 annonces différenciantes à partir d&apos;une plaquette promoteur
            </p>
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

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            <form
              onSubmit={handleGenerate}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 overflow-visible"
            >
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-[#C9A96E] bg-[#C9A96E]/10"
                    : "border-white/15 bg-[#121212]/50 hover:border-white/25"
                }`}
              >
                <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path
                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#F5F5F0]">
                  Glissez-déposez votre plaquette PDF ici
                </p>
                <p className="mt-1 text-xs text-[#A0A0A0]">ou</p>
                <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-full border border-[#C9A96E] bg-transparent px-5 py-2 text-sm font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]">
                  Choisir un fichier
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={handlePdfInputChange}
                  />
                </label>
                {pdfFile ? (
                  <p className="mt-4 text-sm text-[#C9A96E]">{pdfFile.name}</p>
                ) : (
                  <p className="mt-4 text-xs text-[#A0A0A0]">PDF uniquement — 20 Mo max</p>
                )}
              </div>

              <div className="mt-8 grid gap-6">
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Angle souhaité</span>
                  <textarea
                    rows={4}
                    required
                    value={form.angle}
                    onChange={(event) => setForm((prev) => ({ ...prev, angle: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : investisseurs LMNP cherchant du rendement, familles primo-accédantes, résidence secondaire bord de mer..."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Type d&apos;acquéreur cible</span>
                  <select
                    value={form.targetBuyer}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        targetBuyer: event.target.value as TargetBuyer,
                      }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Investisseur locatif</option>
                    <option>Primo-accédant</option>
                    <option>Résidence principale</option>
                    <option>Résidence secondaire</option>
                    <option>Tout profil</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ton souhaité</span>
                  <select
                    value={form.tone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, tone: event.target.value as Tone }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Professionnel</option>
                    <option>Chaleureux</option>
                    <option>Percutant</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Prix à partir de (optionnel)</span>
                  <input
                    type="text"
                    value={form.priceFrom}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, priceFrom: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : 249 000 €"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Informations complémentaires</span>
                  <textarea
                    rows={4}
                    value={form.additionalInfo}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, additionalInfo: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Infos non présentes dans le PDF : date de livraison, vue mer depuis certains lots, places de parking incluses..."
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
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Génération en cours...
                  </>
                ) : (
                  "Générer les 3 annonces"
                )}
              </button>
            </form>

            <div className="flex h-full min-h-[20rem] flex-col rounded-2xl border border-[#C9A96E]/20 bg-white/[0.02] p-8 lg:min-h-0">
              <h2 className="text-xl font-semibold text-[#F5F5F0]">Vos annonces</h2>

              {generationError ? (
                <div
                  role="alert"
                  className="mt-8 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
                >
                  <span aria-hidden>⚠️</span>
                  <span>{generationError}</span>
                </div>
              ) : result ? (
                <div className="mt-6 flex flex-1 flex-col">
                  <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
                    {tabs.map((tab) => {
                      const selected = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                            selected
                              ? "border border-[#C9A96E] bg-[#C9A96E]/10 text-[#C9A96E]"
                              : "border border-white/15 text-[#A0A0A0] hover:border-white/25 hover:text-[#F5F5F0]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {activeBlock ? (
                    <div className="mt-6 flex flex-1 flex-col overflow-auto">
                      <h3 className="text-lg font-semibold text-[#C9A96E]">{activeBlock.titre}</h3>
                      <p className="mt-4 whitespace-pre-wrap text-[#A0A0A0] leading-relaxed">
                        {activeBlock.corps}
                      </p>
                      <div className="mt-8">
                        <button
                          type="button"
                          onClick={() => void handleCopy(activeTab)}
                          className="inline-flex items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                        >
                          {copiedTab === activeTab ? "Copié" : "Copier"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-6 py-12 text-center">
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
                        d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-[#F5F5F0]">
                    Vos 3 annonces apparaîtront ici
                  </p>
                  <p className="mt-2 text-sm text-[#A0A0A0]">
                    Leboncoin, SeLoger et site propre
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
