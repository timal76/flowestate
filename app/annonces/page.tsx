"use client";

import ReactMarkdown from "react-markdown";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import SiteHeader from "@/components/site-header";
import TemplatesModal from "@/components/templates/TemplatesModal";
import { supabase } from "@/lib/supabase";

type PropertyType = "Appartement" | "Maison" | "Studio" | "Loft" | "Villa";
type ListingTone = "Professionnel" | "Chaleureux" | "Luxe";
type ListingLength = "Courte (~150 mots)" | "Standard (~300 mots)" | "Détaillée (~500 mots)";
type MandateType = "Vente" | "Location";
type ElevatorOption = "Oui" | "Non";
type DpeRating = "A" | "B" | "C" | "D" | "E" | "F" | "G";
type ParkingOption = "Inclus" | "Non inclus";

type FormState = {
  propertyType: PropertyType;
  mandateType: MandateType;
  price: string;
  area: string;
  rooms: string;
  floor: string;
  elevator: ElevatorOption;
  dpe: DpeRating;
  parking: ParkingOption;
  monthlyCharges: string;
  availability: string;
  location: string;
  highlights: string;
  tone: ListingTone;
  length: ListingLength;
};

const initialForm: FormState = {
  propertyType: "Appartement",
  mandateType: "Vente",
  price: "",
  area: "",
  rooms: "",
  floor: "",
  elevator: "Non",
  dpe: "D",
  parking: "Non inclus",
  monthlyCharges: "",
  availability: "",
  location: "",
  highlights: "",
  tone: "Professionnel",
  length: "Standard (~300 mots)",
};

const selectFieldClassName =
  "w-full overflow-visible rounded-xl border border-white/15 bg-[#121212] pl-4 pr-10 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]";

