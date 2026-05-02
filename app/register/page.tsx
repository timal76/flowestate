"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const agencyName = String(formData.get("agencyName") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const termsAccepted = formData.get("terms") === "on";

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (!termsAccepted) {
      setError("Veuillez accepter les conditions");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, agencyName, password }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        setError(payload.error || "Une erreur est survenue.");
        return;
      }

      router.push("/login?message=" + encodeURIComponent("Compte créé ! Connectez-vous."));
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition focus:border-[#B8965A]/70";

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0A0A0A] px-6 py-16 text-[#F5F5F0] antialiased"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(184, 150, 90, 0.12), transparent),
          radial-gradient(ellipse 60% 40% at 100% 50%, rgba(184, 150, 90, 0.06), transparent),
          radial-gradient(ellipse 50% 35% at 0% 80%, rgba(255, 255, 255, 0.04), transparent)
        `,
      }}
    >
      <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center">
        <Link
          href="/"
          className="mb-10 text-2xl font-semibold tracking-wide text-[#B8965A] transition hover:text-[#c9a873]"
        >
          FlowEstate
        </Link>

        <div
          className="w-full rounded-2xl border border-[#B8965A]/35 bg-[#0A0A0A]/80 p-8 shadow-[0_0_48px_-20px_rgba(184,150,90,0.35)] backdrop-blur-sm md:p-10"
          style={{
            boxShadow:
              "0 0 40px -16px rgba(184, 150, 90, 0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <h1 className="text-center text-2xl font-semibold text-[#F5F5F0]">
            Créer un compte
          </h1>
          <p className="mt-2 text-center text-sm text-[#A0A0A0]">
            Rejoignez FlowEstate et automatisez votre activité
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="sr-only">Prénom</span>
                <input
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  placeholder="Prénom"
                  className={inputClass}
                  disabled={isSubmitting}
                />
              </label>
              <label className="block space-y-2">
                <span className="sr-only">Nom</span>
                <input
                  type="text"
                  name="lastName"
                  autoComplete="family-name"
                  placeholder="Nom"
                  className={inputClass}
                  disabled={isSubmitting}
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm text-[#A0A0A0]">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="thomas@agence.fr"
                className={inputClass}
                disabled={isSubmitting}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-[#A0A0A0]">Nom de l&apos;agence</span>
              <input
                type="text"
                name="agencyName"
                autoComplete="organization"
                placeholder="Ex: Agence Bernard Immobilier"
                className={inputClass}
                disabled={isSubmitting}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-[#A0A0A0]">Mot de passe</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className={inputClass}
                disabled={isSubmitting}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-[#A0A0A0]">Confirmer le mot de passe</span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="••••••••"
                className={inputClass}
                disabled={isSubmitting}
              />
            </label>

            <label
              htmlFor="register-terms"
              className="block cursor-pointer text-sm leading-snug text-[#A0A0A0]"
            >
              <div className="flex items-center gap-3">
                <input
                  id="register-terms"
                  type="checkbox"
                  name="terms"
                  value="on"
                  className="peer sr-only appearance-none"
                  disabled={isSubmitting}
                />
                <span
                  aria-hidden="true"
                  className="box-border flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[4px] border-2 border-[#B8965A] bg-[#2a2a2a] transition-all duration-200 ease-out peer-checked:bg-[#B8965A] peer-checked:[&_svg]:scale-100 peer-checked:[&_svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-[#B8965A]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0A0A0A]"
                >
                  <svg
                    viewBox="0 0 12 10"
                    className="h-3 w-3 scale-95 text-white opacity-0 transition-all duration-200 ease-out"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M 1.5 5.5 4.5 8.5 10.5 1.5" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1 leading-snug">
                  J&apos;accepte les{" "}
                  <a
                    href="#"
                    className="font-medium text-[#B8965A] transition hover:text-[#c9a873] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    conditions d&apos;utilisation
                  </a>
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#B8965A] py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#c9a873] active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? "Création en cours..." : "Créer mon compte"}
            </button>
          </form>

          {error ? (
            <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <p className="mt-8 text-center text-sm text-[#A0A0A0]">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-medium text-[#B8965A] transition hover:text-[#c9a873] hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
