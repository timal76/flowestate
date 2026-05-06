import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("smtp_host,smtp_port,smtp_email,smtp_configured")
    .eq("id", session.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });

  return NextResponse.json({
    smtp: {
      smtp_host: data.smtp_host,
      smtp_port: data.smtp_port,
      smtp_email: data.smtp_email,
      smtp_configured: Boolean(data.smtp_configured),
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let body: {
    smtp_host?: string;
    smtp_port?: number;
    smtp_email?: string;
    smtp_password?: string;
    smtp_configured?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (body.smtp_configured === false) {
    const { error } = await supabase
      .from("users")
      .update({
        smtp_host: null,
        smtp_port: 587,
        smtp_email: null,
        smtp_password: null,
        smtp_configured: false,
      })
      .eq("id", session.user.id);
    if (error) return NextResponse.json({ error: "Impossible de déconnecter le compte email." }, { status: 500 });
    return NextResponse.json({ success: true, message: "Compte email déconnecté" });
  }

  const smtp_host = (body.smtp_host ?? "").trim();
  const smtp_port = Number(body.smtp_port ?? 587);
  const smtp_email = (body.smtp_email ?? "").trim();
  const smtp_password = body.smtp_password ?? "";

  if (!smtp_host || !smtp_email || !smtp_password || !Number.isFinite(smtp_port)) {
    return NextResponse.json({ error: "Informations SMTP incomplètes." }, { status: 400 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: smtp_port,
      secure: smtp_port === 465,
      auth: { user: smtp_email, pass: smtp_password },
    });
    await transporter.verify();
  } catch {
    return NextResponse.json({ error: "Impossible de se connecter. Vérifiez vos identifiants." }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({ smtp_host, smtp_port, smtp_email, smtp_password, smtp_configured: true })
    .eq("id", session.user.id);

  if (error) return NextResponse.json({ error: "Impossible d'enregistrer la configuration SMTP." }, { status: 500 });

  return NextResponse.json({ success: true, message: "Connexion SMTP vérifiée" });
}
