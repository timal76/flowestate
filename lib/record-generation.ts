import { createClient } from "@supabase/supabase-js";

import { auth } from "@/app/api/auth/[...nextauth]/route";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Priorité : en-tête `x-user-id`, sinon session NextAuth (ex. compte démo sans en-tête). */
export async function resolveGenerationUserId(request: Request): Promise<string | null> {
  const fromHeader = request.headers.get("x-user-id")?.trim();
  if (fromHeader && isUuid(fromHeader)) return fromHeader;
  const session = await auth();
  const fromSession = session?.user?.id?.trim();
  if (fromSession && isUuid(fromSession)) return fromSession;
  return null;
}

export async function recordGenerationFromRequest(
  request: Request,
  params: {
    type: "annonce" | "email" | "compte-rendu";
    description: string;
    prospectName: string | null;
    prospectId: string | null;
    content: string;
  },
): Promise<void> {
  const userId = await resolveGenerationUserId(request);
  if (!userId) {
    console.error(
      "[generations] insert skipped: aucun user_id valide (header x-user-id ni session)",
    );
    return;
  }

  const supabase = createServiceClient();
  if (!supabase) {
    console.error("[generations] insert skipped: configuration Supabase service role manquante");
    return;
  }

  const { error } = await supabase.from("generations").insert({
    type: params.type,
    user_id: userId,
    description: params.description,
    prospect_name: params.prospectName,
    prospect_id: params.prospectId,
    content: params.content.trim() || null,
  });

  if (error) {
    console.error("[generations] insert failed", JSON.stringify(error));
  }
}
