"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import SiteHeader from "@/components/site-header";
import { supabase } from "@/lib/supabase";

type Tone = "Professionnel" | "Chaleureux" | "Percutant";

type TabId = "leboncoin" | "seloger" | "siteAgence" | "instagram" | "linkedin" | "facebook";

type PlatformSelection = {
  leboncoin: boolean;
  seloger: boolean;
  siteAgence: boolean;
  instagram: boolean;
  linkedin: boolean;
  facebook: boolean;
};

type AnnonceBlock = { titre: string; corps: string };

type AnnoncesSet = {
  leboncoin: AnnonceBlock;
  seloger: AnnonceBlock;
  siteAgence: AnnonceBlock;
};

type ScoringResult = {
  score: number;
  verdict: string;
  points_forts: string[];
  suggestions: string[];
};

type GeneratedResult = {
  programme: AnnoncesSet;
  lot: AnnoncesSet | null;
  scoring: ScoringResult | null;
  extractedData?: Record<string, unknown>;
};

type FormState = {
  address: string;
  angle: string;
  prospectProfile: string;
  tone: Tone;
  priceFrom: string;
  additionalInfo: string;
  competitorAds: string;
};

type AngleSuggestion = {
  angle: string;
  prospectProfile: string;
  label: string;
  emoji: string;
};

const initialForm: FormState = {
  address: "",
  angle: "",
  prospectProfile: "",
  tone: "Professionnel",
  priceFrom: "",
  additionalInfo: "",
  competitorAds: "",
};

const ACCEPTED_ANNEX_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const MAX_ANNEX_FILES = 5;
const MAX_ANNEX_SIZE = 10 * 1024 * 1024;

const selectFieldClassName =
  "w-full overflow-visible rounded-xl border border-white/15 bg-[#121212] pl-4 pr-10 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]";

const tabs: { id: TabId; label: string }[] = [
  { id: "leboncoin", label: "Leboncoin" },
  { id: "seloger", label: "SeLoger" },
  { id: "siteAgence", label: "Site propre" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
];

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const base64 = dataUrl.split(",")[1] ?? "";

  return base64;
}

const clean = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^[•·◦‣⁃▪▸►→]\s+/gm, "")
    .replace(/^\s*[\u2022\u2023\u25E6\u2043\u2219]\s*/gm, "")
    .replace(/^\s*[-–—]\s+/gm, "")
    .replace(/^\s*\*\s+/gm, "")
    .replace(/^\s*✓\s+/gm, "")
    .replace(/^\s*✗\s+/gm, "")
    .replace(/^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜ\s]{4,}\s*:/gm, "")
    .trim();
};

async function compressPdfToBase64(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageImages: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      pageImages.push(canvas.toDataURL("image/jpeg", 0.65).split(",")[1]);
    }
    return JSON.stringify({ type: "compressed_pages", pages: pageImages });
  } catch {
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.readAsDataURL(file);
    });
  }
}

