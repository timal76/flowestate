"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
};

type ProfileStats = { annonces: number; emails: number; comptesRendus: number; total: number };

function initialsFromUser(user: ProfileUser | null) {
  const a = (user?.first_name?.trim()?.[0] ?? "").toUpperCase();
  const b = (user?.last_name?.trim()?.[0] ?? "").toUpperCase();
  if (a || b) return `${a}${b}` || a || b || "?";
  const email = user?.email?.trim();
  return email ? (email[0]?.toUpperCase() ?? "?") : "?";
}

function planBadgeLabel(user: ProfileUser) {
  const s = user.subscription_status ?? "";
  if (s === "trial" || s === "trialing") return "Trial";
  const p = user.plan ?? "free";
  if (p === "pro") return "Pro";
  if (p === "starter") return "Starter";
  if (p === "free") return "Gratuit";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function trialDaysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return null;
  return Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [uploadingKind, setUploadingKind] = useState<"avatar" | "logo" | "signature" | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile");
      const data = (await res.json()) as { user?: ProfileUser; stats?: ProfileStats; error?: string };
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Chargement impossible." });
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
    } catch {
      setMessage({ type: "err", text: "Erreur réseau." });
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
    setMessage(null);
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
        setMessage({ type: "err", text: data.error ?? "Enregistrement impossible." });
        return;
      }
      setMessage({ type: "ok", text: "Profil enregistré." });
      await loadProfile();
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      if (fullName) await updateSession({ name: fullName });
    } catch {
      setMessage({ type: "err", text: "Erreur réseau." });
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(kind: "avatar" | "logo" | "signature", file: File) {
    setUploadingKind(kind);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set("kind", kind);
      fd.set("file", file);
      const res = await fetch("/api/user/profile/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { publicUrl?: string; error?: string };
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Upload impossible." });
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
      setMessage({ type: "ok", text: kind === "avatar" ? "Photo mise à jour." : "Fichier enregistré." });
      await loadProfile();
    } catch {
      setMessage({ type: "err", text: "Erreur réseau." });
    } finally {
      setUploadingKind(null);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage({ type: "err", text: data.error ?? "Suppression impossible." });
        setDeleting(false);
        return;
      }
      setDeleteModalOpen(false);
      await signOut({ callbackUrl: "/" });
    } catch {
      setMessage({ type: "err", text: "Erreur réseau." });
      setDeleting(false);
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
  const trialLeft = trialDaysLeft(user.trial_ends_at);
  const isTrialish = user.subscription_status === "trial" || user.subscription_status === "trialing";
  const badge = planBadgeLabel(user);

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

        {message ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              message.type === "ok"
                ? "border-green-500/35 bg-green-500/10 text-green-200"
                : "border-red-500/35 bg-red-500/10 text-red-200"
            }`}
          >
            {message.text}
          </div>
        ) : null}

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
            {isTrialish && trialLeft !== null && trialLeft > 0 ? (
              <span className="text-sm text-[#A0A0A0]">
                Essai : <strong className="text-[#F5F5F0]">{trialLeft}</strong> jour{trialLeft > 1 ? "s" : ""} restant{trialLeft > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          {user.plan === "starter" && !isTrialish ? (
            <Link href="/tarifs" className="mt-4 inline-flex rounded-full border border-[#B8943F] bg-[#B8943F]/20 px-5 py-2 text-sm font-semibold text-[#E8D4A8] transition hover:bg-[#B8943F]/30">
              Passer au Pro
            </Link>
          ) : null}
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
