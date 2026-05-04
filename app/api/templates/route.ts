import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const url = new URL(request.url);
  const typeParam = (url.searchParams.get("type") ?? "").trim();

  let query = supabase
    .from("templates")
    .select("id,user_id,type,name,content,created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (typeParam) {
    if (!isTemplateType(typeParam)) {
      return NextResponse.json({ error: "Type invalide." }, { status: 400 });
    }
    query = query.eq("type", typeParam);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[templates] GET", error);
    return NextResponse.json({ error: "Impossible de charger les templates." }, { status: 500 });
  }

  return NextResponse.json({ templates: (data ?? []) as TemplateRow[] });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
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
    .eq("user_id", session.user.id);

  if (countError) {
    console.error("[templates] POST count", countError);
    return NextResponse.json({ error: "Impossible de vérifier la limite de templates." }, { status: 500 });
  }

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Limite de 10 templates atteinte" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: session.user.id,
      type: rawType,
      name,
      content,
    })
    .select("id,user_id,type,name,content,created_at")
    .single();

  if (error || !data) {
    console.error("[templates] POST insert", error);
    return NextResponse.json({ error: "Impossible de sauvegarder le template." }, { status: 500 });
  }

  return NextResponse.json({ template: data as TemplateRow });
}
