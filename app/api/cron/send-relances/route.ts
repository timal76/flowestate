import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type CronRelance = {
  id: string;
  user_id: string;
  titre: string;
  message: string | null;
  type: "email" | "rappel" | "les deux";
  prospect_email: string | null;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: relances, error } = await supabase
    .from("relances")
    .select("id,user_id,titre,message,type,prospect_email")
    .eq("statut", "planifiée")
    .lte("scheduled_at", now);

  if (error || !relances) {
    return NextResponse.json({ error: "Erreur récupération relances" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const relance of relances as CronRelance[]) {
    const { data: user } = await supabase
      .from("users")
      .select("smtp_host,smtp_port,smtp_email,smtp_password,smtp_configured")
      .eq("id", relance.user_id)
      .single();

    if ((relance.type === "email" || relance.type === "les deux") && user?.smtp_configured) {
      try {
        const transporter = nodemailer.createTransport({
          host: user.smtp_host,
          port: user.smtp_port ?? 587,
          secure: (user.smtp_port ?? 587) === 465,
          auth: { user: user.smtp_email, pass: user.smtp_password },
        });

        await transporter.sendMail({
          from: user.smtp_email!,
          to: relance.prospect_email ?? "",
          subject: relance.titre,
          text: relance.message || "",
        });

        await supabase
          .from("relances")
          .update({ statut: "envoyée", sent_at: new Date().toISOString() })
          .eq("id", relance.id);

        sent++;
      } catch (err) {
        console.error(`[cron] Erreur envoi relance ${relance.id}:`, err);
        failed++;
      }
    } else {
      await supabase
        .from("relances")
        .update({ statut: "envoyée", sent_at: new Date().toISOString() })
        .eq("id", relance.id);
      sent++;
    }
  }

  return NextResponse.json({ sent, failed });
}
