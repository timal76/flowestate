import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

type ProspectStatus = "Nouveau" | "Contacté" | "Visite planifiée" | "Offre faite" | "Signé" | "Perdu";
type ProspectTemperature = "chaud" | "tiède" | "froid";
type ProspectCategorie = "acheteur" | "vendeur";

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
  temperature: ProspectTemperature;
  categorie: ProspectCategorie;
  created_at: string;
  updated_at: string;
};

const statuses: ProspectStatus[] = [
  "Nouveau",
  "Contacté",
  "Visite planifiée",
  "Offre faite",
  "Signé",
  "Perdu",
];

const temperatures: ProspectTemperature[] = ["chaud", "tiède", "froid"];
const categories: ProspectCategorie[] = ["acheteur", "vendeur"];

function isStatus(value: string): value is ProspectStatus {
  return statuses.includes(value as ProspectStatus);
}

function isTemperature(value: string): value is ProspectTemperature {
  return temperatures.includes(value as ProspectTemperature);
}

function isCategorie(value: string): value is ProspectCategorie {
  return categories.includes(value as ProspectCategorie);
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

const PROSPECT_COLUMNS =
  "id, user_id, nom, telephone, email, statut, budget, type_bien, notes, temperature, categorie, created_at, updated_at";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant utilisateur invalide." }, { status: 400 });

  const supabase = createServiceClient();
  const url = new URL(request.url);
  const statut = (url.searchParams.get("statut") ?? "").trim();
  const search = (url.searchParams.get("search") ?? "").trim();
  const temperature = (url.searchParams.get("temperature") ?? "").trim();
  const categorie = (url.searchParams.get("categorie") ?? "").trim();

  let query = supabase
    .from("prospects")
    .select(PROSPECT_COLUMNS)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (statut) {
    if (!isStatus(statut)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    query = query.eq("statut", statut);
  }
  if (temperature) {
    if (!isTemperature(temperature)) return NextResponse.json({ error: "Température invalide." }, { status: 400 });
    query = query.eq("temperature", temperature);
  }
  if (categorie) {
    if (!isCategorie(categorie)) return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });
    query = query.eq("categorie", categorie);
  }
  if (search) query = query.ilike("nom", `%${search}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[prospects] GET", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prospects: (data ?? []) as ProspectRow[] });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!isUuid(session.user.id)) return NextResponse.json({ error: "Identifiant utilisateur invalide." }, { status: 400 });

  let body: {
    nom?: string;
    telephone?: string;
    email?: string;
    statut?: string;
    temperature?: string;
    budget?: string;
    type_bien?: string;
    notes?: string;
    categorie?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const nom = (body.nom ?? "").trim();
  if (!nom) return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });

  const statut = (body.statut ?? "Nouveau").trim();
  if (!isStatus(statut)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  const temperature = (body.temperature ?? "tiède").trim();
  if (!isTemperature(temperature)) return NextResponse.json({ error: "Température invalide." }, { status: 400 });
  const categorie = (body.categorie ?? "acheteur").trim();
  if (!isCategorie(categorie)) return NextResponse.json({ error: "Catégorie invalide." }, { status: 400 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("prospects")
    .insert({
      user_id: session.user.id,
      nom,
      telephone: body.telephone?.trim() || null,
      email: body.email?.trim() || null,
      statut,
      temperature,
      categorie,
      budget: body.budget?.trim() || null,
      type_bien: body.type_bien?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select(PROSPECT_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[prospects] POST", JSON.stringify(error));
    return NextResponse.json({ error: error?.message ?? "Impossible de créer le prospect." }, { status: 500 });
  }

  return NextResponse.json({ prospect: data as ProspectRow });
}
