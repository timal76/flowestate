import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const userId = session.user.id;

  const { data: user, error: userError } = await supabase
    .from("users")
    .select(
      "id, email, first_name, last_name, phone, agency_name, avatar_url, logo_url, signature_url, plan, subscription_status, trial_ends_at"
    )
    .eq("id", userId)
    .single();

  if (userError || !user) {
    console.error("[user/profile] GET", userError);
    return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  }

  const countType = async (type: "annonce" | "email" | "compte-rendu") => {
    const { count, error } = await supabase
      .from("generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", type);
    if (error) {
      console.error("[user/profile] count", type, error);
      return 0;
    }
    return count ?? 0;
  };

  const [annonces, emails, comptesRendus] = await Promise.all([
    countType("annonce"),
    countType("email"),
    countType("compte-rendu"),
  ]);

  return NextResponse.json({
    user,
    stats: {
      annonces,
      emails,
      comptesRendus,
      total: annonces + emails + comptesRendus,
    },
  });
}

type PatchBody = {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  agency_name?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
};

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const payload: Record<string, string | null | undefined> = {};
  if (typeof body.first_name === "string") payload.first_name = body.first_name.trim();
  if (typeof body.last_name === "string") payload.last_name = body.last_name.trim();
  if (body.phone === null || typeof body.phone === "string") payload.phone = body.phone?.trim() ?? null;
  if (body.agency_name === null || typeof body.agency_name === "string")
    payload.agency_name = body.agency_name?.trim() ?? null;
  if (body.avatar_url === null || typeof body.avatar_url === "string") payload.avatar_url = body.avatar_url;
  if (body.logo_url === null || typeof body.logo_url === "string") payload.logo_url = body.logo_url;
  if (body.signature_url === null || typeof body.signature_url === "string")
    payload.signature_url = body.signature_url;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "Aucun champ à mettre à jour." }, { status: 400 });
  }

  const { error } = await supabase.from("users").update(payload).eq("id", session.user.id);

  if (error) {
    console.error("[user/profile] PATCH", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer le profil. Vérifiez les colonnes Supabase (phone, avatar_url, …)." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const userId = session.user.id;

  const prefix = `profiles/${userId}`;
  const { data: files } = await supabase.storage.from("profiles").list(prefix);
  if (files?.length) {
    const paths = files.map((f) => `${prefix}/${f.name}`);
    const { error: rmErr } = await supabase.storage.from("profiles").remove(paths);
    if (rmErr) console.error("[user/profile] storage remove", rmErr);
  }

  const { error: genErr } = await supabase.from("generations").delete().eq("user_id", userId);
  if (genErr) {
    console.error("[user/profile] generations delete", genErr);
    return NextResponse.json(
      { error: "Impossible de supprimer l'historique des générations." },
      { status: 500 }
    );
  }

  const { error: userErr } = await supabase.from("users").delete().eq("id", userId);
  if (userErr) {
    console.error("[user/profile] user delete", userErr);
    return NextResponse.json({ error: "Impossible de supprimer le compte." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
