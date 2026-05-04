"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type OnboardingModalProps = {
  firstName: string | null;
  lastName: string | null;
  agencyName: string | null;
  phone: string | null;
  logoUrl: string | null;
  createdAt: string | null;
  trialEndsAt: string | null;
};

const stepPercent = {
  1: 25,
  2: 50,
  3: 75,
  4: 100,
} as const;

export default function OnboardingModal({
  firstName,
  lastName,
  agencyName,
  phone,
  logoUrl,
  createdAt,
  trialEndsAt,
}: OnboardingModalProps) {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isStep4Popped, setIsStep4Popped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [selectedTool, setSelectedTool] = useState<number | null>(null);
  const [localFirstName, setLocalFirstName] = useState(firstName ?? "");
  const [localLastName, setLocalLastName] = useState(lastName ?? "");
  const [localAgencyName, setLocalAgencyName] = useState(agencyName ?? "");
  const [localPhone, setLocalPhone] = useState(phone ?? "");
  const [localLogoUrl, setLocalLogoUrl] = useState(logoUrl ?? "");
  const [localLogoName, setLocalLogoName] = useState<string>(logoUrl ? "logo" : "");

  const trialDaysLeft = useMemo(() => {
    if (trialEndsAt) {
      return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));
    }
    if (!createdAt) return 14;
    const daysSinceCreated = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
    return Math.max(0, 14 - daysSinceCreated);
  }, [createdAt, trialEndsAt]);

  function goToStep(next: 1 | 2 | 3 | 4) {
    if (next === step) return;
    setIsTransitioning(true);
    window.setTimeout(() => {
      setStep(next);
      setIsTransitioning(false);
      if (next === 4) {
        setIsStep4Popped(true);
        window.setTimeout(() => setIsStep4Popped(false), 400);
      }
    }, 150);
  }

  async function handleUploadLogo(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier dépasse 2 Mo.");
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.set("kind", "logo");
      fd.set("file", file);

      const res = await fetch("/api/user/profile/upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as { publicUrl?: string; error?: string };

      if (!res.ok || !data.publicUrl) {
        throw new Error(data.error ?? "Upload impossible.");
      }

      setLocalLogoUrl(data.publicUrl);
      setLocalLogoName(file.name);
      toast.success("Logo uploadé.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur upload logo.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function saveProfileAndContinue(event: FormEvent) {
    event.preventDefault();
    const hasAnyField =
      Boolean(localFirstName.trim()) ||
      Boolean(localLastName.trim()) ||
      Boolean(localAgencyName.trim()) ||
      Boolean(localPhone.trim()) ||
      Boolean(localLogoUrl);
    if (!hasAnyField) {
      goToStep(2);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: localFirstName,
          last_name: localLastName,
          agency_name: localAgencyName || null,
          phone: localPhone || null,
          logo_url: localLogoUrl || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Impossible de sauvegarder le profil.");
      }
      goToStep(2);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de sauvegarde.";
      toast.error(message);
      // Toujours continuer, ne jamais bloquer
      goToStep(2);
    } finally {
      setIsSaving(false);
    }
  }

  async function completeOnboarding(nextPath?: string) {
    setIsCompleting(true);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      const data = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok) {
        throw new Error(data.error ?? "Impossible de terminer l'onboarding.");
      }
      if (nextPath) {
        router.push(nextPath);
      } else {
        router.refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur onboarding.";
      toast.error(message);
    } finally {
      setIsCompleting(false);
    }
  }

  const progress = stepPercent[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.80)", backdropFilter: "blur(8px)" }}
    >
      <div className="animate-in fade-in zoom-in-95 duration-200 w-full max-w-[500px] overflow-hidden rounded-[20px] border border-[#C9A96E]/25 bg-[#0A0A0A]">
        <div className="border-b border-[#C9A96E]/10 bg-[#060606] px-8 pb-6 pt-7">
          <p className="text-[18px] font-medium tracking-[0.06em] text-[#C9A96E]">FlowEstate</p>
          <span className="mt-[10px] inline-flex rounded-full border border-[#C9A96E]/20 bg-[#C9A96E]/[0.08] px-3 py-1 text-[11px] tracking-[0.04em] text-[#C9A96E]">
            ✦ 14 jours d&apos;essai gratuit
          </span>

          <div className="mt-5 flex items-start">
            {(["Profil", "Outils", "Fonctionnement", "C'est parti"] as const).map((label, idx) => {
              const i = (idx + 1) as 1 | 2 | 3 | 4;
              const done = i < step;
              const active = i === step;
              return (
                <div key={label} className="flex min-w-0 flex-1 items-start">
                  <div className="flex flex-col items-center">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium ${
                        done || active
                          ? "bg-[#C9A96E] text-[#0A0A0A]"
                          : "border border-[#C9A96E]/20 bg-[#C9A96E]/10 text-[#C9A96E]/35"
                      }`}
                    >
                      {done ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={12}
                          height={12}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        i
                      )}
                    </span>
                    <span
                      className={`mt-2 text-center text-[10px] tracking-[0.03em] ${
                        active ? "text-[#C9A96E]" : "text-[#C9A96E]/35"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < 3 ? (
                    <span
                      className={`mx-2 mt-[13px] h-px min-w-5 flex-1 ${idx + 1 < step ? "bg-[#C9A96E]" : "bg-[#C9A96E]/15"}`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-4 h-[2px] w-full bg-[#C9A96E]/10">
            <div
              className="h-[2px] bg-[#C9A96E] transition-all duration-[400ms] ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="px-8 py-7">
          <div
            className={`transition-all ${isTransitioning ? "opacity-0 -translate-y-2 duration-150" : "opacity-100 translate-y-0 duration-200"}`}
          >
            {step === 1 ? (
              <form onSubmit={saveProfileAndContinue} className="space-y-4">
                <div>
                  <h2 className="text-xl font-medium text-[#F5F5F0]">Bienvenue, configurons votre espace</h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#A0A0A0]">
                    Ces informations apparaîtront dans vos annonces, emails et comptes-rendus.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="block text-[11px] tracking-[0.03em] text-[#666]">Prénom</span>
                    <input
                      value={localFirstName}
                      onChange={(event) => setLocalFirstName(event.target.value)}
                      placeholder="Votre prénom"
                      className="w-full rounded-[10px] border border-white/10 bg-white/[0.03] px-[14px] py-[10px] text-sm text-[#F5F5F0] outline-none placeholder:text-[#555] transition focus:border-[#C9A96E]/50 focus:bg-[#C9A96E]/[0.03]"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-[11px] tracking-[0.03em] text-[#666]">Nom</span>
                    <input
                      value={localLastName}
                      onChange={(event) => setLocalLastName(event.target.value)}
                      placeholder="Votre nom"
                      className="w-full rounded-[10px] border border-white/10 bg-white/[0.03] px-[14px] py-[10px] text-sm text-[#F5F5F0] outline-none placeholder:text-[#555] transition focus:border-[#C9A96E]/50 focus:bg-[#C9A96E]/[0.03]"
                    />
                  </label>
                </div>

                <label className="block space-y-1.5">
                  <span className="block text-[11px] tracking-[0.03em] text-[#666]">Agence</span>
                  <input
                    value={localAgencyName}
                    onChange={(event) => setLocalAgencyName(event.target.value)}
                    placeholder="Nom de l'agence"
                    className="w-full rounded-[10px] border border-white/10 bg-white/[0.03] px-[14px] py-[10px] text-sm text-[#F5F5F0] outline-none placeholder:text-[#555] transition focus:border-[#C9A96E]/50 focus:bg-[#C9A96E]/[0.03]"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="block text-[11px] tracking-[0.03em] text-[#666]">
                    Téléphone professionnel
                  </span>
                  <input
                    value={localPhone}
                    onChange={(event) => setLocalPhone(event.target.value)}
                    placeholder="+33 ..."
                    className="w-full rounded-[10px] border border-white/10 bg-white/[0.03] px-[14px] py-[10px] text-sm text-[#F5F5F0] outline-none placeholder:text-[#555] transition focus:border-[#C9A96E]/50 focus:bg-[#C9A96E]/[0.03]"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="block text-[11px] tracking-[0.03em] text-[#666]">Logo agence</span>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void handleUploadLogo(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full rounded-[10px] border-[1.5px] border-dashed border-[#C9A96E]/25 bg-[#C9A96E]/[0.02] p-[18px] text-center transition hover:border-[#C9A96E]/45 hover:bg-[#C9A96E]/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {localLogoUrl ? (
                      <span className="inline-flex items-center gap-3">
                        <img src={localLogoUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
                        <span className="text-sm text-[#888]">{localLogoName || "Logo sélectionné"}</span>
                      </span>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={18}
                          height={18}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mx-auto mb-1.5 text-[#C9A96E]"
                          aria-hidden
                        >
                          <path d="M12 3v12" />
                          <path d="m7 8 5-5 5 5" />
                          <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
                        </svg>
                        <span className="block text-[13px] text-[#888]">
                          Glissez votre logo ici ou cliquez
                        </span>
                        <span className="mt-1 block text-[11px] text-[#555]">PNG, JPG — max 2 Mo</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5">
                  <button
                    type="button"
                    className="text-[13px] text-[#555] transition hover:text-[#888]"
                    onClick={() => goToStep(2)}
                    disabled={isSaving || isUploading}
                  >
                    Passer cette étape
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isUploading}
                    className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[#C9A96E] bg-transparent px-[22px] py-[10px] text-[13px] font-medium text-[#C9A96E] transition-all duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Sauvegarde..." : "Continuer →"}
                  </button>
                </div>
              </form>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-medium text-[#F5F5F0]">Trois outils, un seul objectif</h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#A0A0A0]">
                    Moins de temps sur l&apos;administratif, plus de temps pour vos clients.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      title: "Générateur d'annonces",
                      description:
                        "Remplissez un formulaire rapide → choisissez le ton → copiez l'annonce prête à publier.",
                    },
                    {
                      title: "Emails de relance",
                      description:
                        "Renseignez le prospect et le contexte → votre signature est déjà là → copiez et envoyez.",
                    },
                    {
                      title: "Compte-rendu de visite",
                      description:
                        "Décrivez la visite → téléchargez le PDF avec logo et signature → partagez immédiatement.",
                    },
                  ].map((tool, idx) => (
                    <button
                      key={tool.title}
                      type="button"
                      onClick={() => {
                        setSelectedTool(idx);
                        window.setTimeout(() => {
                          setSelectedTool(null);
                          goToStep(3);
                        }, 100);
                      }}
                      className={`flex w-full items-start gap-[14px] rounded-xl border border-white/10 bg-white/[0.02] px-4 py-[14px] text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-[#C9A96E]/35 hover:bg-[#C9A96E]/[0.04] ${selectedTool === idx ? "scale-[0.99]" : ""}`}
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C9A96E]/25 bg-[#C9A96E]/10 text-[#C9A96E]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={16}
                          height={16}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          {tool.title === "Générateur d'annonces" ? (
                            <>
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                              <polyline points="9 22 9 12 15 12 15 22" />
                            </>
                          ) : tool.title === "Emails de relance" ? (
                            <>
                              <rect x="2" y="4" width="20" height="16" rx="2" />
                              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </>
                          ) : (
                            <>
                              <rect x="8" y="2" width="8" height="4" rx="1" />
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                              <path d="M12 11h4M12 16h4M8 11h.01M8 16h.01" />
                            </>
                          )}
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="mb-1 block text-sm font-medium text-[#F5F5F0]">{tool.title}</span>
                        <span className="block text-[13px] leading-relaxed text-[#A0A0A0]">
                          {tool.description}
                        </span>
                      </span>
                      <span className="ml-auto self-center text-sm text-[#444]" aria-hidden>
                        →
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5">
                  <button
                    type="button"
                    className="text-[13px] text-[#555] transition hover:text-[#888]"
                    onClick={() => goToStep(1)}
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[#C9A96E] bg-transparent px-[22px] py-[10px] text-[13px] font-medium text-[#C9A96E] transition-all duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                    onClick={() => goToStep(3)}
                  >
                    Continuer →
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-medium text-[#F5F5F0]">Comment ça marche ?</h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#A0A0A0]">
                    En moins de 30 secondes par tâche.
                  </p>
                </div>
                {[
                  {
                    label: "ANNONCES",
                    text: "Remplissez le formulaire → choisissez le ton (professionnel ou chaleureux) → copiez l'annonce en Markdown ou texte brut.",
                  },
                  {
                    label: "EMAILS DE RELANCE",
                    text: "Renseignez le nom du prospect et le contexte → votre signature est pré-remplie depuis le profil → copiez et collez dans votre messagerie.",
                  },
                  {
                    label: "COMPTE-RENDU DE VISITE",
                    text: "Décrivez la visite et le bien → votre logo et signature sont ajoutés automatiquement → téléchargez le PDF en un clic.",
                  },
                  {
                    label: "HISTORIQUE",
                    text: "Chaque génération est sauvegardée automatiquement. Retrouvez-les, filtrez-les par type, et réutilisez-les à tout moment depuis le menu Historique.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[10px] border border-[#C9A96E]/15 bg-[#C9A96E]/5 px-4 py-3"
                  >
                    <p className="mb-1.5 text-[10px] font-medium tracking-[0.08em] text-[#C9A96E]">
                      {item.label}
                    </p>
                    <p className="text-[13px] leading-relaxed text-[#A0A0A0]">{item.text}</p>
                  </div>
                ))}
                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-5">
                  <button
                    type="button"
                    className="text-[13px] text-[#555] transition hover:text-[#888]"
                    onClick={() => goToStep(2)}
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border-[1.5px] border-[#C9A96E] bg-transparent px-[22px] py-[10px] text-[13px] font-medium text-[#C9A96E] transition-all duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A]"
                    onClick={() => goToStep(4)}
                  >
                    Continuer →
                  </button>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="py-2 text-center">
                <span
                  className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#C9A96E] transition-transform duration-[400ms] ease-out"
                  style={{ transform: isStep4Popped ? "scale(1.1)" : "scale(1)" }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#C9A96E]/25 bg-[#C9A96E]/[0.08] px-[14px] py-[5px] text-xs text-[#C9A96E]">
                  ✓{" "}
                  {trialDaysLeft === 0
                    ? "Dernier jour d'essai gratuit"
                    : `${trialDaysLeft} jours d'essai gratuit restants`}
                </span>
                <h2 className="mb-2 text-xl font-medium text-[#F5F5F0]">Votre espace est prêt !</h2>
                <p className="mb-6 text-[14px] leading-relaxed text-[#A0A0A0]">
                  Commencez par générer votre première annonce. Ça prend moins d&apos;une minute et le
                  résultat est immédiatement utilisable.
                </p>
                <button
                  type="button"
                  disabled={isCompleting}
                  className="mb-[10px] block w-full rounded-full border-[1.5px] border-[#C9A96E] bg-transparent px-5 py-3 text-sm font-medium text-[#C9A96E] transition-all duration-200 hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void completeOnboarding("/annonces")}
                >
                  Générer ma première annonce →
                </button>
                <button
                  type="button"
                  disabled={isCompleting}
                  onClick={() => void completeOnboarding()}
                  className="text-[13px] text-[#555] transition hover:text-[#888]"
                >
                  Aller au dashboard
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
