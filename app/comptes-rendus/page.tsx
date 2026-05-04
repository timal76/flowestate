"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/components/site-header";
import TemplatesModal from "@/components/templates/TemplatesModal";
import { supabase } from "@/lib/supabase";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import ReactMarkdown from "react-markdown";
import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";
import { toast } from "sonner";

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

const pdfBaseStyle: CSSProperties = {
  width: "794px",
  padding: "50px",
  fontFamily: "Arial, sans-serif",
  fontSize: "11px",
  lineHeight: 1.5,
  color: "#111",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
};

const pdfSectionTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: "bold",
  marginTop: "14px",
  marginBottom: "5px",
};

function cleanPdfLine(line: string) {
  return line.replace(/^#+\s*/g, "").replace(/[#*`]/g, "").trim();
}

function formatVisitDateFr(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR");
}

function splitReportForPdf(lines: string[]) {
  const idx = lines.findIndex((line) => {
    const t = line.toLowerCase();
    return (
      (t.includes("question") && (t.includes("posé") || t.includes("pose"))) ||
      t.startsWith("questions") ||
      t.includes("analyse") ||
      t.includes("recommandation") ||
      t.includes("suite à donner") ||
      t.includes("suite a donner") ||
      (t.includes("suite") && t.includes("donner"))
    );
  });
  if (idx < 0) {
    const mid = Math.max(1, Math.ceil(lines.length / 2));
    return { page1: lines.slice(0, mid), page2: lines.slice(mid) };
  }
  if (idx === 0) {
    return { page1: [], page2: lines };
  }
  return { page1: lines.slice(0, idx), page2: lines.slice(idx) };
}

function revokeIfBlob(url: string) {
  if (!url || !url.startsWith("blob:")) return;
  URL.revokeObjectURL(url);
}

function isLikelySectionHeading(line: string) {
  const t = line.trim();
  if (!t) return false;
  if (t.endsWith(":") && t.length < 80) return true;
  if (t === t.toUpperCase() && t.length > 3 && t.length < 60 && !t.includes(".")) return true;
  return false;
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

const selectFieldClassName =
  "w-full overflow-visible rounded-xl border border-white/15 bg-[#121212] pl-4 pr-10 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]";

export default function VisitReportPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(initialForm);
  const [generatedReport, setGeneratedReport] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [generationsUsed, setGenerationsUsed] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState<string>("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("");
  const [profileLogoUrl, setProfileLogoUrl] = useState<string>("");
  const [profileSignatureUrl, setProfileSignatureUrl] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [signaturePreview, setSignaturePreview] = useState<string>("");
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templatesModalMode, setTemplatesModalMode] = useState<"save" | "load">("load");
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const signatureFileInputRef = useRef<HTMLInputElement>(null);
  const logoPreviewRef = useRef(logoPreview);
  const signaturePreviewRef = useRef(signaturePreview);
  logoPreviewRef.current = logoPreview;
  signaturePreviewRef.current = signaturePreview;

  const logoDisplayUrl = logoPreview || profileLogoUrl;
  const signatureDisplayUrl = signaturePreview || profileSignatureUrl;

  useEffect(() => {
    return () => {
      revokeIfBlob(logoPreviewRef.current);
      revokeIfBlob(signaturePreviewRef.current);
    };
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.id) {
      setGenerationsUsed(null);
      setUserPlan("");
      setSubscriptionStatus("");
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("users")
        .select(
          "logo_url, signature_url, agency_name, first_name, last_name, phone, email, plan, subscription_status"
        )
        .eq("id", session.user.id)
        .single();

      if (cancelled || !data) return;

      setUserPlan(typeof data.plan === "string" ? data.plan : "");
      setSubscriptionStatus(
        typeof data.subscription_status === "string" ? data.subscription_status : ""
      );

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const fromIso = startOfMonth.toISOString();

      const { count } = await supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .gte("created_at", fromIso);

      if (cancelled) return;
      setGenerationsUsed(count ?? 0);

      if (data.logo_url) {
        const url = String(data.logo_url).trim();
        if (url) {
          setProfileLogoUrl(url);
          setLogoPreview((prev) => {
            revokeIfBlob(prev);
            return url;
          });
        }
      }
      if (data.signature_url) {
        const url = String(data.signature_url).trim();
        if (url) {
          setProfileSignatureUrl(url);
          setSignaturePreview((prev) => {
            revokeIfBlob(prev);
            return url;
          });
        }
      }

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

    return () => {
      cancelled = true;
    };
  }, [sessionStatus, session?.user?.id]);

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId) return;

    let cancelled = false;

    async function preloadTemplate() {
      try {
        const res = await fetch("/api/templates?type=compte-rendu");
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

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.type.startsWith("image/")) {
      setLogoPreview((prev) => {
        revokeIfBlob(prev);
        return URL.createObjectURL(file);
      });
    }
    event.target.value = "";
  }

  function handleSignatureChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && file.type.startsWith("image/")) {
      setSignaturePreview((prev) => {
        revokeIfBlob(prev);
        return URL.createObjectURL(file);
      });
    }
    event.target.value = "";
  }

  function handleRemoveLogo() {
    setLogoPreview((prev) => {
      revokeIfBlob(prev);
      return "";
    });
    setProfileLogoUrl("");
  }

  function handleRemoveSignature() {
    setSignaturePreview((prev) => {
      revokeIfBlob(prev);
      return "";
    });
    setProfileSignatureUrl("");
  }

  const { pdfPage1Lines, pdfPage2Lines } = useMemo(() => {
    const lines = generatedReport
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map(cleanPdfLine)
      .filter((line) => {
        if (!line || line === "---") return false;

        const normalized = line.toLowerCase();
        if (line.toUpperCase() === "COMPTE-RENDU DE VISITE") return false;
        if (normalized.includes("document établi le")) return false;
        if (normalized.includes("compte-rendu rédigé le")) return false;
        if (normalized.includes("document rédigé le")) return false;
        if (normalized.includes("compte-rendu établi le")) return false;
        if (normalized.includes("agence :")) return false;
        if (normalized.includes("agent en charge :")) return false;
        if (normalized.includes("contact agent")) return false;
        if (normalized.includes("date de visite :")) return false;
        if (normalized.includes("durée :") || normalized.includes("duree :")) return false;
        if (normalized.includes("tel :") || normalized.startsWith("tel ")) return false;
        if (normalized.includes("bien visité :") || normalized.includes("bien visite :")) return false;
        if (normalized.includes("adresse :")) return false;
        if (normalized.includes("prix affiché :") || normalized.includes("prix affiche :")) return false;
        if (normalized.startsWith("nom :")) return false;
        if (normalized.startsWith("téléphone :") || normalized.startsWith("telephone :")) return false;
        if (normalized.includes("email :")) return false;

        const agent = toCapitalizedWords(form.agentName).toLowerCase();
        const agency = toCapitalizedWords(form.agencyName).toLowerCase();
        const lineUpper = line.toUpperCase();
        if (agent && agency) {
          const withHyphen = `${agent} - ${agency}`;
          const withEnDash = `${agent} – ${agency}`;
          if (normalized.includes(withHyphen) || normalized.includes(withEnDash)) return false;
          if (normalized === agent) return false;
          if (lineUpper === agency.toUpperCase()) return false;
        }

        return true;
      });

    const { page1, page2 } = splitReportForPdf(lines);
    return { pdfPage1Lines: page1, pdfPage2Lines: page2 };
  }, [generatedReport, form.agentName, form.agencyName]);

  const profilBullets = useMemo(() => {
    const raw = form.personalInfo.trim();
    if (!raw) return [];
    const byNewline = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (byNewline.length > 1) return byNewline;
    const bySemi = raw.split(";").map((s) => s.trim()).filter(Boolean);
    if (bySemi.length > 1) return bySemi;
    return [raw];
  }, [form.personalInfo]);

  const contactAgentLine = useMemo(() => {
    const name = toCapitalizedWords(form.agentName).trim() || "—";
    const phone = form.agentPhone.trim() || "—";
    const email = form.agentEmail.trim() || "—";
    return `${name} — ${phone} — ${email}`;
  }, [form.agentName, form.agentPhone, form.agentEmail]);

  const propertyPriceDisplay = useMemo(() => {
    if (!form.propertyPrice) return "—";
    const n = Number(form.propertyPrice);
    if (Number.isNaN(n)) return `${form.propertyPrice} €`;
    return `${n.toLocaleString("fr-FR")} €`;
  }, [form.propertyPrice]);

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

      const response = await fetch("/api/generate-compte-rendu", {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { compteRendu?: string; error?: string };
      if (!response.ok || !payload.compteRendu) {
        throw new Error(payload.error || "Erreur lors de la génération du compte-rendu.");
      }

      setGeneratedReport(payload.compteRendu);
      toast.success("Compte-rendu généré avec succès !");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      toast.error(message);
      setGeneratedReport("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedReport) return;
    await navigator.clipboard.writeText(generatedReport);
    setCopied(true);
    toast.success("Compte-rendu copié !");
  }

  async function handleDownloadPdf() {
    if (!generatedReport) return;
    const page1 = document.getElementById("pdf-page-1");
    const page2 = document.getElementById("pdf-page-2");
    if (!page1 || !page2) return;

    try {
      setIsPdfLoading(true);
      const canvasOpts = {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      };

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      async function addPageFromElement(element: HTMLElement, addNewPage: boolean) {
        const canvas = await html2canvas(element, canvasOpts);
        const imgData = canvas.toDataURL("image/png");
        let imgW = pageW;
        let imgH = (canvas.height * imgW) / canvas.width;
        if (imgH > pageH) {
          const scale = pageH / imgH;
          imgW *= scale;
          imgH = pageH;
        }
        const x = (pageW - imgW) / 2;
        if (addNewPage) pdf.addPage();
        pdf.addImage(imgData, "PNG", x, 0, imgW, imgH);
      }

      await addPageFromElement(page1 as HTMLElement, false);
      await addPageFromElement(page2 as HTMLElement, true);

      pdf.save("compte-rendu-visite.pdf");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      toast.error(message);
    } finally {
      setIsPdfLoading(false);
    }
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
              <h1 className="text-4xl font-semibold tracking-[0.02em] md:text-6xl">
                Compte-rendu de visite
              </h1>
              <p className="text-lg text-[#A0A0A0] md:text-xl">
                Décrivez la visite, FlowEstate rédige le compte-rendu.
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
                  <span className="text-sm text-[#A0A0A0]">E-mail du prospect</span>
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
                    className={selectFieldClassName}
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
                    className={selectFieldClassName}
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
                    className={selectFieldClassName}
                  >
                    <option>Deuxième visite</option>
                    <option>Offre en cours</option>
                    <option>Réflexion</option>
                    <option>Abandon</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ton du compte-rendu</span>
                  <div className="flex gap-2" role="group" aria-label="Ton du compte-rendu">
                    {(["Professionnel", "Détaillé", "Synthétique"] as const).map((toneOption) => {
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
                  <span className="text-sm text-[#A0A0A0]">Nom de l'agent</span>
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
                  <span className="text-sm text-[#A0A0A0]">Téléphone de l'agent</span>
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
                  <span className="text-sm text-[#A0A0A0]">E-mail de l'agent</span>
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

                <div className="grid gap-6 overflow-visible md:grid-cols-2">
                  <div className="space-y-2">
                    <span className="block text-sm text-[#A0A0A0]">Logo de l&apos;agence</span>
                    {logoDisplayUrl ? (
                      <div className="space-y-2">
                        <input
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoChange}
                        />
                        <div className="w-fit overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-2">
                          <img
                            src={logoDisplayUrl}
                            alt="Logo agence"
                            className="h-16 w-16 object-contain"
                            crossOrigin="anonymous"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => logoFileInputRef.current?.click()}
                            className="text-xs font-medium text-[#C9A96E] underline-offset-2 hover:underline"
                          >
                            Changer
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="text-lg leading-none text-[#A0A0A0] transition hover:text-white"
                            aria-label="Retirer le logo"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="w-full cursor-pointer rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 file:mr-4 file:rounded-lg file:border-0 file:bg-[#C9A96E]/10 file:px-4 file:py-2 file:text-[#C9A96E] file:hover:opacity-90 focus:border-[#C9A96E]"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="block text-sm text-[#A0A0A0]">Signature électronique</span>
                    {signatureDisplayUrl ? (
                      <div className="space-y-2">
                        <input
                          ref={signatureFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleSignatureChange}
                        />
                        <div className="w-fit overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-2">
                          <img
                            src={signatureDisplayUrl}
                            alt="Signature électronique"
                            className="h-16 w-24 object-contain"
                            crossOrigin="anonymous"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => signatureFileInputRef.current?.click()}
                            className="text-xs font-medium text-[#C9A96E] underline-offset-2 hover:underline"
                          >
                            Changer
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveSignature}
                            className="text-lg leading-none text-[#A0A0A0] transition hover:text-white"
                            aria-label="Retirer la signature"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSignatureChange}
                        className="w-full cursor-pointer rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 file:mr-4 file:rounded-lg file:border-0 file:bg-[#C9A96E]/10 file:px-4 file:py-2 file:text-[#C9A96E] file:hover:opacity-90 focus:border-[#C9A96E]"
                      />
                    )}
                  </div>
                </div>
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
                  "Générer le compte-rendu"
                )}
              </button>
            </form>

            <div className="rounded-2xl border border-[#C9A96E]/20 bg-white/[0.02] p-8">
              <h2 className="text-xl font-semibold text-[#F5F5F0]">Votre compte-rendu</h2>
              {generatedReport ? (
                <div className="mt-6">
                  <div className="text-[#A0A0A0] [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6">
                    <ReactMarkdown>{generatedReport}</ReactMarkdown>
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
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={isPdfLoading}
                      className="inline-flex items-center justify-center rounded-full border border-[#C9A96E] bg-[#C9A96E] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition-all duration-300 hover:opacity-90 disabled:opacity-50"
                    >
                      {isPdfLoading ? "Génération du PDF..." : "Télécharger en PDF"}
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
      <TemplatesModal
        open={templatesModalOpen}
        mode={templatesModalMode}
        type="compte-rendu"
        initialContent={generatedReport}
        onClose={() => setTemplatesModalOpen(false)}
        onLoad={(content) => {
          setForm((prev) => ({ ...prev, personalInfo: content }));
          toast.success("Template chargé");
        }}
      />

      <div
        id="pdf-content"
        className="fixed -left-[9999px] top-0 z-[-1]"
        style={{ width: "794px" }}
        aria-hidden
      >
        <div id="pdf-page-1" style={pdfBaseStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              paddingBottom: "10px",
            }}
          >
            <div style={{ width: "140px", minHeight: "44px", display: "flex", alignItems: "center" }}>
              {logoDisplayUrl ? (
                <img
                  src={logoDisplayUrl}
                  alt=""
                  crossOrigin="anonymous"
                  style={{ maxHeight: "44px", maxWidth: "140px", objectFit: "contain" }}
                />
              ) : null}
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#111" }}>
                COMPTE-RENDU DE VISITE
              </div>
            </div>
            <div style={{ width: "140px", textAlign: "right", fontSize: "10px", color: "#111" }}>
              {new Date().toLocaleDateString("fr-FR")}
            </div>
          </div>
          <div style={{ borderBottom: "1px solid #cccccc", marginBottom: "10px" }} />
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              fontWeight: "bold",
              color: "#111",
              marginBottom: "8px",
            }}
          >
            {toCapitalizedWords(form.agencyName).trim() || "—"}
          </div>

          <div style={{ lineHeight: 1.5, color: "#111", marginBottom: "4px" }}>
            <div>Date de visite : {formatVisitDateFr(form.visitDate)}</div>
            <div>Durée : {form.visitDuration}</div>
            <div>Contact de l'agent : {contactAgentLine}</div>
          </div>

          <div style={pdfSectionTitleStyle}>BIEN VISITÉ</div>
          <div style={{ lineHeight: 1.5, color: "#111" }}>
            <div>Type : {form.propertyType}</div>
            <div>Adresse : {form.propertyAddress.trim() || "—"}</div>
            <div>Prix : {propertyPriceDisplay}</div>
          </div>

          <div style={pdfSectionTitleStyle}>PROSPECT</div>
          <div style={{ lineHeight: 1.5, color: "#111" }}>
            <div>Nom : {form.prospectName.trim() || "—"}</div>
            <div>Téléphone : {form.prospectPhone.trim() || "—"}</div>
            <div>E-mail : {form.prospectEmail.trim() || "—"}</div>
          </div>

          <div style={{ ...pdfSectionTitleStyle, fontStyle: "italic" }}>Profil :</div>
          {profilBullets.length ? (
            <div style={{ lineHeight: 1.5, color: "#111" }}>
              {profilBullets.map((item, idx) => (
                <p key={`profil-${idx}`} style={{ margin: "0 0 4px 0" }}>
                  - {item}
                </p>
              ))}
            </div>
          ) : (
            <div style={{ lineHeight: 1.5, color: "#111" }}>—</div>
          )}

          <div style={pdfSectionTitleStyle}>DÉROULEMENT DE LA VISITE</div>
          <div>
            {pdfPage1Lines.length ? (
              pdfPage1Lines.map((line, idx) => {
                const sub = isLikelySectionHeading(line);
                return (
                  <p
                    // eslint-disable-next-line react/no-array-index-key
                    key={`pdf-p1-${idx}`}
                    style={{
                      margin: sub ? "8px 0 4px 0" : "0 0 6px 0",
                      fontSize: "11px",
                      fontWeight: sub ? "bold" : "normal",
                      lineHeight: 1.5,
                      color: "#111",
                    }}
                  >
                    {line}
                  </p>
                );
              })
            ) : (
              <p style={{ margin: 0, fontSize: "11px", lineHeight: 1.5, color: "#111" }}>—</p>
            )}
          </div>
        </div>

        <div id="pdf-page-2" style={pdfBaseStyle}>
          <div>
            {pdfPage2Lines.length ? (
              pdfPage2Lines.map((line, idx) => {
                const sub = isLikelySectionHeading(line);
                return (
                  <p
                    // eslint-disable-next-line react/no-array-index-key
                    key={`pdf-p2-${idx}`}
                    style={{
                      margin: sub ? "8px 0 4px 0" : "0 0 6px 0",
                      fontSize: "11px",
                      fontWeight: sub ? "bold" : "normal",
                      lineHeight: 1.5,
                      color: "#111",
                    }}
                  >
                    {line}
                  </p>
                );
              })
            ) : (
              <p style={{ margin: 0, fontSize: "11px", lineHeight: 1.5, color: "#111" }}>—</p>
            )}
          </div>

          <div style={{ marginTop: "20px" }}>
            <div style={{ fontSize: "11px", lineHeight: 1.5, color: "#111", marginBottom: "10px" }}>
              Compte-rendu établi le {new Date().toLocaleDateString("fr-FR")}
            </div>
            <div style={{ borderTop: "1px solid #dddddd", marginBottom: "12px" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <div style={{ textAlign: "right", maxWidth: "280px" }}>
                <div style={{ fontSize: "10px", lineHeight: 1.5, color: "#111" }}>
                  {toCapitalizedWords(form.agentName).trim() || "—"}
                </div>
                <div style={{ fontSize: "10px", lineHeight: 1.5, color: "#111" }}>
                  {toCapitalizedWords(form.agencyName).trim() || "—"}
                </div>
                <div style={{ fontSize: "10px", lineHeight: 1.5, color: "#111" }}>
                  {form.agentPhone.trim() || "—"}
                </div>
                <div style={{ fontSize: "10px", lineHeight: 1.5, color: "#111" }}>
                  {form.agentEmail.trim() || "—"}
                </div>
                {signatureDisplayUrl ? (
                  <img
                    src={signatureDisplayUrl}
                    alt=""
                    crossOrigin="anonymous"
                    style={{
                      display: "block",
                      marginTop: "8px",
                      marginLeft: "auto",
                      maxHeight: "72px",
                      maxWidth: "200px",
                      objectFit: "contain",
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