export default function ListingsGeneratorPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>(initialForm);
  const [generatedListing, setGeneratedListing] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [generationsUsed, setGenerationsUsed] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState<string>("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("");
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templatesModalMode, setTemplatesModalMode] = useState<"save" | "load">("load");
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [prospectName, setProspectName] = useState("");

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
        typeof data.subscription_status === "string" ? data.subscription_status : ""
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

  useEffect(() => {
    const urls = photoFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoFiles]);

  useEffect(() => {
    const pid = searchParams.get("prospect_id");
    if (!pid) {
      setProspectId(null);
      setProspectName("");
      return;
    }
    setProspectId(pid);

    let cancelled = false;
    async function preloadProspect() {
      try {
        const res = await fetch(`/api/prospects/${pid}`);
        const data = (await res.json()) as { prospect?: { nom?: string | null }; error?: string };
        if (!res.ok || !data.prospect) throw new Error(data.error ?? "Prospect introuvable.");
        if (cancelled) return;
        const name = data.prospect?.nom?.trim() || "";
        setProspectName(name);
        if (name) {
          setForm((prev) => ({
            ...prev,
            highlights: prev.highlights ? `${prev.highlights}\nProspect: ${name}` : `Prospect: ${name}`,
          }));
        }
      } catch {
        if (!cancelled) toast.error("Impossible de charger le prospect");
      }
    }

    void preloadProspect();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    const templateId = searchParams.get("template");
    if (!templateId) return;

    let cancelled = false;

    async function preloadTemplate() {
      try {
        const res = await fetch("/api/templates?type=annonce");
        const data = (await res.json()) as {
          templates?: Array<{ id: string; content: string }>;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Impossible de charger le template.");
        const selected = (data.templates ?? []).find((template) => template.id === templateId);
        if (!selected || cancelled) return;
        setForm((prev) => ({ ...prev, highlights: selected.content }));
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

  function handlePhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const imagesOnly = files.filter((file) => file.type.startsWith("image/"));
    setPhotoFiles((prev) => [...prev, ...imagesOnly].slice(0, 5));
    event.target.value = "";
  }

  function handleRemovePhoto(indexToRemove: number) {
    setPhotoFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  async function fileToBase64(file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    return {
      data: dataUrl.split(",")[1] ?? "",
      mediaType: file.type || "image/jpeg",
    };
  }

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

      const images =
        photoFiles.length > 0
          ? await Promise.all(photoFiles.map((file) => fileToBase64(file)))
          : undefined;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.user?.id) {
        headers["x-user-id"] = session.user.id;
      }

      const response = await fetch("/api/generate-annonce", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, images, prospectId, prospectName: prospectName || null }),
      });

      const payload = (await response.json()) as { annonce?: string; error?: string };

      if (!response.ok || !payload.annonce) {
        throw new Error(payload.error || "Erreur lors de la génération de l'annonce.");
      }

      setGeneratedListing(payload.annonce);
      toast.success("Annonce générée avec succès !");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      toast.error(message);
      setGeneratedListing("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedListing) return;
    await navigator.clipboard.writeText(generatedListing);
    setCopied(true);
    toast.success("Annonce copiée !");
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
                Générateur d'annonces
              </h1>
              <p className="text-lg text-[#A0A0A0] md:text-xl">
                Décrivez le bien, FlowEstate rédige l'annonce.
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

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            <form
              onSubmit={handleGenerate}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 overflow-visible"
            >
              <div className="grid gap-6 overflow-visible md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Type de bien</span>
                  <select
                    value={form.propertyType}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        propertyType: event.target.value as PropertyType,
                      }))
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
                  <span className="text-sm text-[#A0A0A0]">Type de mandat</span>
                  <select
                    value={form.mandateType}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, mandateType: event.target.value as MandateType }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Vente</option>
                    <option>Location</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ton de l'annonce</span>
                  <div className="flex gap-2" role="group" aria-label="Ton de l'annonce">
                    {(["Professionnel", "Chaleureux", "Luxe"] as const).map((toneOption) => {
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
                  <span className="text-sm text-[#A0A0A0]">Longueur de l'annonce</span>
                  <select
                    value={form.length}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, length: event.target.value as ListingLength }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Courte (~150 mots)</option>
                    <option>Standard (~300 mots)</option>
                    <option>Détaillée (~500 mots)</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">
                    {form.mandateType === "Location" ? "Loyer mensuel (€)" : "Prix de vente (€)"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, price: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder={form.mandateType === "Location" ? "Ex : 1450" : "Ex : 420000"}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Surface en m²</span>
                  <input
                    type="number"
                    min={0}
                    value={form.area}
                    onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : 78"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Nombre de pièces</span>
                  <input
                    type="number"
                    min={0}
                    value={form.rooms}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, rooms: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : 4"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Étage</span>
                  <input
                    type="number"
                    min={0}
                    value={form.floor}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, floor: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : 3"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ascenseur</span>
                  <select
                    value={form.elevator}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, elevator: event.target.value as ElevatorOption }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Oui</option>
                    <option>Non</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">DPE</span>
                  <select
                    value={form.dpe}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, dpe: event.target.value as DpeRating }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>A</option>
                    <option>B</option>
                    <option>C</option>
                    <option>D</option>
                    <option>E</option>
                    <option>F</option>
                    <option>G</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Parking/Garage</span>
                  <select
                    value={form.parking}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, parking: event.target.value as ParkingOption }))
                    }
                    className={selectFieldClassName}
                  >
                    <option>Inclus</option>
                    <option>Non inclus</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Charges mensuelles (€)</span>
                  <input
                    type="number"
                    min={0}
                    value={form.monthlyCharges}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, monthlyCharges: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : 120"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Disponibilité</span>
                  <input
                    type="text"
                    value={form.availability}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, availability: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : immédiate, dans 3 mois"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-6">
                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Localisation</span>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, location: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex : Lyon 6e, à 5 min du parc de la Tête d'Or"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">
                    Points forts (ex. : vue dégagée, parking, proche transports)
                  </span>
                  <textarea
                    rows={5}
                    value={form.highlights}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, highlights: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Séparez les points forts par des virgules"
                  />
                  <div className="text-right text-xs text-[#A0A0A0]">
                    {form.highlights.length} caractères
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Photos du bien (5 max)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotosChange}
                    className="w-full cursor-pointer rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 file:mr-4 file:rounded-lg file:border-0 file:bg-[#C9A96E]/10 file:px-4 file:py-2 file:text-[#C9A96E] file:hover:opacity-90 focus:border-[#C9A96E]"
                  />
                  {photoPreviews.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2">
                      {photoPreviews.map((src, idx) => (
                        <div
                          // eslint-disable-next-line react/no-array-index-key
                          key={`${src}-${idx}`}
                          className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
                        >
                          <img
                            src={src}
                            alt={`Photo ${idx + 1}`}
                            className="h-20 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#C9A96E]/60 bg-[#0A0A0A]/90 text-sm font-semibold leading-none text-[#F5F5F0] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                            aria-label={`Supprimer la photo ${idx + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
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
                  "Générer l'annonce"
                )}
              </button>
            </form>

            <div className="flex h-full min-h-[20rem] flex-col rounded-2xl border border-[#C9A96E]/20 bg-white/[0.02] p-8 lg:min-h-0">
              <h2 className="text-xl font-semibold text-[#F5F5F0]">Votre annonce</h2>
              {generatedListing ? (
                <div className="mt-6 flex flex-1 flex-col">
                  <div className="text-[#A0A0A0] [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6">
                    <ReactMarkdown>{generatedListing}</ReactMarkdown>
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
                        d="M4 10.75 12 4l8 6.75V20a2 2 0 01-2 2h-3v-7H11v7H8a2 2 0 01-2-2v-9.25z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-[#F5F5F0]">Votre annonce apparaîtra ici</p>
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
        type="annonce"
        initialContent={generatedListing}
        onClose={() => setTemplatesModalOpen(false)}
        onLoad={(content) => {
          setForm((prev) => ({ ...prev, highlights: content }));
          toast.success("Template chargé");
        }}
      />
    </main>
  );
}
