import { supabase } from "./supabase";

export async function checkProgrammesNeufsAccess(userId: string): Promise<boolean> {
  const { data: user } = await supabase
    .from("users")
    .select("plan, subscription_status")
    .eq("id", userId)
    .single();

  if (!user) return false;

  const plan = user.plan as string | null;
  const status = user.subscription_status as string | null;
  const isActive = status === "active" || status === "trialing" || status === "trial";

  return plan === "expert" && isActive;
}
