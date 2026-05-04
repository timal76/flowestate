import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

type TemplateRow = {
  id: string;
  user_id: string;
  type: "annonce" | "email" | "compte-rendu";
  name: string;
  content: string;
  created_at: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getOwnedTemplate(supabase: SupabaseClient, userId: string, id: string) {
  const { data, error } = await supabase
    .from("templates")
    .select("id,user_id,type,name,content,created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return { data: data as TemplateRow | null, error };
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const userId = session.user.id;
  if (!isUuid(userId)) {
    return NextResponse.json({ error: "Identifiant utilisateur invalide." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error("[templates/:id] DELETE create client", e);
    return NextResponse.json(
      { error: "Configuration Supabase invalide (service role)." },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const { data, error } = await getOwnedTemplate(supabase, userId, id);
  if (error) {
    console.error("[templates/:id] DELETE check error complet:", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[templates/:id] DELETE error complet:", JSON.stringify(deleteError));
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const userId = session.user.id;
  if (!isUuid(userId)) {
    return NextResponse.json({ error: "Identifiant utilisateur invalide." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error("[templates/:id] PATCH create client", e);
    return NextResponse.json(
      { error: "Configuration Supabase invalide (service role)." },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const { data, error } = await getOwnedTemplate(supabase, userId, id);
  if (error) {
    console.error("[templates/:id] PATCH check error complet:", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
  }

  let body: { name?: string; content?: string };
  try {
    body = (await request.json()) as { name?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const payload: { name?: string; content?: string } = {};
  if (typeof body.name === "string") payload.name = body.name.trim();
  if (typeof body.content === "string") payload.content = body.content.trim();

  if (!Object.keys(payload).length) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("templates")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id,user_id,type,name,content,created_at")
    .single();

  if (updateError) {
    console.error("[templates/:id] PATCH error complet:", JSON.stringify(updateError));
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updated) {
    console.error("[templates/:id] PATCH: aucune ligne retournée");
    return NextResponse.json({ error: "Impossible de mettre à jour le template." }, { status: 500 });
  }

  return NextResponse.json({ template: updated as TemplateRow });
}
