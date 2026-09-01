"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import SiteHeader from "@/components/site-header";
import { supabase } from "@/lib/supabase";

type ProfileUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  agency_name: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  signature_url: string | null;
  plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
};

type ProfileStats = { annonces: number; emails: number; comptesRendus: number; total: number };
type SmtpState = {
  smtp_host: string;
  smtp_port: number;
  smtp_email: string;
  smtp_configured: boolean;
};

const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = 587;

function initialsFromUser(user: ProfileUser | null) {
  const a = (user?.first_name?.trim()?.[0] ?? "").toUpperCase();
  const b = (user?.last_name?.trim()?.[0] ?? "").toUpperCase();
  if (a || b) return `${a}${b}` || a || b || "?";
  const email = user?.email?.trim();
  return email ? (email[0]?.toUpperCase() ?? "?") : "?";
}

function planBadgeLabel(user: ProfileUser) {
  const p = user.plan ?? "free";
  if (p === "pro") return "Pro";
  if (p === "expert") return "Expert";
  if (p === "essentiel" || p === "starter") return "Essentiel";
  if (p === "free") return "Découverte";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function storagePublicUrl(path: string) {
  return supabase.storage.from("profiles").getPublicUrl(path).data.publicUrl;
}

function resolveImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return storagePublicUrl(url.replace(/^\//, ""));
}

const sectionClass = "rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8";
const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#A0A0A0]";
const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-[#F5F5F0] outline-none transition placeholder:text-[#666] focus:border-[#C9A96E]/50";

export default function ProfilPage() {
  const router = useRouter();
  const { status, update: updateSession } = useSession();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [uploadingKind, setUploadingKind] = useState<"avatar" | "logo" | "signature" | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [smtp, setSmtp] = useState<SmtpState | null>(null);
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpEditMode, setSmtpEditMode] = useState(false);
  const [smtpGuideOpen, setSmtpGuideOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile");
      const data = (await res.json()) as { user?: ProfileUser; stats?: ProfileStats; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Chargement impossible.");
        setUser(null);
        setStats(null);
        return;
      }
      if (data.user) {
        setUser(data.user);
        setFirstName(data.user.first_name ?? "");
        setLastName(data.user.last_name ?? "");
        setPhone(data.user.phone ?? "");
        setAgencyName(data.user.agency_name ?? "");
      }
      if (data.stats) setStats(data.stats);

      const smtpRes = await fetch("/api/user/smtp");
      const smtpData = (await smtpRes.json()) as { smtp?: SmtpState };
      if (smtpRes.ok && smtpData.smtp) {
        setSmtp(smtpData.smtp);
        setSmtpEmail(smtpData.smtp.smtp_email ?? "");
      }
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated") void loadProfile();
  }, [status, router, loadProfile]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone: phone.trim() || null,
          agency_name: agencyName.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Enregistrement impossible.");
        return;
      }
      toast.success("Profil sauvegardé !");
      await loadProfile();
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (fullName) await updateSession({ name: fullName });
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(kind: "avatar" | "logo" | "signature", file: File) {
    setUploadingKind(kind);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/user/profile/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { publicUrl?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Upload impossible.");
        return;
      }
      const publicUrl = data.publicUrl;
      if (publicUrl) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                ...(kind === "avatar"
                  ? { avatar_url: publicUrl }
                  : kind === "logo"
                    ? { logo_url: publicUrl }
                    : { signature_url: publicUrl }),
              }
            : prev
        );
      }
      toast.success("Fichier uploadé avec succès !");
      await loadProfile();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleOpenBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        toast.error(data.error ?? "Impossible d'ouvrir le portail client.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user/profile", { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Suppression impossible.");
        setDeleting(false);
        return;
      }
      setDeleteModalOpen(false);
      await signOut({ callbackUrl: "/" });
    } catch {
      toast.error("Erreur réseau.");
      setDeleting(false);
    }
  }

  async function handleSaveSmtp() {
    setSmtpSaving(true);
    try {
      const res = await fetch("/api/user/smtp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp_host: GMAIL_SMTP_HOST,
          smtp_port: GMAIL_SMTP_PORT,
          smtp_email: smtpEmail,
          smtp_password: smtpPassword,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Impossible de se connecter. Vérifiez vos identifiants.");
        return;
      }
      toast.success("✓ Compte email connecté");
      setSmtpPassword("");
      setSmtpEditMode(false);
      await loadProfile();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleDisconnectSmtp() {
    setSmtpSaving(true);
    try {
      const res = await fetch("/api/user/smtp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtp_configured: false }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        toast.error(data.error ?? "Impossible de déconnecter.");
        return;
      }
      toast.success("Compte email déconnecté");
      setSmtpPassword("");
      setSmtpEditMode(true);
      await loadProfile();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSmtpSaving(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && loading && !user)) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
        <SiteHeader />
        <main className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 pb-24 pt-32 md:px-10">
          <p className="text-sm text-[#A0A0A0]">Chargement du profil…</p>
        </main>
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-10">
          <p className="text-sm text-[#A0A0A0]">Redirection…</p>
        </main>
      </div>
    );
  }

  const avatarSrc = resolveImageUrl(user.avatar_url);
  const logoSrc = resolveImageUrl(user.logo_url);
  const signatureSrc = resolveImageUrl(user.signature_url);
  const isTrialish = user.subscription_status === "trial" || user.subscription_status === "trialing";
  const badge = planBadgeLabel(user);
  const smtpConfigured = smtp?.smtp_configured === true;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-90"
        style={{
          background: `radial-gradient(700px circle at 15% 0%, rgba(201, 169, 110, 0.12), transparent 55%)`,
        }}
        aria-hidden
      />
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-10 px-6 pb-24 pt-28 md:px-10 md:pt-32">
        <header className="flex flex-col items-center gap-4 text-center">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void uploadFile("avatar", f);
            }}
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingKind === "avatar"}
            className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#C9A96E]/50 bg-[#141414] text-2xl font-semibold text-[#C9A96E] transition hover:border-[#C9A96E] disabled:opacity-60"
            aria-label="Changer la photo de profil"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{initialsFromUser(user)}</span>
            )}
            <span className="pointer-events-none absolute inset-0 flex items-end justify-center bg-black/50 pb-2 text-[10px] font-medium text-[#F5F5F0] opacity-0 transition group-hover:opacity-100">
              Modifier
            </span>
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {`${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "Mon profil"}
            </h1>
            <p className="mt-1 text-sm text-[#A0A0A0]">{user.email}</p>
            <span className="mt-3 inline-flex rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/15 px-4 py-1 text-xs font-semibold tracking-wide text-[#C9A96E]">
              {badge}
            </span>
          </div>
        </header>

        <section className={sectionClass} aria-labelledby="profil-info">
          <h2 id="profil-info" className="mb-6 text-lg font-semibold text-[#C9A96E]">
            Informations personnelles
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                Prénom
              </label>
              <input id="firstName" className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                Nom
              </label>
              <input id="lastName" className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input id="email" className={`${inputClass} cursor-not-allowed opacity-70`} readOnly value={user.email} />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>
                Téléphone
              </label>
              <input id="phone" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 …" />
            </div>
            <div>
              <label htmlFor="agency" className={labelClass}>
                Nom de l&apos;agence
              </label>
              <input id="agency" className={inputClass} value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="mt-6 inline-flex items-center justify-center rounded-full border border-[#C9A96E] bg-[#C9A96E] px-8 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Sauvegarder"}
          </button>
        </section>

        <section className={sectionClass} aria-labelledby="profil-files">
          <h2 id="profil-files" className="mb-2 text-lg font-semibold text-[#C9A96E]">
            Mes fichiers professionnels
          </h2>
          <p className="mb-6 text-sm text-[#A0A0A0]">
            Ces fichiers seront utilisés automatiquement dans vos comptes-rendus et emails.
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <span className={labelClass}>Logo de l&apos;agence</span>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadFile("logo", f);
                }}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingKind === "logo"}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#C9A96E]/35 bg-[#0A0A0A] px-4 py-8 text-sm text-[#A0A0A0] transition hover:border-[#C9A96E]/55 hover:text-[#F5F5F0] disabled:opacity-50"
              >
                {logoSrc ? <img src={logoSrc} alt="Logo agence" className="max-h-24 max-w-full object-contain" /> : <span>Cliquez pour envoyer un logo</span>}
              </button>
            </div>
            <div>
              <span className={labelClass}>Signature électronique</span>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadFile("signature", f);
                }}
              />
              <button
                type="button"
                onClick={() => signatureInputRef.current?.click()}
                disabled={uploadingKind === "signature"}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#C9A96E]/35 bg-[#0A0A0A] px-4 py-8 text-sm text-[#A0A0A0] transition hover:border-[#C9A96E]/55 hover:text-[#F5F5F0] disabled:opacity-50"
              >
                {signatureSrc ? <img src={signatureSrc} alt="Signature" className="max-h-24 max-w-full object-contain" /> : <span>Cliquez pour envoyer une signature</span>}
              </button>
            </div>
          </div>
        </section>

        <section className={sectionClass} aria-labelledby="profil-sub">
          <h2 id="profil-sub" className="mb-6 text-lg font-semibold text-[#C9A96E]">
            Mon abonnement
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/12 px-4 py-1.5 text-sm font-semibold text-[#C9A96E]">
              Plan : {badge}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {user.stripe_customer_id ? (
              <button
                type="button"
                onClick={() => void handleOpenBillingPortal()}
                disabled={portalLoading}
                className="inline-flex items-center justify-center rounded-full border border-[#C9A96E] bg-transparent px-5 py-2 text-sm font-semibold text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:cursor-wait disabled:opacity-60"
              >
                {portalLoading ? "Redirection…" : "Gérer mon abonnement"}
              </button>
            ) : null}
            {user.plan === "starter" && !isTrialish ? (
              <Link href="/tarifs" className="inline-flex rounded-full border border-[#B8943F] bg-[#B8943F]/20 px-5 py-2 text-sm font-semibold text-[#E8D4A8] transition hover:bg-[#B8943F]/30">
                Passer au Pro
              </Link>
            ) : null}
          </div>
          {stats ? (
            <div className="mt-8 grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <p className="text-2xl font-semibold text-[#C9A96E]">{stats.annonces}</p>
                <p className="text-xs text-[#A0A0A0]">Annonces</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <p className="text-2xl font-semibold text-[#C9A96E]">{stats.emails}</p>
                <p className="text-xs text-[#A0A0A0]">Emails</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                <p className="text-2xl font-semibold text-[#C9A96E]">{stats.comptesRendus}</p>
                <p className="text-xs text-[#A0A0A0]">Comptes-rendus</p>
              </div>
              <p className="text-center text-sm text-[#A0A0A0] sm:col-span-3">
                Total généré depuis le début : <strong className="text-[#F5F5F0]">{stats.total}</strong>
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6" aria-labelledby="profil-smtp">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 id="profil-smtp" className="text-lg font-medium text-[#F5F5F0]">Compte email</h2>
            {smtpConfigured ? (
              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs text-green-400">✓ Connecté</span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[#555]">Non configuré</span>
            )}
          </div>
          <p className="mb-5 mt-1 text-sm text-[#A0A0A0]">
            Connectez votre boîte mail professionnelle pour envoyer les relances directement depuis FlowEstate.
          </p>

          {smtpConfigured && !smtpEditMode ? (
            <div className="space-y-4">
              <p className="text-sm text-[#A0A0A0]">
                Email configuré : <span className="text-[#F5F5F0]">{smtp?.smtp_email}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setSmtpEditMode(true)} className="rounded-full border border-[#C9A96E] px-5 py-2 text-sm text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A]">
                  Modifier
                </button>
                <button type="button" onClick={() => void handleDisconnectSmtp()} disabled={smtpSaving} className="rounded-full border border-white/10 px-5 py-2 text-sm text-[#A0A0A0] transition hover:border-red-500/30 hover:text-red-300 disabled:opacity-50">
                  Déconnecter
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#0A0A0A] px-4 py-3">
                <p className="mb-1 text-xs text-[#A0A0A0]">Fournisseur</p>
                <div className="flex items-center gap-2 text-sm font-medium text-[#F5F5F0]">
                  <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 6h16v12H4z" fill="#fff" opacity="0.92" />
                    <path d="M4 7.5 12 13l8-5.5" stroke="#EA4335" strokeWidth={2} strokeLinejoin="round" />
                    <path d="M4 6v12h4V9.3L4 6Z" fill="#34A853" />
                    <path d="M20 6v12h-4V9.3L20 6Z" fill="#4285F4" />
                    <path d="M4 6l8 6 8-6" stroke="#FBBC05" strokeWidth={2} strokeLinejoin="round" />
                  </svg>
                  Gmail
                </div>
                <p className="mt-1 text-xs text-[#555]">{GMAIL_SMTP_HOST} · port {GMAIL_SMTP_PORT}</p>
              </div>

              <label className="block space-y-1">
                <span className="text-xs text-[#A0A0A0]">Adresse email</span>
                <input type="email" className={inputClass} value={smtpEmail} onChange={(e) => setSmtpEmail(e.target.value)} />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-[#A0A0A0]">Mot de passe d'application</span>
                <input type="password" className={inputClass} value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
                <p className="text-xs text-[#555]">Pour Gmail : activez la validation en 2 étapes puis créez un mot de passe d'application sur myaccount.google.com</p>
              </label>

              <p className="text-xs text-[#555]">Votre mot de passe est chiffré et stocké de manière sécurisée.</p>
              <button type="button" onClick={() => void handleSaveSmtp()} disabled={smtpSaving} className="inline-flex items-center rounded-full border border-[#C9A96E] px-5 py-2 text-sm text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-[#0A0A0A] disabled:opacity-50">
                {smtpSaving ? "Vérification..." : "Tester et enregistrer"}
              </button>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <button
              type="button"
              onClick={() => setSmtpGuideOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="inline-flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="text-[#C9A96E]" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4" />
                  <path d="M12 17h.01" />
                </svg>
                <span className="text-sm text-[#A0A0A0]">Comment configurer votre email ?</span>
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={`text-[#A0A0A0] transition-transform ${smtpGuideOpen ? "rotate-180" : ""}`} aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {smtpGuideOpen ? (
              <div className="mt-4">
                <div>
                  <div className="mb-3 border-b border-white/5 pb-3">
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C9A96E]/30 bg-[#C9A96E]/15 text-xs font-medium text-[#C9A96E]">1</span>
                      <div>
                        <p className="text-sm font-medium text-[#F5F5F0]">Activez la validation en 2 étapes</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#A0A0A0]">Allez sur myaccount.google.com → Sécurité → Validation en 2 étapes</p>
                        <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#C9A96E] hover:underline">Ouvrir Google Account →</a>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3 border-b border-white/5 pb-3">
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C9A96E]/30 bg-[#C9A96E]/15 text-xs font-medium text-[#C9A96E]">2</span>
                      <div>
                        <p className="text-sm font-medium text-[#F5F5F0]">Créez un mot de passe d'application</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#A0A0A0]">Dans Sécurité → cherchez 'Mots de passe des applications' → Créer → nommez-le 'FlowEstate'</p>
                        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-[#C9A96E] hover:underline">Créer un mot de passe →</a>
                      </div>
                    </div>
                  </div>
                  <div className="mb-3 border-b border-white/5 pb-3">
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C9A96E]/30 bg-[#C9A96E]/15 text-xs font-medium text-[#C9A96E]">3</span>
                      <div>
                        <p className="text-sm font-medium text-[#F5F5F0]">Copiez le mot de passe généré</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#A0A0A0]">Google génère un mot de passe de 16 caractères. Copiez-le — vous ne pourrez plus le voir après.</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#C9A96E]/30 bg-[#C9A96E]/15 text-xs font-medium text-[#C9A96E]">4</span>
                      <div>
                        <p className="text-sm font-medium text-[#F5F5F0]">Entrez vos identifiants ci-dessus</p>
                        <p className="mt-1 text-xs leading-relaxed text-[#A0A0A0]">Entrez votre adresse Gmail et collez le mot de passe de 16 caractères.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <footer className="mt-12 border-t border-white/10 pb-8 pt-6 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="cursor-pointer border-0 bg-transparent p-0 text-sm text-[#A0A0A0] transition hover:text-white"
            >
              Se déconnecter
            </button>
            <span className="text-sm text-[#666]" aria-hidden>
              ·
            </span>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="cursor-pointer border-0 bg-transparent p-0 text-sm text-red-400/50 transition hover:text-red-400"
            >
              Supprimer mon compte
            </button>
          </div>
        </footer>
      </main>

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
            <h3 id="delete-title" className="text-lg font-semibold text-[#F5F5F0]">
              Supprimer définitivement le compte ?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#A0A0A0]">
              Cette action est irréversible : profil, fichiers stockés et générations associées seront supprimés.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDeleteModalOpen(false)} disabled={deleting} className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-[#F5F5F0] transition hover:bg-white/5">
                Annuler
              </button>
              <button type="button" onClick={() => void handleDeleteAccount()} disabled={deleting} className="rounded-full border border-red-500/60 bg-red-600/80 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60">
                {deleting ? "Suppression…" : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
