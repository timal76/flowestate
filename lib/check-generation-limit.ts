import { supabase } from "./supabase";
import type { GenerationLimitCheckResult } from "./generation-limit-api";

export const FREE_MONTHLY_LIMIT = 5;
export const ESSENTIEL_MONTHLY_LIMIT = 100;

function startOfCurrentMonthIso() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

async function countGenerationsThisMonth(userId: string): Promise<number> {
  const { count } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfCurrentMonthIso());

  return count || 0;
}

function isLegacyTrialStatus(status: string | null): boolean {
  return status === "trialing" || status === "trial";
}

function isFreePlan(plan: string | null, status: string | null): boolean {
  if (isLegacyTrialStatus(status)) return false;
  if (plan === "free") return true;
  if (!plan && (!status || status === "free" || status === "inactive")) return true;
  return false;
}

export async function checkGenerationLimit(userId: string): Promise<GenerationLimitCheckResult> {
  const { data: user } = await supabase
    .from("users")
    .select("plan, subscription_status")
    .eq("id", userId)
    .single();

  if (!user) {
    return {
      allowed: false,
      reason: "Utilisateur introuvable",
      code: "SUBSCRIPTION_REQUIRED",
    };
  }

  const plan = (user.plan as string | null) ?? null;
  const status = (user.subscription_status as string | null) ?? null;

  // Legacy trial users — unlimited during trial
  if (isLegacyTrialStatus(status)) {
    return { allowed: true };
  }

  // Pro / Expert with active subscription
  if ((plan === "pro" || plan === "expert") && status === "active") {
    return { allowed: true };
  }

  // Essentiel or legacy starter with active subscription
  if ((plan === "essentiel" || plan === "starter") && status === "active") {
    const count = await countGenerationsThisMonth(userId);
    if (count >= ESSENTIEL_MONTHLY_LIMIT) {
      return {
        allowed: false,
        reason:
          "Limite de 100 générations/mois atteinte. Passez au plan Pro pour des générations illimitées.",
        count,
        code: "QUOTA_EXCEEDED",
        plan: "essentiel",
      };
    }
    return { allowed: true, count };
  }

  // Free plan
  if (isFreePlan(plan, status)) {
    const count = await countGenerationsThisMonth(userId);
    if (count >= FREE_MONTHLY_LIMIT) {
      return {
        allowed: false,
        reason:
          "Vous avez utilisé vos 5 générations gratuites de ce mois-ci. Passez à Essentiel pour continuer.",
        count,
        code: "QUOTA_EXCEEDED",
        plan: "decouverte",
      };
    }
    return { allowed: true, count };
  }

  return {
    allowed: false,
    reason: "Abonnement requis. Passez à Essentiel pour débloquer plus de générations.",
    code: "SUBSCRIPTION_REQUIRED",
    plan: "decouverte",
  };
}

export async function checkProgrammesNeufsAccess(userId: string): Promise<boolean> {
  const reason = await getProgrammesNeufsBlockReason(userId);
  return reason === null;
}

export async function getProgrammesNeufsBlockReason(userId: string): Promise<string | null> {
  const { data: user } = await supabase
    .from("users")
    .select("plan, subscription_status")
    .eq("id", userId)
    .single();

  if (!user) return "Utilisateur introuvable";

  const plan = user.plan as string | null;
  const status = user.subscription_status as string | null;

  if (plan === "free" || (!plan && (!status || status === "free"))) {
    return "Programmes neufs est disponible à partir du plan Expert.";
  }

  const isActive =
    status === "active" || status === "trialing" || status === "trial";

  if (plan === "expert" && isActive) {
    return null;
  }

  return "La feature Programmes neufs est réservée au plan Expert. Passez au plan Expert pour y accéder.";
}
