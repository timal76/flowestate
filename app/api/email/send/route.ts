import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: { to?: string; subject?: string; body?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const to = (body.to ?? "").trim();
  const subject = (body.subject ?? "").trim();
  const content = (body.body ?? "").trim();
  const cleanedContent = content.replace(/^objet\s*:.*\n?/i, "").trim();
  if (!to || !subject || !cleanedContent) return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });

  const supabase = createServiceClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("smtp_host,smtp_port,smtp_email,smtp_password,smtp_configured")
    .eq("id", session.user.id)
    .single();

  if (error || !user) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (!user.smtp_configured) return NextResponse.json({ error: "Aucun compte email configuré" }, { status: 400 });

  try {
    const transporter = nodemailer.createTransport({
      host: user.smtp_host,
      port: user.smtp_port ?? 587,
      secure: (user.smtp_port ?? 587) === 465,
      auth: { user: user.smtp_email, pass: user.smtp_password },
    });

    await transporter.sendMail({
      from: user.smtp_email,
      to,
      subject,
      text: cleanedContent,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Échec d'envoi de l'email." }, { status: 500 });
  }
}