async function generateAngleSuggestions(
  extractedData: Record<string, unknown>,
): Promise<AngleSuggestion[]> {
  const response = await fetch("/api/suggest-angles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ extractedData }),
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { suggestions: AngleSuggestion[] };
  return data.suggestions || [];
}

export default function ProgrammesNeufsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [annexFiles, setAnnexFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingAnnex, setIsDraggingAnnex] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [activeProgrammeTab, setActiveProgrammeTab] = useState<TabId>("leboncoin");
  const [activeLotTab, setActiveLotTab] = useState<TabId>("leboncoin");
  const [copiedProgrammeTab, setCopiedProgrammeTab] = useState<TabId | null>(null);
  const [copiedLotTab, setCopiedLotTab] = useState<TabId | null>(null);
  const [generationsUsed, setGenerationsUsed] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState<string>("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("");
  const [extractedProgramData, setExtractedProgramData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [showNewLot, setShowNewLot] = useState(false);
  const [newLotFiles, setNewLotFiles] = useState<File[]>([]);
  const [lotReference, setLotReference] = useState("");
  const [isLoadingNewLot, setIsLoadingNewLot] = useState(false);
  const [isDraggingNewLot, setIsDraggingNewLot] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [platforms, setPlatforms] = useState<PlatformSelection>({
    leboncoin: true,
    seloger: true,
    siteAgence: true,
    instagram: false,
    linkedin: false,
    facebook: false,
  });
  const [angleSuggestions, setAngleSuggestions] = useState<AngleSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    const checkAccess = async () => {
      const { data } = await supabase
        .from("users")
        .select("plan, subscription_status")
        .eq("id", session.user.id)
        .single();

      const hasAccess =
        data?.plan === "expert" &&
        (data?.subscription_status === "active" ||
          data?.subscription_status === "trialing" ||
          data?.subscription_status === "trial");

      if (!hasAccess) {
        setShowUpgrade(true);
      }
    };

    void checkAccess();
  }, [session?.user?.id]);

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

    setAngleSuggestions([]);
    setIsLoadingSuggestions(true);

    void (async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        const fileName = `plaquettes/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("plaquettes")
          .upload(fileName, file, { contentType: "application/pdf" });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage.from("plaquettes").getPublicUrl(fileName);

        const extractRes = await fetch("/api/extract-programme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfUrl: urlData.publicUrl }),
        });

        if (extractRes.ok) {
          const extractJson = (await extractRes.json()) as {
            extractedData: Record<string, unknown>;
          };
          console.log("[debug extractedData]", extractJson.extractedData);
          const suggestions = await generateAngleSuggestions(extractJson.extractedData);
          console.log("[debug suggestions]", suggestions);
          setAngleSuggestions(suggestions);
        }

        void supabaseClient.storage.from("plaquettes").remove([fileName]);
      } catch (err) {
        console.error("Suggestions error", err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    })();

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

  const acceptAnnexes = useCallback((incoming: FileList | File[] | undefined) => {
    if (!incoming?.length) return;
    const files = Array.from(incoming);
    const valid: File[] = [];

    for (const file of files) {
      if (!(ACCEPTED_ANNEX_TYPES as readonly string[]).includes(file.type)) {
        toast.error(`Format non accepté : ${file.name}`);
        continue;
      }
      if (file.size > MAX_ANNEX_SIZE) {
        toast.error(`${file.name} dépasse 10 Mo.`);
        continue;
      }
      valid.push(file);
    }

    if (!valid.length) return;

    setAnnexFiles((prev) => {
      const merged = [...prev, ...valid].slice(0, MAX_ANNEX_FILES);
      if (prev.length + valid.length > MAX_ANNEX_FILES) {
        toast.error("Maximum 5 fichiers annexes.");
      }
      return merged;
    });
    setResult(null);
    setGenerationError(null);
  }, []);

  function handleAnnexInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    acceptAnnexes(event.target.files ?? undefined);
    event.target.value = "";
  }

  function handleAnnexDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingAnnex(true);
  }

  function handleAnnexDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingAnnex(false);
  }

  function handleAnnexDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingAnnex(false);
    acceptAnnexes(event.dataTransfer.files);
  }

  function handleRemoveAnnex(index: number) {
    setAnnexFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const acceptNewLotFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const valid = files.filter((file) =>
      ACCEPTED_ANNEX_TYPES.includes(file.type as (typeof ACCEPTED_ANNEX_TYPES)[number]),
    );
    if (valid.length !== files.length) {
      toast.error("Formats acceptés : PDF, JPEG, PNG, WebP.");
    }
    const oversized = valid.filter((file) => file.size > MAX_ANNEX_SIZE);
    if (oversized.length > 0) {
      toast.error("Chaque fichier doit faire 10 Mo maximum.");
      return;
    }
    setNewLotFiles((prev) => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_ANNEX_FILES) {
        toast.error("Maximum 5 fichiers annexes.");
        return prev;
      }
      return combined;
    });
  }, []);

  function handleNewLotAnnexInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) acceptNewLotFiles(event.target.files);
    event.target.value = "";
  }

  function handleNewLotAnnexDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingNewLot(true);
  }

  function handleNewLotAnnexDragLeave() {
    setIsDraggingNewLot(false);
  }

  function handleNewLotAnnexDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingNewLot(false);
    acceptNewLotFiles(event.dataTransfer.files);
  }

  function handleRemoveNewLotFile(index: number) {
    setNewLotFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGenerateNewLot() {
    if (newLotFiles.length === 0 || !extractedProgramData) return;

    setIsLoadingNewLot(true);
    try {
      const annexes = await Promise.all(
        newLotFiles.map(async (file) => ({
          data: await fileToBase64(file),
          mediaType: file.type,
          name: file.name,
        })),
      );

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.user?.id) headers["x-user-id"] = session.user.id;

      const response = await fetch("/api/generate-programme-neuf", {
        method: "POST",
        headers,
        body: JSON.stringify({
          extractedProgramData,
          annexes,
          lotReference: lotReference || undefined,
          angle: form.angle,
          prospectProfile: form.prospectProfile || undefined,
          tone: form.tone,
          priceFrom: form.priceFrom || undefined,
          additionalInfo: form.additionalInfo || undefined,
          competitorAds: form.competitorAds || undefined,
          address: form.address || undefined,
        }),
      });

      const payload = (await response.json()) as GeneratedResult & { error?: string };

      if (!response.ok) {
        if (response.status === 403 && payload?.error?.includes("plan Expert")) {
          setGenerationError("plan Expert");
          toast.error("Cette feature est réservée au plan Expert.");
          return;
        }
        toast.error(payload.error || "Erreur lors de la génération.");
        return;
      }

      setResult({
        programme: payload.programme,
        lot: payload.lot || null,
        scoring: payload.scoring || null,
      });
      setShowNewLot(false);
      setNewLotFiles([]);
      setLotReference("");
      toast.success("Annonces générées pour le nouveau lot !");
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoadingNewLot(false);
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerationError(null);
    setCopiedProgrammeTab(null);
    setCopiedLotTab(null);

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

      let extractedDataFromPdf: Record<string, unknown> | undefined;
      let pdfBase64: string | undefined;

      if (pdfFile.size > 3 * 1024 * 1024) {
        toast.loading("Upload de la plaquette...", { id: "upload" });

        try {
          const { createClient } = await import("@supabase/supabase-js");
          const supabaseClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          );

          const fileName = `plaquettes/${Date.now()}_${pdfFile.name}`;
          const { error: uploadError } = await supabaseClient.storage
            .from("plaquettes")
            .upload(fileName, pdfFile, { contentType: "application/pdf" });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabaseClient.storage.from("plaquettes").getPublicUrl(fileName);

          toast.dismiss("upload");
          toast.loading("Analyse de la plaquette...", { id: "extract" });

          const extractRes = await fetch("/api/extract-programme", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdfUrl: urlData.publicUrl }),
          });

          toast.dismiss("extract");

          if (extractRes.ok) {
            const extractJson = (await extractRes.json()) as {
              extractedData: Record<string, unknown>;
            };
            extractedDataFromPdf = extractJson.extractedData;
            toast.success("Plaquette analysée !");

            setIsLoadingSuggestions(true);
            const suggestions = await generateAngleSuggestions(extractedDataFromPdf);
            setAngleSuggestions(suggestions);
            setIsLoadingSuggestions(false);

            void supabaseClient.storage.from("plaquettes").remove([fileName]);
          }
        } catch (err) {
          toast.dismiss("upload");
          toast.dismiss("extract");
          console.error("Upload error:", err);
          toast.error("Erreur upload. Réessayez.");
          setIsLoading(false);
          return;
        }
      } else {
        pdfBase64 = await fileToBase64(pdfFile);
      }

      const annexes =
        annexFiles.length > 0
          ? await Promise.all(
              annexFiles.map(async (file) => ({
                data: await fileToBase64(file),
                mediaType: file.type,
                name: file.name,
              })),
            )
          : undefined;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.user?.id) {
        headers["x-user-id"] = session.user.id;
      }

      console.log("[debug] extractedDataFromPdf:", !!extractedDataFromPdf);
      console.log("[debug] pdfBase64:", !!pdfBase64);
      console.log("[debug] body keys:", extractedDataFromPdf ? "extractedProgramData" : "pdfBase64");

      const response = await fetch("/api/generate-programme-neuf", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...(extractedDataFromPdf
            ? { extractedProgramData: extractedDataFromPdf }
            : { pdfBase64 }),
          address: form.address.trim() || undefined,
          annexes,
          angle: form.angle,
          prospectProfile: form.prospectProfile || undefined,
          competitorAds: form.competitorAds || undefined,
          tone: form.tone,
          priceFrom: form.priceFrom || undefined,
          additionalInfo: form.additionalInfo || undefined,
          platforms: Object.entries(platforms)
            .filter(([, v]) => v)
            .map(([k]) => k),
        }),
      });

      const payload = (await response.json()) as GeneratedResult & { error?: string; message?: string };

      if (!response.ok) {
        const errorText = `${payload?.error ?? ""} ${payload?.message ?? ""}`.toLowerCase();
        if (response.status === 529 || errorText.includes("overloaded")) {
          const message = "Le service est momentanément surchargé. Réessayez dans quelques secondes.";
          setGenerationError(message);
          toast.error(message);
        } else if (response.status === 403 && payload?.error?.includes("plan Expert")) {
          setGenerationError("plan Expert");
          toast.error("Cette feature est réservée au plan Expert.");
        } else {
          const message = payload.error || "Une erreur est survenue. Veuillez réessayer.";
          setGenerationError(message);
          toast.error(message);
        }
        return;
      }

      const selectedPlatforms = Object.entries(platforms)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const hasAtLeastOneProgramme = selectedPlatforms.some(
        (p) => (payload.programme as Record<string, unknown>)?.[p],
      );

      if (!hasAtLeastOneProgramme) {
        setGenerationError("Une erreur est survenue. Veuillez réessayer.");
        toast.error("Une erreur est survenue. Réessayez.");
        return;
      }

      setResult({
        programme: payload.programme,
        lot: payload.lot ?? null,
        scoring: payload.scoring ?? null,
      });
      if (payload.extractedData) {
        setExtractedProgramData(payload.extractedData);
      }
      setActiveProgrammeTab("leboncoin");
      setActiveLotTab("leboncoin");
      setGenerationError(null);
      const selectedCount = Object.values(platforms).filter(Boolean).length;
      toast.success(`Les ${selectedCount} annonces ont été générées !`);
    } catch {
      setGenerationError("Une erreur est survenue. Veuillez réessayer.");
      toast.error("Une erreur est survenue. Réessayez.");
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(section: "programme" | "lot", tab: TabId) {
    if (!result) return;
    const annonces = section === "programme" ? result.programme : result.lot;
    if (!annonces) return;
    const block = (annonces as Partial<Record<TabId, AnnonceBlock>>)[tab];
    if (!block) return;
    const text = `${block.titre}\n\n${clean(block.corps)}`;
    await navigator.clipboard.writeText(text);
    if (section === "programme") {
      setCopiedProgrammeTab(tab);
      setCopiedLotTab(null);
    } else {
      setCopiedLotTab(tab);
      setCopiedProgrammeTab(null);
    }
    toast.success("Annonce copiée !");
  }

  function handleExportPDF() {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const addSection = (
      platformTitle: string,
      block: { titre: string; corps: string },
      isNew: boolean,
    ) => {
      if (isNew) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(201, 169, 110);
      doc.text(platformTitle, margin, y);
      y += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      const titreLines = doc.splitTextToSize(block.titre, maxWidth);
      doc.text(titreLines, margin, y);
      y += titreLines.length * 6 + 4;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const corpsLines = doc.splitTextToSize(clean(block.corps), maxWidth);

      corpsLines.forEach((line: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 5;
      });

      y += 10;
    };

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(201, 169, 110);
    doc.text("FlowEstate — Annonces générées", margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, margin, y);
    y += 15;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("PROGRAMME GLOBAL", margin, y);
    y += 10;

    addSection("Leboncoin", result.programme.leboncoin, false);
    addSection("SeLoger", result.programme.seloger, true);
    addSection("Site propre", result.programme.siteAgence, true);

    if (result.lot) {
      doc.addPage();
      y = 20;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("LOT SPÉCIFIQUE", margin, y);
      y += 10;

      addSection("Leboncoin", result.lot.leboncoin, false);
      addSection("SeLoger", result.lot.seloger, true);
      addSection("Site propre", result.lot.siteAgence, true);
    }

    doc.save(`FlowEstate-Annonces-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF exporté !");
  }

  const activeTabs = tabs.filter((tab) => platforms[tab.id]);
  const selectedCount = Object.values(platforms).filter(Boolean).length;
  const activeProgrammeBlock = result
    ? (result.programme as Partial<Record<TabId, AnnonceBlock>>)[activeProgrammeTab] ?? null
    : null;
  const activeLotBlock = result?.lot
    ? (result.lot as Partial<Record<TabId, AnnonceBlock>>)[activeLotTab] ?? null
    : null;

  if (showUpgrade) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
        <SiteHeader />
        <section className="flex min-h-screen items-center justify-center px-6">
          <div className="mx-auto max-w-lg space-y-6 text-center">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 text-[#C9A96E]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={28}
                height={28}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-[#F5F5F0]">Programmes neufs</h1>
            <p className="text-lg text-[#A0A0A0]">
              Cette feature est réservée au plan Expert. Analysez une plaquette promoteur PDF et
              générez 6 annonces différenciantes en quelques secondes.
            </p>
            <div className="space-y-3">
              <a
                href="/tarifs"
                className="inline-flex w-full items-center justify-center rounded-full bg-[#B8943F] px-8 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90"
              >
                Passer au plan Expert — 299,99€/mois
              </a>
              <a
                href="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-full border border-white/10 px-8 py-3 text-sm font-medium text-[#A0A0A0] transition hover:border-white/20 hover:text-[#F5F5F0]"
              >
                Retour au dashboard
              </a>
            </div>
            <p className="text-xs text-[#555]">14 jours gratuits — sans engagement</p>
          </div>
        </section>
      </main>
    );
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
            <h1 className="text-4xl font-semibold tracking-[0.02em] md:text-6xl">Programmes neufs</h1>
            <p className="text-lg text-[#A0A0A0] md:text-xl">
              Générez jusqu&apos;à 6 annonces différenciantes à partir d&apos;une plaquette promoteur
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

              <div className="mt-6">
                <h3 className="text-sm font-medium text-[#F5F5F0]">Documents annexes (optionnel)</h3>
                <p className="mt-1 text-xs text-[#A0A0A0]">
                  Plans, vues 3D, photos — jusqu&apos;à 5 fichiers
                </p>
                <div
                  onDragOver={handleAnnexDragOver}
                  onDragLeave={handleAnnexDragLeave}
                  onDrop={handleAnnexDrop}
                  className={`mt-3 rounded-xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
                    isDraggingAnnex
                      ? "border-[#C9A96E] bg-[#C9A96E]/10"
                      : "border-white/15 bg-[#121212]/50 hover:border-white/25"
                  }`}
                >
                  <p className="text-sm text-[#A0A0A0]">Glissez-déposez vos fichiers ici</p>
                  <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-full border border-[#C9A96E] bg-transparent px-5 py-2 text-sm font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]">
                    Ajouter des fichiers
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={handleAnnexInputChange}
                    />
                  </label>
                  <p className="mt-3 text-xs text-[#A0A0A0]">PDF, JPEG, PNG, WebP — 10 Mo max par fichier</p>
                </div>
                {annexFiles.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {annexFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-[#121212] px-4 py-2 text-sm text-[#F5F5F0]"
                      >
                        <span className="truncate pr-3">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAnnex(index)}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#A0A0A0] transition hover:border-red-400/50 hover:text-red-300"
                          aria-label={`Supprimer ${file.name}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-8 grid gap-6">
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Adresse du programme</span>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, address: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : 12 rue du Bois Flotté, 76600 Le Havre"
                  />
                </label>

                {angleSuggestions.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-sm text-[#A0A0A0]">Angles suggérés par FlowEstate</span>
                    <div className="grid gap-2">
                      {angleSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              angle: suggestion.angle,
                              prospectProfile: suggestion.prospectProfile,
                            }));
                          }}
                          className="flex items-start gap-3 rounded-xl border border-[#C9A96E]/30 bg-[#C9A96E]/5 px-4 py-3 text-left transition-all hover:border-[#C9A96E]/60 hover:bg-[#C9A96E]/10"
                        >
                          <span className="text-lg">{suggestion.emoji}</span>
                          <div>
                            <p className="text-sm font-medium text-[#C9A96E]">{suggestion.label}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-[#A0A0A0]">
                              {suggestion.angle}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#A0A0A0]">
                      Cliquez sur un angle pour pré-remplir les champs automatiquement.
                    </p>
                  </div>
                )}

                {isLoadingSuggestions && (
                  <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
                    Analyse du programme en cours...
                  </div>
                )}

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
                  <span className="text-sm text-[#A0A0A0]">Profil de votre prospect cible</span>
                  <textarea
                    rows={3}
                    value={form.prospectProfile}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, prospectProfile: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : couple 32 ans, 2 enfants en bas âge, budget 220 000€, locataires depuis 5 ans, ont visité 3 programmes, cherchent depuis 8 mois, priorité espace extérieur et écoles proches..."
                  />
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

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Annonces concurrentes (optionnel)</span>
                  <span className="block text-xs text-[#A0A0A0]">
                    Collez ici des annonces d&apos;autres agences pour ce même programme — FlowEstate
                    s&apos;en différenciera activement
                  </span>
                  <textarea
                    rows={6}
                    value={form.competitorAds}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, competitorAds: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Copiez-collez les annonces concurrentes trouvées sur SeLoger, Leboncoin ou PAP pour ce programme..."
                  />
                </label>
              </div>

              <div className="space-y-3">
                <span className="text-sm text-[#A0A0A0]">Plateformes à générer</span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "leboncoin", label: "Leboncoin" },
                      { id: "seloger", label: "SeLoger" },
                      { id: "siteAgence", label: "Site propre" },
                      { id: "instagram", label: "Instagram" },
                      { id: "linkedin", label: "LinkedIn" },
                      { id: "facebook", label: "Facebook" },
                    ] as { id: keyof PlatformSelection; label: string }[]
                  ).map(({ id, label }) => (
                    <label
                      key={id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                        platforms[id]
                          ? "border-[#C9A96E]/60 bg-[#C9A96E]/10 text-[#C9A96E]"
                          : "border-white/10 text-[#A0A0A0] hover:border-white/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={platforms[id]}
                        onChange={(e) =>
                          setPlatforms((prev) => ({ ...prev, [id]: e.target.checked }))
                        }
                      />
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          platforms[id] ? "border-[#C9A96E] bg-[#C9A96E]" : "border-white/20"
                        }`}
                      >
                        {platforms[id] ? (
                          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-[#0A0A0A]" aria-hidden>
                            <path
                              d="M1 4l3 3 5-6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </span>
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[#A0A0A0]">
                  Sélectionnez les plateformes souhaitées — seules les annonces cochées seront générées.
                </p>
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
                  `Générer ${selectedCount} annonce${selectedCount > 1 ? "s" : ""}`
                )}
              </button>
            </form>

            <div className="flex h-full min-h-[20rem] flex-col rounded-2xl border border-[#C9A96E]/20 bg-white/[0.02] p-8 lg:min-h-0">
              <h2 className="text-xl font-semibold text-[#F5F5F0]">Vos annonces</h2>

              {generationError?.includes("plan Expert") ? (
                <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-[#C9A96E]/30 bg-[#C9A96E]/5 p-8 text-center">
                  <p className="text-lg font-semibold text-[#F5F5F0]">Feature réservée au plan Expert</p>
                  <p className="mt-2 text-sm text-[#A0A0A0]">
                    La génération d&apos;annonces depuis une plaquette promoteur est disponible
                    uniquement avec le plan Expert.
                  </p>
                  <a
                    href="/tarifs"
                    className="mt-6 inline-flex items-center justify-center rounded-full bg-[#B8943F] px-8 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90"
                  >
                    Voir le plan Expert
                  </a>
                </div>
              ) : generationError ? (
                <div
                  role="alert"
                  className="mt-8 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
                >
                  <span aria-hidden>⚠️</span>
                  <span>{generationError}</span>
                </div>
              ) : result ? (
                <div className="mt-6 flex flex-1 flex-col">
                  {result.scoring ? (
                    <div className="mb-8 mt-6 rounded-2xl border border-[#C9A96E]/30 bg-white/[0.02] p-6">
                      <div className="mb-4 flex items-center gap-4">
                        <div
                          className="text-4xl font-bold"
                          style={{
                            color:
                              result.scoring.score >= 7
                                ? "#C9A96E"
                                : result.scoring.score >= 5
                                  ? "#f97316"
                                  : "#ef4444",
                          }}
                        >
                          {result.scoring.score}/10
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#F5F5F0]">
                            Score de différenciation
                          </p>
                          <p className="text-sm text-[#A0A0A0]">{result.scoring.verdict}</p>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-semibold text-green-400">✓ Points forts</p>
                          <ul className="space-y-1">
                            {result.scoring.points_forts.map((point, i) => (
                              <li key={i} className="text-xs text-[#A0A0A0]">
                                • {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold text-[#C9A96E]">→ Suggestions</p>
                          <ul className="space-y-1">
                            {result.scoring.suggestions.map((s, i) => (
                              <li key={i} className="text-xs italic text-[#A0A0A0]">
                                • {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div
                    role="alert"
                    className="mb-8 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-950/60 p-5 text-sm text-amber-100"
                  >
                    <span className="shrink-0 text-lg" aria-hidden>
                      ⚠️
                    </span>
                    <p>
                      Avant toute publication, vérifiez impérativement : le prix de vente, la date de
                      livraison, les conditions fiscales (PTZ, TVA réduite, Pinel) et les surfaces.
                      Ces informations doivent être confirmées avec le promoteur. Ne publiez jamais
                      une annonce sans validation préalable.
                    </p>
                  </div>
                  {result ? (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-medium text-[#F5F5F0] transition hover:border-white/40 hover:bg-white/5"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden="true"
                        >
                          <path
                            d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Exporter en PDF
                      </button>
                      {extractedProgramData ? (
                        <button
                          type="button"
                          onClick={() => setShowNewLot(!showNewLot)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#C9A96E]/50 bg-transparent px-5 py-2 text-sm font-medium text-[#C9A96E] transition hover:border-[#C9A96E] hover:bg-[#C9A96E]/10"
                        >
                          {showNewLot ? "Annuler" : "Générer pour un autre lot"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {result && extractedProgramData && showNewLot ? (
                        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                          <h3 className="mb-1 text-lg font-semibold text-[#F5F5F0]">
                            Nouveau lot — même programme
                          </h3>
                          <p className="mb-6 text-sm text-[#A0A0A0]">
                            La plaquette est déjà analysée. Uploadez uniquement le plan du nouveau lot.
                          </p>
                          <div
                            onDragOver={handleNewLotAnnexDragOver}
                            onDragLeave={handleNewLotAnnexDragLeave}
                            onDrop={handleNewLotAnnexDrop}
                            className={`rounded-xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
                              isDraggingNewLot
                                ? "border-[#C9A96E] bg-[#C9A96E]/10"
                                : "border-white/15 bg-[#121212]/50 hover:border-white/25"
                            }`}
                          >
                            <p className="text-sm text-[#A0A0A0]">Glissez-déposez le plan du lot ici</p>
                            <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-full border border-[#C9A96E] bg-transparent px-5 py-2 text-sm font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]">
                              Ajouter des fichiers
                              <input
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                multiple
                                className="sr-only"
                                onChange={handleNewLotAnnexInputChange}
                              />
                            </label>
                            <p className="mt-3 text-xs text-[#A0A0A0]">
                              PDF, JPEG, PNG, WebP — 10 Mo max par fichier
                            </p>
                          </div>
                          {newLotFiles.length > 0 ? (
                            <ul className="mt-4 space-y-2">
                              {newLotFiles.map((file, index) => (
                                <li
                                  key={`${file.name}-${index}`}
                                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#121212] px-4 py-2 text-sm text-[#F5F5F0]"
                                >
                                  <span className="truncate pr-3">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveNewLotFile(index)}
                                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-[#A0A0A0] transition hover:border-red-400/50 hover:text-red-300"
                                    aria-label={`Supprimer ${file.name}`}
                                  >
                                    ✕
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <label className="mt-4 block space-y-2">
                            <span className="text-sm text-[#A0A0A0]">Référence du lot (optionnel)</span>
                            <input
                              type="text"
                              value={lotReference}
                              onChange={(e) => setLotReference(e.target.value)}
                              className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                              placeholder="Ex : A103, C205, T3-nord..."
                            />
                          </label>
                          <button
                            type="button"
                            disabled={isLoadingNewLot || newLotFiles.length === 0}
                            onClick={() => void handleGenerateNewLot()}
                            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#B8943F] px-8 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90 disabled:opacity-50"
                          >
                            {isLoadingNewLot
                              ? "Génération en cours..."
                              : "Générer les annonces pour ce lot"}
                          </button>
                        </div>
                  ) : null}
                  <div className={result.lot ? "mt-8 space-y-10" : "mt-8"}>
                    <div>
                      {result.lot ? (
                        <h3 className="mb-4 text-base font-semibold text-[#C9A96E]">Programme global</h3>
                      ) : null}
                      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
                        {activeTabs.map((tab) => {
                          const selected = activeProgrammeTab === tab.id;
                          return (
                            <button
                              key={`programme-${tab.id}`}
                              type="button"
                              onClick={() => setActiveProgrammeTab(tab.id)}
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

                      {activeProgrammeBlock ? (
                        <div className="mt-6 flex flex-col overflow-auto">
                          <h3 className="text-lg font-semibold text-[#C9A96E]">
                            {activeProgrammeBlock.titre}
                          </h3>
                          <p className="mt-4 whitespace-pre-wrap text-[#A0A0A0] leading-relaxed">
                            {clean(activeProgrammeBlock.corps)}
                          </p>
                          <div className="mt-8">
                            <button
                              type="button"
                              onClick={() => void handleCopy("programme", activeProgrammeTab)}
                              className="inline-flex items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                            >
                              {copiedProgrammeTab === activeProgrammeTab ? "Copié" : "Copier"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {result.lot ? (
                      <div className="border-t border-[#C9A96E]/25 pt-10">
                        <h3 className="mb-4 text-base font-semibold text-[#C9A96E]">Lot spécifique</h3>
                        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
                          {activeTabs.map((tab) => {
                            const selected = activeLotTab === tab.id;
                            return (
                              <button
                                key={`lot-${tab.id}`}
                                type="button"
                                onClick={() => setActiveLotTab(tab.id)}
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

                        {activeLotBlock ? (
                          <div className="mt-6 flex flex-col overflow-auto">
                            <h3 className="text-lg font-semibold text-[#C9A96E]">
                              {activeLotBlock.titre}
                            </h3>
                            <p className="mt-4 whitespace-pre-wrap text-[#A0A0A0] leading-relaxed">
                              {clean(activeLotBlock.corps)}
                            </p>
                            <div className="mt-8">
                              <button
                                type="button"
                                onClick={() => void handleCopy("lot", activeLotTab)}
                                className="inline-flex items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                              >
                                {copiedLotTab === activeLotTab ? "Copié" : "Copier"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
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
                    Vos annonces apparaîtront ici
                  </p>
                  <p className="mt-2 text-sm text-[#A0A0A0]">
                    Sélectionnez vos plateformes et générez vos annonces
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
