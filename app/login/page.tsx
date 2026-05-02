"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const successMessage = searchParams.get("message");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      setIsSubmitting(true);
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou mot de passe incorrect");
        return;
      }

      if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setError("Email ou mot de passe incorrect");
    } catch {
      setError("Email ou mot de passe incorrect");
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <h1 className="text-center text-2xl font-semibold text-[#F5F5F0]">Connexion</h1>
          <p className="mt-2 text-center text-sm text-[#A0A0A0]">
            Accédez à votre espace agent
          </p>

          {successMessage ? (
            <p className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200">
              {successMessage}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-sm text-[#A0A0A0]">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="thomas@agence.fr"
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition focus:border-[#B8965A]/70"
                disabled={isSubmitting}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-[#A0A0A0]">Mot de passe</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition focus:border-[#B8965A]/70"
                disabled={isSubmitting}
              />
            </label>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#B8965A] transition hover:text-[#c9a873]"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#B8965A] py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#c9a873] active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          {error ? (
            <p className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <p className="my-8 text-center text-xs text-[#6b6b6b] select-none">
            ────&nbsp;&nbsp;ou&nbsp;&nbsp;────
          </p>

          <p className="text-center text-sm text-[#A0A0A0]">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-medium text-[#B8965A] transition hover:text-[#c9a873] hover:underline"
            >
              Commencer gratuitement
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-6 py-16 text-[#F5F5F0] antialiased">
          <p className="text-sm text-[#A0A0A0]">Chargement…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
