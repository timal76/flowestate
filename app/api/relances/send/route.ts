import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Relance = {
  id: string;
  user_id: string;
  titre: string;
  message: string | null;
  type: "email" | "rappel" | "les deux";
  prospect_email: string | null;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    body = {};
  }

  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();

  let query = supabase
    .from("relances")
    .select("id,user_id,titre,message,type,prospect_email")
    .eq("statut", "planifiée")
    .lte("scheduled_at", nowIso)
    .eq("user_id", session.user.id);

  if (body.id) query = query.eq("id", body.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Impossible de charger les relances." }, { status: 500 });

  let sent = 0;
  for (const relance of (data ?? []) as Relance[]) {
    const { data: user } = await supabase
      .from("users")
      .select("smtp_host,smtp_port,smtp_email,smtp_password,smtp_configured")
      .eq("id", relance.user_id)
      .single();

    if (!user) continue;

    const shouldSendEmail = relance.type === "email" || relance.type === "les deux";
    if (shouldSendEmail && user.smtp_configured && relance.prospect_email) {
      try {
        const transporter = nodemailer.createTransport({
          host: user.smtp_host,
          port: user.smtp_port ?? 587,
          secure: (user.smtp_port ?? 587) === 465,
          auth: { user: user.smtp_email, pass: user.smtp_password },
        });

        await transporter.sendMail({
          from: user.smtp_email,
          to: relance.prospect_email,
          subject: relance.titre,
          text: relance.message ?? "",
        });
      } catch {
        continue;
      }
    }

    const { error: updateError } = await supabase
      .from("relances")
      .update({ statut: "envoyée", sent_at: new Date().toISOString() })
      .eq("id", relance.id)
      .eq("user_id", session.user.id);

    if (!updateError) sent += 1;
  }

  return NextResponse.json({ sent });
}
