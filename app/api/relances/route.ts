import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

type RelanceStatus = "planifiée" | "envoyée" | "annulée";
type RelanceType = "email" | "rappel" | "les deux";

const statuses: RelanceStatus[] = ["planifiée", "envoyée", "annulée"];

function isStatus(v: string): v is RelanceStatus {
  return statuses.includes(v as RelanceStatus);
}

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

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const supabase = createServiceClient();
  const url = new URL(request.url);
  const statut = (url.searchParams.get("statut") ?? "").trim();
  const prospectId = (url.searchParams.get("prospect_id") ?? "").trim();

  let query = supabase
    .from("relances")
    .select("id,user_id,prospect_id,titre,message,scheduled_at,sent_at,statut,type,prospect_email,created_at")
    .eq("user_id", session.user.id)
    .order("scheduled_at", { ascending: true });

  if (statut) {
    if (!isStatus(statut)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    query = query.eq("statut", statut);
  }
  if (prospectId) query = query.eq("prospect_id", prospectId);

  const { data, error } = await query;
  if (error) {
    console.error("[relances] GET", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const relances = (data ?? []) as Array<Record<string, unknown>>;
  const ids = Array.from(new Set(relances.map((r) => r.prospect_id).filter(Boolean))) as string[];

  let prospectsMap = new Map<string, { id: string; nom: string }>();
  if (ids.length > 0) {
    const { data: prospects } = await supabase.from("prospects").select("id,nom").in("id", ids);
    prospectsMap = new Map((prospects ?? []).map((p: any) => [p.id, { id: p.id, nom: p.nom }]));
  }

  return NextResponse.json({
    relances: relances.map((r) => ({
      ...r,
      prospect: r.prospect_id ? prospectsMap.get(String(r.prospect_id)) ?? null : null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  let body: {
    titre?: string;
    message?: string;
    scheduled_at?: string;
    type?: RelanceType;
    prospect_id?: string | null;
    prospect_email?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (!body.titre?.trim()) return NextResponse.json({ error: "Le titre est requis." }, { status: 400 });
  if (!body.scheduled_at) return NextResponse.json({ error: "La date est requise." }, { status: 400 });

  const supabase = createServiceClient();

  let prospectId = body.prospect_id?.trim() || null;
  const prospectEmail = body.prospect_email?.trim();
  if (prospectEmail) {
    const { data: prospectRow, error: prospectErr } = await supabase
      .from("prospects")
      .select("id")
      .eq("email", prospectEmail)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (prospectErr) {
      console.error("[relances] POST prospect lookup", JSON.stringify(prospectErr));
    } else if (prospectRow?.id) {
      prospectId = prospectRow.id;
    }
  }

  const { data, error } = await supabase
    .from("relances")
    .insert({
      user_id: session.user.id,
      prospect_id: prospectId,
      titre: body.titre.trim(),
      message: body.message?.trim() || null,
      scheduled_at: body.scheduled_at,
      type: body.type || "email",
      prospect_email: body.prospect_email?.trim() || null,
    })
    .select("id,user_id,prospect_id,titre,message,scheduled_at,sent_at,statut,type,prospect_email,created_at")
    .single();

  if (error || !data) {
    console.error("[relances] POST", JSON.stringify(error));
    return NextResponse.json({ error: error?.message ?? "Impossible de créer la relance." }, { status: 500 });
  }

  return NextResponse.json({ relance: data });
}
