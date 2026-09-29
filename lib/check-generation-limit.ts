import { supabase } from "./supabase";
import type { GenerationLimitCheckResult } from "./generation-limit-api";
import {
  CLASSIC_GENERATION_TYPES,
  ESSENTIEL_ACTIVE_PROSPECTS_LIMIT,
  ESSENTIEL_MONTHLY_LIMIT,
  FREE_CLASSIC_GIFTED_LIMIT,
  FREE_PROGRAMMES_NEUFS_GIFTED_LIMIT,
  PRO_MONTHLY_LIMIT,
  PRO_PROGRAMMES_NEUFS_MONTHLY_LIMIT,
} from "./plans";

export {
  FREE_CLASSIC_GIFTED_LIMIT,
  FREE_PROGRAMMES_NEUFS_GIFTED_LIMIT,
  ESSENTIEL_MONTHLY_LIMIT,
  PRO_MONTHLY_LIMIT,
  PRO_PROGRAMMES_NEUFS_MONTHLY_LIMIT,
  ESSENTIEL_ACTIVE_PROSPECTS_LIMIT,
  FREE_MONTHLY_LIMIT,
  CLASSIC_GENERATION_TYPES,
} from "./plans";

function startOfCurrentMonthIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function countClassicGenerations(userId: string, sinceIso?: string): Promise<number> {
  let query = supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("type", [...CLASSIC_GENERATION_TYPES]);

  if (sinceIso) {
    query = query.gte("created_at", sinceIso);
  }

  const { count } = await query;
  return count || 0;
}

async function countProgrammesNeufs(userId: string, sinceIso?: string): Promise<number> {
  let query = supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "programme-neuf");

  if (sinceIso) {
    query = query.gte("created_at", sinceIso);
  }

  const { count } = await query;
  return count || 0;
}

function isLegacyTrialStatus(status: string | null): boolean {
  return status === "trialing" || status === "trial";
}

function isActiveSubscription(status: string | null): boolean {
  return status === "active" || isLegacyTrialStatus(status);
}

export function isFreePlan(plan: string | null, status: string | null): boolean {
  if (isLegacyTrialStatus(status)) return false;
  if (plan === "free") return true;
  if (!plan && (!status || status === "free" || status === "inactive")) return true;
  return false;
}

type UserPlanRow = {
  plan: string | null;
  subscription_status: string | null;
};

async function fetchUserPlan(userId: string): Promise<UserPlanRow | null> {
  const { data: user } = await supabase
    .from("users")
    .select("plan, subscription_status")
    .eq("id", userId)
    .single();

  if (!user) return null;
  return {
    plan: (user.plan as string | null) ?? null,
    subscription_status: (user.subscription_status as string | null) ?? null,
  };
}

/** Quota générations classiques (annonces, emails, comptes-rendus). */
export async function checkGenerationLimit(userId: string): Promise<GenerationLimitCheckResult> {
  const user = await fetchUserPlan(userId);

  if (!user) {
    return {
      allowed: false,
      reason: "Utilisateur introuvable",
      code: "SUBSCRIPTION_REQUIRED",
    };
  }

  const plan = user.plan;
  const status = user.subscription_status;

  if (isLegacyTrialStatus(status)) {
    return { allowed: true };
  }

  // Expert — illimité
  if (plan === "expert" && status === "active") {
    return { allowed: true };
  }

  // Pro — 150/mois (reset mensuel)
  if (plan === "pro" && status === "active") {
    const count = await countClassicGenerations(userId, startOfCurrentMonthIso());
    if (count >= PRO_MONTHLY_LIMIT) {
      return {
        allowed: false,
        reason:
          "Limite de 150 générations/mois atteinte. Passez au plan Expert pour des générations illimitées.",
        count,
        code: "QUOTA_EXCEEDED",
        plan: "pro",
        quotaType: "classic",
      };
    }
    return { allowed: true, count };
  }

  // Essentiel (ou legacy starter) — 40/mois
  if ((plan === "essentiel" || plan === "starter") && status === "active") {
    const count = await countClassicGenerations(userId, startOfCurrentMonthIso());
    if (count >= ESSENTIEL_MONTHLY_LIMIT) {
      return {
        allowed: false,
        reason:
          "Limite de 40 générations/mois atteinte. Passez au plan Pro pour continuer.",
        count,
        code: "QUOTA_EXCEEDED",
        plan: "essentiel",
        quotaType: "classic",
      };
    }
    return { allowed: true, count };
  }

  // Découverte — 5 offertes cumulatives (jamais resettées)
  if (isFreePlan(plan, status)) {
    const count = await countClassicGenerations(userId);
    if (count >= FREE_CLASSIC_GIFTED_LIMIT) {
      return {
        allowed: false,
        reason:
          "Vous avez utilisé vos 5 générations offertes. Passez à Essentiel pour continuer.",
        count,
        code: "QUOTA_EXCEEDED",
        plan: "decouverte",
        quotaType: "classic",
      };
    }
    return { allowed: true, count };
  }

  return {
    allowed: false,
    reason: "Abonnement requis. Passez à Essentiel pour débloquer plus de générations.",
    code: "SUBSCRIPTION_REQUIRED",
    plan: "decouverte",
    quotaType: "classic",
  };
}

