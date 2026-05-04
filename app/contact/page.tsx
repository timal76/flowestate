"use client";

import { FormEvent, useState } from "react";

import SiteHeader from "@/components/site-header";

const inputClass =
  "w-full rounded-xl border border-white/15 bg-[#121212] px-4 py-3 text-[#F5F5F0] outline-none transition duration-300 placeholder:text-[#A0A0A0]/70 focus:border-[#C9A96E]";

const selectClass =
  "w-full appearance-none rounded-xl border border-white/15 bg-[#121212] pl-4 pr-10 py-3 text-[#F5F5F0] outline-none transition duration-300 focus:border-[#C9A96E]";

const faqItems = [
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "À l'inscription, vous bénéficiez de 14 jours d'accès complet à FlowEstate sans engagement. Vous pouvez annuler avant la fin de la période depuis votre espace ou le portail de facturation Stripe.",
  },
  {
    q: "Puis-je annuler mon abonnement ?",
    a: "Oui, à tout moment. Gérez votre abonnement depuis la page Profil et le portail client Stripe : pas de frais cachés après résiliation au terme de la période en cours.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Vos informations sont hébergées sur une infrastructure moderne (connexion chiffrée, authentification sécurisée). Nous ne vendons pas vos données et les utilisons uniquement pour faire fonctionner le service.",
  },
  {
    q: "Comment modifier mon abonnement ?",
    a: "Connectez-vous à FlowEstate, ouvrez votre Profil puis la section abonnement pour accéder au portail Stripe : changement de plan, moyen de paiement et factures.",
  },
] as const;

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setSending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const subject = String(fd.get("subject") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSubmitError(typeof data.error === "string" ? data.error : "Erreur envoi");
        return;
      }
      setSent(true);
    } catch {
      setSubmitError("Impossible d'envoyer le message. Réessayez plus tard.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] antialiased">
      <SiteHeader />

      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(700px circle at 8% 8%, rgba(201,169,110,0.12), transparent 65%)",
        }}
        aria-hidden
      />

      <section className="px-6 pb-20 pt-28 md:px-10 md:pt-36">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-14 max-w-2xl space-y-4">
            <h1 className="text-3xl font-semibold md:text-5xl">On est là pour vous aider</h1>
            <p className="text-lg leading-relaxed text-[#A0A0A0] md:text-xl">
              Une question ? Un problème ? Contactez-nous, on répond sous 24h.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-start lg:gap-12">
            {/* Formulaire */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 md:p-10">
              {!sent ? (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-[#A0A0A0]">
                      Prénom et nom
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      className={inputClass}
                      placeholder="Jean Dupont"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-[#A0A0A0]">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className={inputClass}
                      placeholder="vous@exemple.fr"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="mb-2 block text-sm font-medium text-[#A0A0A0]">
                      Sujet
                    </label>
                    <div className="relative">
                      <select id="contact-subject" name="subject" required className={selectClass}>
                        <option value="general">Question générale</option>
                        <option value="technical">Problème technique</option>
                        <option value="billing">Facturation</option>
                        <option value="suggestion">Suggestion</option>
                      </select>
                      <span
                        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C9A96E]"
                        aria-hidden
                      >
                        ▼
                      </span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-[#A0A0A0]">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      required
                      className={`${inputClass} resize-y min-h-[8rem]`}
                      placeholder="Décrivez votre demande..."
                    />
                  </div>
                  {submitError ? (
                    <p className="text-sm text-red-400" role="alert">
                      {submitError}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={sending}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[#C9A96E] px-6 py-3.5 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#d4b882] enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:min-w-[200px]"
                  >
                    {sending ? "Envoi en cours…" : "Envoyer le message"}
                  </button>
                </form>
              ) : (
                <div
                  className="rounded-xl border border-[#C9A96E]/35 bg-[#C9A96E]/10 px-5 py-6 text-center"
                  role="status"
                >
                  <p className="text-base font-medium text-[#C9A96E]">
                    Message envoyé ! On vous répond sous 24h.
                  </p>
                </div>
              )}
            </div>

            {/* Infos + FAQ */}
            <div className="space-y-8">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
                <h2 className="text-lg font-semibold text-[#C9A96E]">Nos coordonnées</h2>
                <dl className="mt-6 space-y-5 text-sm">
                  <div>
                    <dt className="text-[#A0A0A0]">Email</dt>
                    <dd className="mt-1">
                      <a
                        href="mailto:contact@flowestate.fr"
                        className="font-medium text-[#F5F5F0] underline decoration-[#C9A96E]/50 underline-offset-2 transition hover:text-[#C9A96E]"
                      >
                        contact@flowestate.fr
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#A0A0A0]">Temps de réponse</dt>
                    <dd className="mt-1 text-[#F5F5F0]">Sous 24h en jours ouvrés</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
                <h2 className="text-lg font-semibold text-[#F5F5F0]">FAQ rapide</h2>
                <ul className="mt-6 space-y-6">
                  {faqItems.map(({ q, a }) => (
                    <li key={q} className="border-b border-white/10 pb-6 last:border-0 last:pb-0">
                      <p className="font-medium text-[#C9A96E]">{q}</p>
                      <p className="mt-2 text-sm leading-relaxed text-[#A0A0A0]">{a}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
