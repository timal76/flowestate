import { NextResponse } from "next/server";

import { ExtractionError, extractProgrammeFromPdfBase64 } from "@/lib/programme-extraction";

/** 3 tentatives de 35 s maximum + pauses, sur des PDF jusqu'à 20 Mo. */
export const maxDuration = 120;

/** Limite de l'API Anthropic pour une requête (PDF encodé en base64 inclus). */
const MAX_PDF_BYTES = 24 * 1024 * 1024;

function isAllowedPdfUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return false;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return true;
    return url.hostname === new URL(supabaseUrl).hostname;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key manquante" }, { status: 500 });

  let body: { pdfUrl?: string; pdfBase64?: string };
  try {
    body = (await request.json()) as { pdfUrl?: string; pdfBase64?: string };
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  let pdfData: string;

  if (body.pdfUrl) {
    if (!isAllowedPdfUrl(body.pdfUrl)) {
      return NextResponse.json({ error: "URL du PDF non autorisée" }, { status: 400 });
    }
    let pdfRes: Response;
    try {
      pdfRes = await fetch(body.pdfUrl, { signal: AbortSignal.timeout(30_000) });
    } catch {
      return NextResponse.json({ error: "Impossible de télécharger le PDF" }, { status: 400 });
    }
    if (!pdfRes.ok) {
      return NextResponse.json({ error: "Impossible de télécharger le PDF" }, { status: 400 });
    }
    const buffer = Buffer.from(await pdfRes.arrayBuffer());
    if (buffer.length > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "Le PDF est trop volumineux pour être analysé. Utilisez un PDF plus léger." },
        { status: 413 },
      );
    }
    pdfData = buffer.toString("base64");
  } else if (body.pdfBase64) {
    pdfData = body.pdfBase64.includes(",") ? body.pdfBase64.split(",")[1] : body.pdfBase64;
  } else {
    return NextResponse.json({ error: "PDF requis" }, { status: 400 });
  }

  try {
    const extractedData = await extractProgrammeFromPdfBase64(apiKey, pdfData);
    return NextResponse.json({ extractedData });
  } catch (err) {
    if (err instanceof ExtractionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    console.error("[extract-programme] unexpected error:", err);
    return NextResponse.json(
      { error: "Impossible d'analyser la plaquette. Réessayez.", code: "EXTRACTION_UPSTREAM" },
      { status: 500 },
    );
  }
}
