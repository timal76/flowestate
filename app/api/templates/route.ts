import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

type TemplateType = "annonce" | "email" | "compte-rendu";

type TemplateRow = {
  id: string;
  user_id: string;
  type: TemplateType;
  name: string;
  content: string;
  created_at: string;
};

function isTemplateType(value: string): value is TemplateType {
  return value === "annonce" || value === "email" || value === "compte-rendu";
}

/** Valide que l'id session est un UUID (aligné sur public.users.id). */
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

export async function GET(request: Request) {
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
    console.error("[templates] GET create client", e);
    return NextResponse.json(
      { error: "Configuration Supabase invalide (service role)." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const typeParam = (url.searchParams.get("type") ?? "").trim();

  let query = supabase
    .from("templates")
    .select("id,user_id,type,name,content,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (typeParam) {
    if (!isTemplateType(typeParam)) {
      return NextResponse.json({ error: "Type invalide." }, { status: 400 });
    }
    query = query.eq("type", typeParam);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[templates] GET error complet:", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ templates: (data ?? []) as TemplateRow[] });
}

export async function POST(request: Request) {
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
    console.error("[templates] POST create client", e);
    return NextResponse.json(
      { error: "Configuration Supabase invalide (service role)." },
      { status: 500 },
    );
  }

  let body: { name?: string; type?: string; content?: string };
  try {
    body = (await request.json()) as { name?: string; type?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const content = (body.content ?? "").trim();
  const rawType = (body.type ?? "").trim();

  if (!name || !content || !rawType) {
    return NextResponse.json({ error: "Nom, type et contenu sont requis." }, { status: 400 });
  }

  if (!isTemplateType(rawType)) {
    return NextResponse.json({ error: "Type invalide." }, { status: 400 });
  }

  const { count, error: countError } = await supabase
    .from("templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    console.error("[templates] POST count error complet:", JSON.stringify(countError));
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Limite de 10 templates atteinte" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: userId,
      type: rawType,
      name,
      content,
    })
    .select("id,user_id,type,name,content,created_at")
    .single();

  if (error) {
    console.error("[templates] POST error complet:", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    console.error("[templates] POST insert: aucune ligne retournée après insert");
    return NextResponse.json({ error: "Impossible de sauvegarder le template." }, { status: 500 });
  }

  return NextResponse.json({ template: data as TemplateRow });
}
