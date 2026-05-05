import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

type GenerationType = "annonce" | "email" | "compte-rendu";

type GenerationRow = {
  id: string;
  type: GenerationType;
  created_at: string;
  description: string | null;
  prospect_name: string | null;
};

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

export async function GET() {
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
  } catch (error) {
    console.error("[export/stats] create client", error);
    return NextResponse.json({ error: "Configuration Supabase invalide." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("generations")
    .select("id,type,created_at,description,prospect_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[export/stats] generations", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const generations = (data ?? []) as GenerationRow[];
  const annonces = generations.filter((g) => g.type === "annonce").length;
  const emails = generations.filter((g) => g.type === "email").length;
  const comptesRendus = generations.filter((g) => g.type === "compte-rendu").length;

  return NextResponse.json({
    stats: {
      total: generations.length,
      annonces,
      emails,
      comptesRendus,
    },
    generations,
  });
}