/**
 * Accès + quota Programmes neufs.
 * Découverte : 1 offerte (cumulatif). Pro : 5/mois. Expert : illimité. Essentiel : non inclus.
 */
export async function checkProgrammesNeufsLimit(
  userId: string,
): Promise<GenerationLimitCheckResult> {
  const user = await fetchUserPlan(userId);

  if (!user) {
    return {
      allowed: false,
      reason: "Utilisateur introuvable",
      code: "SUBSCRIPTION_REQUIRED",
      quotaType: "programmes-neufs",
    };
  }

  const plan = user.plan;
  const status = user.subscription_status;

  if (isLegacyTrialStatus(status)) {
    return { allowed: true };
  }

  // Expert — illimité
  if (plan === "expert" && isActiveSubscription(status)) {
    return { allowed: true };
  }

  // Pro — 5 conversions/mois
  if (plan === "pro" && status === "active") {
    const count = await countProgrammesNeufs(userId, startOfCurrentMonthIso());
    if (count >= PRO_PROGRAMMES_NEUFS_MONTHLY_LIMIT) {
      return {
        allowed: false,
        reason:
          "Limite de 5 conversions Programmes neufs/mois atteinte. Passez au plan Expert pour un accès illimité.",
        count,
        code: "QUOTA_EXCEEDED",
        plan: "pro",
        quotaType: "programmes-neufs",
      };
    }
    return { allowed: true, count };
  }

  // Essentiel — non inclus → CTA Pro
  if ((plan === "essentiel" || plan === "starter") && status === "active") {
    return {
      allowed: false,
      reason:
        "Programmes neufs n'est pas inclus dans le plan Essentiel. Passez au plan Pro pour y accéder.",
      code: "QUOTA_EXCEEDED",
      plan: "essentiel",
      quotaType: "programmes-neufs",
    };
  }

  // Découverte — 1 génération offerte (cumulatif, jamais resettée)
  if (isFreePlan(plan, status)) {
    const count = await countProgrammesNeufs(userId);
    if (count >= FREE_PROGRAMMES_NEUFS_GIFTED_LIMIT) {
      return {
        allowed: false,
        reason:
          "Vous avez utilisé votre génération Programmes neufs offerte. Passez au plan Pro pour continuer.",
        count,
        code: "QUOTA_EXCEEDED",
        plan: "decouverte",
        quotaType: "programmes-neufs",
      };
    }
    return { allowed: true, count };
  }

  return {
    allowed: false,
    reason: "Abonnement requis pour accéder à Programmes neufs.",
    code: "SUBSCRIPTION_REQUIRED",
    plan: "decouverte",
    quotaType: "programmes-neufs",
  };
}

export async function checkProgrammesNeufsAccess(userId: string): Promise<boolean> {
  const result = await checkProgrammesNeufsLimit(userId);
  return result.allowed;
}

/** @deprecated Préférer checkProgrammesNeufsLimit pour messages + quotaType. */
export async function getProgrammesNeufsBlockReason(userId: string): Promise<string | null> {
  const result = await checkProgrammesNeufsLimit(userId);
  if (result.allowed) return null;
  return result.reason ?? "Accès Programmes neufs refusé.";
}

/** Statuts encore « actifs » (hors dossiers clos). */
const ACTIVE_PROSPECT_STATUSES = [
  "Nouveau",
  "Contacté",
  "Visite planifiée",
  "Offre faite",
] as const;

async function countActiveProspects(userId: string): Promise<number> {
  const { count } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("statut", [...ACTIVE_PROSPECT_STATUSES]);

  return count || 0;
}

/** Limite CRM : 50 fiches actives sur Essentiel. Pro/Expert illimités. */
export async function checkProspectCreationLimit(
  userId: string,
): Promise<GenerationLimitCheckResult> {
  const user = await fetchUserPlan(userId);

  if (!user) {
    return {
      allowed: false,
      reason: "Utilisateur introuvable",
      code: "SUBSCRIPTION_REQUIRED",
      quotaType: "crm-prospects",
    };
  }

  const plan = user.plan;
  const status = user.subscription_status;

  if (isLegacyTrialStatus(status)) {
    return { allowed: true };
  }

  if (
    (plan === "pro" || plan === "expert") &&
    isActiveSubscription(status)
  ) {
    return { allowed: true };
  }

  if ((plan === "essentiel" || plan === "starter") && status === "active") {
    const count = await countActiveProspects(userId);
    if (count >= ESSENTIEL_ACTIVE_PROSPECTS_LIMIT) {
      return {
        allowed: false,
        reason:
          "Limite de 50 fiches prospects actives atteinte. Passez au plan Pro pour un CRM illimité.",
        count,
        code: "QUOTA_EXCEEDED",
        plan: "essentiel",
        quotaType: "crm-prospects",
      };
    }
    return { allowed: true, count };
  }

  // Découverte / sans abonnement : pas de CRM — laisser passer côté API
  // (exclusion marketing) ou bloquer ? On laisse créer pour ne pas casser
  // l'existant ; le marketing indique « Pas de CRM » en passage UI.
  return { allowed: true };
}
