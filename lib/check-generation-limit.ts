import { supabase } from "./supabase";

export async function checkGenerationLimit(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  count?: number;
}> {
  const { data: user } = await supabase
    .from("users")
    .select("plan, subscription_status")
    .eq("id", userId)
    .single();

  if (!user) return { allowed: false, reason: "Utilisateur introuvable" };

  if (
    user.subscription_status === "trialing" ||
    user.subscription_status === "trial" ||
    user.plan === "pro" ||
    (user.subscription_status === "active" && user.plan === "pro")
  ) {
    return { allowed: true };
  }

  if (user.plan === "starter" || user.subscription_status === "active") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth.toISOString());

    if ((count || 0) >= 30) {
      return {
        allowed: false,
        reason:
          "Limite de 30 générations/mois atteinte. Passez au plan Pro pour des générations illimitées.",
        count: count || 0,
      };
    }
    return { allowed: true, count: count || 0 };
  }

  return {
    allowed: false,
    reason: "Abonnement requis. Commencez votre essai gratuit de 14 jours.",
  };
}
