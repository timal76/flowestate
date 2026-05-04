import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

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

async function getOwnedTemplate(userId: string, id: string) {
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

  const { id } = await context.params;
  const { data, error } = await getOwnedTemplate(session.user.id, id);
  if (error) {
    console.error("[templates/:id] DELETE check", error);
    return NextResponse.json({ error: "Impossible de vérifier le template." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (deleteError) {
    console.error("[templates/:id] DELETE", deleteError);
    return NextResponse.json({ error: "Impossible de supprimer le template." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await context.params;
  const { data, error } = await getOwnedTemplate(session.user.id, id);
  if (error) {
    console.error("[templates/:id] PATCH check", error);
    return NextResponse.json({ error: "Impossible de vérifier le template." }, { status: 500 });
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
    .eq("user_id", session.user.id)
    .select("id,user_id,type,name,content,created_at")
    .single();

  if (updateError || !updated) {
    console.error("[templates/:id] PATCH", updateError);
    return NextResponse.json({ error: "Impossible de mettre à jour le template." }, { status: 500 });
  }

  return NextResponse.json({ template: updated as TemplateRow });
}
