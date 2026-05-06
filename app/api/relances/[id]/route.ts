import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type Context = { params: Promise<{ id: string }> };

async function ensureOwned(supabase: ReturnType<typeof createServiceClient>, userId: string, id: string) {
  const { data, error } = await supabase.from("relances").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
  return { data, error };
}

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const supabase = createServiceClient();
  const { id } = await context.params;
  const { data: owned } = await ensureOwned(supabase, session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Relance introuvable." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};
  ["titre", "message", "scheduled_at", "type", "statut", "prospect_id", "prospect_email", "sent_at"].forEach((k) => {
    if (k in body) payload[k] = body[k];
  });

  const { data, error } = await supabase
    .from("relances")
    .update(payload)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select("id,user_id,prospect_id,titre,message,scheduled_at,sent_at,statut,type,prospect_email,created_at")
    .single();

  if (error || !data) {
    console.error("[relances/:id] PATCH", JSON.stringify(error));
    return NextResponse.json({ error: error?.message ?? "Impossible de mettre à jour." }, { status: 500 });
  }

  return NextResponse.json({ relance: data });
}

export async function DELETE(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const supabase = createServiceClient();
  const { id } = await context.params;
  const { data: owned } = await ensureOwned(supabase, session.user.id, id);
  if (!owned) return NextResponse.json({ error: "Relance introuvable." }, { status: 404 });

  const { error } = await supabase.from("relances").delete().eq("id", id).eq("user_id", session.user.id);
  if (error) {
    console.error("[relances/:id] DELETE", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
