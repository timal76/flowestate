"use client";

import ReactMarkdown from "react-markdown";
import { FormEvent, useEffect, useState, type ChangeEvent } from "react";

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

export default function ListingsGeneratorPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [generatedListing, setGeneratedListing] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = photoFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [photoFiles]);

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
    setGenerationError("");
    setCopied(false);

    try {
      setIsLoading(true);

      const images =
        photoFiles.length > 0
          ? await Promise.all(photoFiles.map((file) => fileToBase64(file)))
          : undefined;

      const response = await fetch("/api/generate-annonce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...form, images }),
      });

      const payload = (await response.json()) as { annonce?: string; error?: string };

      if (!response.ok || !payload.annonce) {
        throw new Error(payload.error || "Erreur lors de la generation de l'annonce.");
      }

      setGeneratedListing(payload.annonce);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      setGenerationError(message);
      setGeneratedListing("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!generatedListing) return;
    await navigator.clipboard.writeText(generatedListing);
    setCopied(true);
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <header className="fixed inset-x-0 top-0 z-50 bg-[#0A0A0A]/85 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 md:px-10">
          <a href="/" className="text-xl font-semibold tracking-wide text-[#C9A96E]">
            FlowEstate
          </a>

          <nav className="flex items-center gap-8 text-sm font-medium text-[#A0A0A0]">
            <a href="/annonces" className="transition hover:text-[#F5F5F0]">
              Annonces
            </a>
            <a href="/emails" className="transition hover:text-[#F5F5F0]">
              Emails
            </a>
            <a href="/comptes-rendus" className="transition hover:text-[#F5F5F0]">
              Comptes-rendus
            </a>
            <a href="/" className="transition hover:text-[#F5F5F0]">
              Accueil
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
              Generateur d'annonces
            </h1>
            <p className="text-lg text-[#A0A0A0] md:text-xl">
              Decrivez le bien, FlowEstate redige l'annonce.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            <form
              onSubmit={handleGenerate}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-8"
            >
              <div className="grid gap-6 md:grid-cols-2">
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
                  <span className="text-sm text-[#A0A0A0]">Type de mandat</span>
                  <select
                    value={form.mandateType}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, mandateType: event.target.value as MandateType }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  >
                    <option>Vente</option>
                    <option>Location</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ton de l'annonce</span>
                  <select
                    value={form.tone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, tone: event.target.value as ListingTone }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                  >
                    <option>Professionnel</option>
                    <option>Chaleureux</option>
                    <option>Luxe</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Longueur de l'annonce</span>
                  <select
                    value={form.length}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, length: event.target.value as ListingLength }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                    placeholder={form.mandateType === "Location" ? "Ex: 1450" : "Ex: 420000"}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Surface en m2</span>
                  <input
                    type="number"
                    min={0}
                    value={form.area}
                    onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: 78"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Nombre de pieces</span>
                  <input
                    type="number"
                    min={0}
                    value={form.rooms}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, rooms: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: 4"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Etage</span>
                  <input
                    type="number"
                    min={0}
                    value={form.floor}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, floor: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: 3"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Ascenseur</span>
                  <select
                    value={form.elevator}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, elevator: event.target.value as ElevatorOption }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
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
                    placeholder="Ex: 120"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">Disponibilite</span>
                  <input
                    type="text"
                    value={form.availability}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, availability: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Ex: Immediate, 3 mois"
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
                    placeholder="Ex: Lyon 6e, a 5 min du parc de la Tete d'Or"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-[#A0A0A0]">
                    Points forts (ex: vue degagee, parking, proche transports)
                  </span>
                  <textarea
                    rows={5}
                    value={form.highlights}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, highlights: event.target.value }))
                    }
                    className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition-all duration-300 focus:border-[#C9A96E]"
                    placeholder="Separez les points forts par des virgules"
                  />
                  <div className="text-right text-xs text-[#A0A0A0]">
                    {form.highlights.length} caracteres
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
                {isLoading ? "Génération en cours..." : "Generer l'annonce"}
              </button>
            </form>

            <div className="flex h-full min-h-[20rem] flex-col rounded-2xl border border-[#C9A96E]/20 bg-white/[0.02] p-8 lg:min-h-0">
              <h2 className="text-xl font-semibold text-[#F5F5F0]">Votre annonce</h2>
              {generationError ? (
                <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {generationError}
                </p>
              ) : null}
              {generatedListing ? (
                <div className="mt-6 flex flex-1 flex-col">
                  <div className="text-[#A0A0A0] [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6">
                    <ReactMarkdown>{generatedListing}</ReactMarkdown>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="mt-8 inline-flex items-center justify-center rounded-full border-2 border-[#C9A96E] bg-transparent px-6 py-3 text-sm font-semibold text-[#F5F5F0] transition-all duration-300 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                  >
                    {copied ? "Copie" : "Copier"}
                  </button>
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
    </main>
  );
}
