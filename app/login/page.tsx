"use client";

import Link from "next/link";
import { FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard");
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

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-sm text-[#A0A0A0]">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="thomas@agence.fr"
                className="w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition focus:border-[#B8965A]/70"
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
              />
            </label>

            <div className="flex justify-end">
              <a
                href="#"
                className="text-xs font-medium text-[#B8965A] transition hover:text-[#c9a873]"
              >
                Mot de passe oublié ?
              </a>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#B8965A] py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#c9a873] active:scale-[0.99]"
            >
              Se connecter
            </button>
          </form>

          <p className="my-8 text-center text-xs text-[#6b6b6b] select-none">
            ────&nbsp;&nbsp;ou&nbsp;&nbsp;────
          </p>

          <p className="text-center text-sm text-[#A0A0A0]">
            Pas encore de compte ?{" "}
            <a
              href="#"
              className="font-medium text-[#B8965A] transition hover:text-[#c9a873] hover:underline"
            >
              Commencer gratuitement
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
