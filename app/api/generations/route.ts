import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

const generationTypes = ["annonce", "email", "compte-rendu", "programme-neuf"] as const;
type GenerationType = (typeof generationTypes)[number];

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isGenerationType(value: string): value is GenerationType {
  return (generationTypes as readonly string[]).includes(value);
}

function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant utilisateur invalide." }, { status: 400 });

  const url = new URL(request.url);
  const prospectId = (url.searchParams.get("prospect_id") ?? "").trim();
  const typeParam = (url.searchParams.get("type") ?? "").trim();

  if (!prospectId || !isUuid(prospectId)) {
    return NextResponse.json({ error: "prospect_id valide requis." }, { status: 400 });
  }
  if (typeParam && !isGenerationType(typeParam)) {
    return NextResponse.json({ error: "Type de génération invalide." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: prospect, error: prospectErr } = await supabase
    .from("prospects")
    .select("id")
    .eq("id", prospectId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (prospectErr) {
    console.error("[generations] prospect check", JSON.stringify(prospectErr));
    return NextResponse.json({ error: prospectErr.message }, { status: 500 });
  }
  if (!prospect) return NextResponse.json({ error: "Prospect introuvable." }, { status: 404 });

  let query = supabase
    .from("generations")
    .select("id,type,description,content,created_at,prospect_id")
    .eq("user_id", session.user.id)
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });

  if (typeParam) query = query.eq("type", typeParam);

  const { data, error } = await query;
  if (error) {
    console.error("[generations] GET", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ generations: data ?? [] });
}
