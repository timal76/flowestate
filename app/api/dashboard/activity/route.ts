import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";
import type { DashboardActivityDay } from "@/lib/dashboard-activity";
import { createServiceClient } from "@/lib/record-generation";

export const dynamic = "force-dynamic";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  if (!isUuid(session.user.id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Configuration serveur." }, { status: 500 });
  }

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);

  const days: DashboardActivityDay[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(todayUtc);
    d.setUTCDate(d.getUTCDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    days.push({ date: dateKey, label: `${dd}/${mm}`, annonce: 0, email: 0, compteRendu: 0 });
  }

  const rangeStart = `${days[0]!.date}T00:00:00.000Z`;

  const { data, error } = await supabase
    .from("generations")
    .select("created_at,type")
    .eq("user_id", session.user.id)
    .gte("created_at", rangeStart);

  if (error) {
    console.error("[dashboard/activity]", JSON.stringify(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dayByKey = new Map(days.map((day) => [day.date, day]));

  for (const row of data ?? []) {
    const created = row.created_at as string;
    const type = String(row.type ?? "");
    const key = new Date(created).toISOString().slice(0, 10);
    const bucket = dayByKey.get(key);
    if (!bucket) continue;
    if (type === "annonce") bucket.annonce += 1;
    else if (type === "email") bucket.email += 1;
    else if (type === "compte-rendu") bucket.compteRendu += 1;
  }

  return NextResponse.json({ days });
}
