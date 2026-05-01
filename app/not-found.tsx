import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 70% 45% at 50% 35%, rgba(184, 150, 90, 0.14), transparent),
            radial-gradient(ellipse 50% 35% at 20% 85%, rgba(184, 150, 90, 0.05), transparent)
          `,
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="flex max-w-lg flex-col items-center text-center">
          <p
            className="select-none font-bold leading-[0.92] tracking-tight text-[#B8965A]"
            style={{ fontSize: "clamp(96px, 18vw, 150px)" }}
          >
            404
          </p>

          <h1 className="mt-8 text-3xl font-semibold tracking-tight text-[#F5F5F0] md:text-4xl">
            Page introuvable
          </h1>

          <p className="mt-4 max-w-md text-base leading-relaxed text-[#A0A0A0] md:text-lg">
            Cette page n&apos;existe pas ou a été déplacée.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex min-w-[200px] items-center justify-center rounded-xl bg-[#B8965A] px-8 py-3.5 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#c9a873] active:scale-[0.99]"
            >
              Retour à l&apos;accueil
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-w-[200px] items-center justify-center rounded-xl border-2 border-[#B8965A] bg-transparent px-8 py-3.5 text-sm font-semibold text-[#B8965A] transition hover:bg-[#B8965A] hover:text-[#0A0A0A] active:scale-[0.99]"
            >
              Accéder au Dashboard
            </Link>
          </div>
        </div>
      </div>

      <footer className="relative z-10 pb-10 pt-6 text-center">
        <Link
          href="/"
          className="text-sm font-medium tracking-wide text-[#B8965A]/70 transition hover:text-[#B8965A]"
        >
          FlowEstate
        </Link>
      </footer>
    </main>
  );
}
