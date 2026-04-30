"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import ReactMarkdown from "react-markdown";
import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from "react";

type PropertyType = "Appartement" | "Maison" | "Studio" | "Loft" | "Villa";
type VisitDuration = "15 min" | "30 min" | "45 min" | "1h" | "1h30" | "2h";
type ProspectReaction =
  | "Très enthousiaste"
  | "Intéressé"
  | "Mitigé"
  | "Déçu"
  | "Non intéressé";
type NextStep = "Deuxième visite" | "Offre en cours" | "Réflexion" | "Abandon";
type ReportTone = "Professionnel" | "Détaillé" | "Synthétique";

function toCapitalizedWords(input: string) {
  return input
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type FormState = {
  prospectName: string;
  prospectEmail: string;
  prospectPhone: string;
  propertyType: PropertyType;
  propertyAddress: string;
  propertyPrice: string;
  visitDate: string;
  visitDuration: VisitDuration;
  prospectReaction: ProspectReaction;
  positivePoints: string;
  negativePoints: string;
  prospectQuestions: string;
  nextStep: NextStep;
  personalInfo: string;
  agentName: string;
  agencyName: string;
  agentPhone: string;
  agentEmail: string;
  tone: ReportTone;
};

const initialForm: FormState = {
  prospectName: "",
  prospectEmail: "",
  prospectPhone: "",
  propertyType: "Appartement",
  propertyAddress: "",
  propertyPrice: "",
  visitDate: "",
  visitDuration: "45 min",
  prospectReaction: "Intéressé",
  positivePoints: "",
  negativePoints: "",
  prospectQuestions: "",
  nextStep: "Réflexion",
  personalInfo: "",
  agentName: "",
  agencyName: "",
  agentPhone: "",
  agentEmail: "",
  tone: "Professionnel",
};

export default function VisitReportPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [generatedReport, setGeneratedReport] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [signaturePreview, setSignaturePreview] = useState<string>("");

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview("");
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    if (!signatureFile) {
      setSignaturePreview("");
      return;
    }
    const url = URL.createObjectURL(signatureFile);
    setSignaturePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [signatureFile]);

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.type.startsWith("image/")) {
      setLogoFile(file);
    }
    event.target.value = "";
  }

  function handleSignatureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.type.startsWith("image/")) {
      setSignatureFile(file);
    }
    event.target.value = "";
  }

  const pdfLines = useMemo(
    () =>
      generatedReport
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((line) => line.replace(/[#*]/g, "").trim())
        .filter((line) => {
          if (!line || line === "---") return false;

          const normalized = line.toLowerCase();
          if (line.toUpperCase() === "COMPTE-RENDU DE VISITE") return false;
          if (normalized.includes("document établi le")) return false;

          const agent = toCapitalizedWords(form.agentName).toLowerCase();
          const agency = toCapitalizedWords(form.agencyName).toLowerCase();
          if (agent && agency) {
            const withHyphen = `${agent} - ${agency}`;
            const withEnDash = `${agent} – ${agency}`;
            if (normalized.includes(withHyphen) || normalized.includes(withEnDash)) return false;
          }

          return true;
        }),
    [generatedReport, form.agentName, form.agencyName]
  );

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerationError("");
    setCopied(false);

    try {
      setIsLoading(true);
      const response = await fetch("/api/generate-compte-rendu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { compteRendu?: string; error?: string };
      if (!response.ok || !payload.compteRendu) {
        throw new Error(payload.error || "Erreur lors de la generation du compte-rendu.");
      }

      setGeneratedReport(payload.compteRendu);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      setGenerationError(message);
      setGeneratedReport("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedReport) return;
    await navigator.clipboard.writeText(generatedReport);
    setCopied(true);
  }

  async function handleDownloadPdf() {
    const element = document.getElementById("pdf-content");
    if (!generatedReport || !element) return;

    try {
      setIsPdfLoading(true);
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = pdfWidth / canvasWidth;
      const scaledHeight = canvasHeight * ratio;

      let position = 0;
      let remainingHeight = scaledHeight;

      while (remainingHeight > 0) {
        const srcY = position / ratio;
        const srcH = Math.min(pdfHeight / ratio, canvasHeight - srcY);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvasWidth;
        pageCanvas.height = srcH * 2;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) throw new Error("Impossible de générer le PDF.");
        ctx.drawImage(canvas, 0, srcY * 2, canvasWidth * 2, srcH * 2, 0, 0, canvasWidth, srcH * 2);

        if (position > 0) pdf.addPage();
        pdf.addImage(
          pageCanvas.toDataURL("image/png"),
          "PNG",
          0,
          0,
          pdfWidth,
          Math.min(pdfHeight, remainingHeight)
        );

        position += pdfHeight / ratio;
        remainingHeight -= pdfHeight;
      }

      pdf.save("compte-rendu-visite.pdf");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      setGenerationError(message);
    } finally {
      setIsPdfLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <header className="fixed inset-x-0 top-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 md:px-10">
          <a href="/" className="text-xl font-semibold tracking-wide text-[#C9A96E]">
            FlowEstate
          </a>
          <nav className="flex items-center gap-8 text-sm font-medium text-[#A0A0A0]">
            <a href="/#fonctionnalites" className="transition hover:text-[#F5F5F0]">
              Fonctionnalites
            </a>
            <a href="/#tarifs" className="transition hover:text-[#F5F5F0]">
              Tarifs
            </a>
            <a href="/#connexion" className="transition hover:text-[#F5F5F0]">
              Connexion
            </a>
          </nav>
        </div>
        <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent" />
      </header>

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
            <h1 className="text-4xl font-semibold tracking-[0.02em] md:text-6xl">
              Compte-rendu de visite
            </h1>
            <p className="text-lg text-[#A0A0A0] md:text-xl">
              Décrivez la visite, FlowEstate rédige le compte-rendu.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleGenerate}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-8"
            >
              <div className="grid gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Prénom et nom du prospect</span>
                  <input
                    type="text"
                    value={form.prospectName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, prospectName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Téléphone du prospect</span>
                  <input
                    type="text"
                    value={form.prospectPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, prospectPhone: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                  <span className="text-sm text-[#A0A0A0]">Adresse du bien</span>
                  <input
                    type="text"
                    value={form.propertyAddress}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, propertyAddress: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                  <span className="text-sm text-[#A0A0A0]">Durée de la visite</span>
                  <select
                    value={form.visitDuration}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, visitDuration: event.target.value as VisitDuration }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  >
                    <option>15 min</option>
                    <option>30 min</option>
                    <option>45 min</option>
                    <option>1h</option>
                    <option>1h30</option>
                    <option>2h</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Réaction générale du prospect</span>
                  <select
                    value={form.prospectReaction}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        prospectReaction: event.target.value as ProspectReaction,
                      }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  >
                    <option>Très enthousiaste</option>
                    <option>Intéressé</option>
                    <option>Mitigé</option>
                    <option>Déçu</option>
                    <option>Non intéressé</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Prochaine étape</span>
                  <select
                    value={form.nextStep}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, nextStep: event.target.value as NextStep }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  >
                    <option>Deuxième visite</option>
                    <option>Offre en cours</option>
                    <option>Réflexion</option>
                    <option>Abandon</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ton du compte-rendu</span>
                  <select
                    value={form.tone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, tone: event.target.value as ReportTone }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  >
                    <option>Professionnel</option>
                    <option>Détaillé</option>
                    <option>Synthétique</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Nom de l&apos;agent</span>
                  <input
                    type="text"
                    value={form.agentName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agentName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Agence</span>
                  <input
                    type="text"
                    value={form.agencyName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, agencyName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-6">
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Points positifs relevés</span>
                  <textarea
                    rows={4}
                    value={form.positivePoints}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, positivePoints: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Points négatifs relevés</span>
                  <textarea
                    rows={4}
                    value={form.negativePoints}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, negativePoints: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Questions posées par le prospect</span>
                  <textarea
                    rows={4}
                    value={form.prospectQuestions}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, prospectQuestions: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Informations personnelles du prospect</span>
                  <textarea
                    rows={4}
                    value={form.personalInfo}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, personalInfo: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  />
                </label>

                <div className="grid gap-6 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-[#A0A0A0]">Logo de l'agence</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="w-full cursor-pointer rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 file:mr-4 file:rounded-lg file:border-0 file:bg-[#C9A96E]/10 file:px-4 file:py-2 file:text-[#C9A96E] file:hover:opacity-90 focus:border-[#C9A96E]"
                    />
                    {logoPreview ? (
                      <div className="w-fit overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-2">
                        <img src={logoPreview} alt="Logo agence" className="h-16 w-16 object-contain" />
                      </div>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-[#A0A0A0]">Signature électronique</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureChange}
                      className="w-full cursor-pointer rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 file:mr-4 file:rounded-lg file:border-0 file:bg-[#C9A96E]/10 file:px-4 file:py-2 file:text-[#C9A96E] file:hover:opacity-90 focus:border-[#C9A96E]"
                    />
                    {signaturePreview ? (
                      <div className="w-fit overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-2">
                        <img
                          src={signaturePreview}
                          alt="Signature électronique"
                          className="h-16 w-24 object-contain"
                        />
                      </div>
                    ) : null}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#B8943F] px-8 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? "Génération en cours..." : "Générer le compte-rendu"}
              </button>
            </form>

            <div className="rounded-2xl border border-[#C9A96E]/20 bg-white/[0.02] p-8">
              <h2 className="text-xl font-semibold text-[#F5F5F0]">Votre compte-rendu</h2>
              {generationError ? (
                <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {generationError}
                </p>
              ) : null}
              {generatedReport ? (
                <div className="mt-6">
                  <div className="text-[#A0A0A0] [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6">
                    <ReactMarkdown>{generatedReport}</ReactMarkdown>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-8 inline-flex items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                  >
                    {copied ? "Copié" : "Copier"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isPdfLoading}
                    className="mt-4 inline-flex items-center justify-center rounded-full border border-[#C9A96E] bg-[#C9A96E] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition-all duration-300 hover:opacity-90 disabled:opacity-50"
                  >
                    {isPdfLoading ? "Génération du PDF..." : "Télécharger en PDF"}
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
                        d="M5 5h14v14H5zM8 9h8M8 13h8M8 17h5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-[#F5F5F0]">
                    Votre compte-rendu apparaîtra ici
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

      <div className="fixed -left-[9999px] top-0 z-[-1]">
        <div
          id="pdf-content"
          style={{
            width: "794px",
            background: "#ffffff",
            color: "#1f1f1f",
            fontFamily: "Arial, sans-serif",
            padding: "40px 48px 20px 48px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              borderBottom: "1px solid #d9d9d9",
              paddingBottom: "16px",
            }}
          >
            <div style={{ width: "130px", height: "40px" }}>
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo agence"
                  style={{ maxHeight: "40px", maxWidth: "130px", objectFit: "contain" }}
                />
              ) : null}
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "21px" }}>COMPTE-RENDU DE VISITE</div>
              <div style={{ marginTop: "4px", fontSize: "13px", color: "#555" }}>{form.agencyName}</div>
            </div>
            <div style={{ width: "130px", textAlign: "right", fontSize: "12px", color: "#555" }}>
              {new Date().toLocaleDateString("fr-FR")}
            </div>
          </div>

          <div style={{ marginTop: "24px" }}>
            {pdfLines.map((line, idx) => {
              const isHeading = line.endsWith(":") || line === line.toUpperCase();
              return (
                <p
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${line}-${idx}`}
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: isHeading ? "16px" : "14px",
                    fontWeight: isHeading ? 700 : 400,
                    lineHeight: 1.45,
                    pageBreakAfter: isHeading ? "avoid" : "auto",
                    breakAfter: isHeading ? "avoid" : "auto",
                    pageBreakBefore: !isHeading ? "avoid" : "auto",
                    breakBefore: !isHeading ? "avoid" : "auto",
                  }}
                >
                  {line}
                </p>
              );
            })}
          </div>

          <div style={{ marginTop: "10px", marginLeft: "auto", width: "250px", textAlign: "right" }}>
            <div style={{ borderTop: "1px solid #d9d9d9", marginBottom: "10px" }} />
            <div style={{ fontSize: "12px", lineHeight: 1.4 }}>{toCapitalizedWords(form.agentName)}</div>
            <div style={{ fontSize: "12px", lineHeight: 1.4 }}>{toCapitalizedWords(form.agencyName)}</div>
            <div style={{ fontSize: "12px", lineHeight: 1.4 }}>{form.agentPhone}</div>
            <div style={{ fontSize: "12px", lineHeight: 1.4 }}>{form.agentEmail}</div>
            {signaturePreview ? (
              <img
                src={signaturePreview}
                alt="Signature"
                style={{
                  marginTop: "6px",
                  marginLeft: "auto",
                  maxHeight: "70px",
                  maxWidth: "160px",
                  objectFit: "contain",
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

    </main>
  );
}
