import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

type ProspectStatus = "Nouveau" | "Contacté" | "Visite planifiée" | "Offre faite" | "Signé" | "Perdu";

type ProspectRow = {
  id: string;
  user_id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  statut: ProspectStatus;
  budget: string | null;
  type_bien: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type GenerationRow = {
  id: string;
  type: "annonce" | "email" | "compte-rendu";
  description: string | null;
  prospect_name: string | null;
  created_at: string;
  prospect_id: string | null;
};

const statuses: ProspectStatus[] = [
  "Nouveau",
  "Contacté",
  "Visite planifiée",
  "Offre faite",
  "Signé",
  "Perdu",
];

function isStatus(value: string): value is ProspectStatus {
  return statuses.includes(value as ProspectStatus);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type Context = { params: Promise<{ id: string }> };

async function getOwnedProspect(supabase: ReturnType<typeof createServiceClient>, userId: string, id: string) {
  const { data, error } = await supabase
    .from("prospects")
    .select("id,user_id,nom,telephone,email,statut,budget,type_bien,notes,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return { data: data as ProspectRow | null, error };
}

export async function GET(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant utilisateur invalide." }, { status: 400 });

  const supabase = createServiceClient();
  const { id } = await context.params;

  const { data: prospect, error } = await getOwnedProspect(supabase, session.user.id, id);
  if (error) {
    console.error("[prospects/:id] GET", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!prospect) return NextResponse.json({ error: "Prospect introuvable." }, { status: 404 });

  const { data: generations, error: genErr } = await supabase
    .from("generations")
    .select("id,type,description,prospect_name,created_at,prospect_id")
    .eq("user_id", session.user.id)
    .eq("prospect_id", id)
    .order("created_at", { ascending: false });

  if (genErr) {
    console.error("[prospects/:id] generations", JSON.stringify(genErr));
    return NextResponse.json({ error: genErr.message }, { status: 500 });
  }

  return NextResponse.json({
    prospect,
    generations: (generations ?? []) as GenerationRow[],
  });
}

export async function PATCH(request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant utilisateur invalide." }, { status: 400 });

  const supabase = createServiceClient();
  const { id } = await context.params;

  const { data: owned, error } = await getOwnedProspect(supabase, session.user.id, id);
  if (error) {
    console.error("[prospects/:id] PATCH check", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!owned) return NextResponse.json({ error: "Prospect introuvable." }, { status: 404 });

  let body: {
    nom?: string;
    telephone?: string;
    email?: string;
    statut?: string;
    budget?: string;
    type_bien?: string;
    notes?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const payload: Record<string, string | null> = {};
  if (typeof body.nom === "string") payload.nom = body.nom.trim();
  if (typeof body.telephone === "string") payload.telephone = body.telephone.trim() || null;
  if (typeof body.email === "string") payload.email = body.email.trim() || null;
  if (typeof body.budget === "string") payload.budget = body.budget.trim() || null;
  if (typeof body.type_bien === "string") payload.type_bien = body.type_bien.trim() || null;
  if (typeof body.notes === "string") payload.notes = body.notes.trim() || null;

  if (typeof body.statut === "string") {
    const s = body.statut.trim();
    if (!isStatus(s)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    payload.statut = s;
  }

  payload.updated_at = new Date().toISOString();

  const { data, error: updateErr } = await supabase
    .from("prospects")
    .update(payload)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select("id,user_id,nom,telephone,email,statut,budget,type_bien,notes,created_at,updated_at")
    .single();

  if (updateErr || !data) {
    console.error("[prospects/:id] PATCH", JSON.stringify(updateErr));
    return NextResponse.json({ error: updateErr?.message ?? "Impossible de mettre à jour." }, { status: 500 });
  }

  return NextResponse.json({ prospect: data as ProspectRow });
}

export async function DELETE(_request: Request, context: Context) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant utilisateur invalide." }, { status: 400 });

  const supabase = createServiceClient();
  const { id } = await context.params;

  const { data: owned, error } = await getOwnedProspect(supabase, session.user.id, id);
  if (error) {
    console.error("[prospects/:id] DELETE check", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!owned) return NextResponse.json({ error: "Prospect introuvable." }, { status: 404 });

  const { error: delErr } = await supabase
    .from("prospects")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id);

  if (delErr) {
    console.error("[prospects/:id] DELETE", JSON.stringify(delErr));
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
