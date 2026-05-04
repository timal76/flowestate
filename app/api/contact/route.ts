import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const SUBJECT_LABELS: Record<string, string> = {
  general: "Question générale",
  technical: "Problème technique",
  billing: "Facturation",
  suggestion: "Suggestion",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const subjectKey = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !subjectKey || !message) {
      return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
    }

    const subjectLabel = SUBJECT_LABELS[subjectKey] ?? subjectKey;

    const { error } = await resend.emails.send({
      from: "FlowEstate <contact@flowestate.fr>",
      to: "timothecostantin@gmail.com",
      replyTo: email,
      subject: `[Contact FlowEstate] ${subjectLabel} - ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px;">
          <h2 style="color: #C9A96E;">Nouveau message de contact</h2>
          <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
          <p><strong>Email :</strong> ${escapeHtml(email)}</p>
          <p><strong>Sujet :</strong> ${escapeHtml(subjectLabel)}</p>
          <p><strong>Message :</strong></p>
          <p style="background: #f5f5f5; padding: 16px; border-radius: 8px;">${escapeHtml(message).replace(/\n/g, "<br />")}</p>
        </div>
      `,
    });

    if (error) {
      console.error("[api/contact]", error);
      return NextResponse.json({ error: "Erreur envoi" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur envoi" }, { status: 500 });
  }
}
