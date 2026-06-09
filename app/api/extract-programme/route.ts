import { NextResponse } from "next/server";

import { auth } from "@/app/api/auth/[...nextauth]/route";

export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API key manquante" }, { status: 500 });

  const body = (await request.json()) as { pdfBase64: string };

  const EXTRACTION_SYSTEM = `Tu es un expert en immobilier neuf français. Analyse ce document et retourne UNIQUEMENT un objet JSON brut. Commence par { et termine par }. Zéro texte avant ou après.

Format exact :
{"nom":null,"promoteur":null,"ville":null,"quartier":null,"adresse":null,"types_biens":null,"surface_min":null,"surface_max":null,"nb_lots":null,"prix_min":null,"prix_max":null,"tva_reduite":null,"taux_tva":null,"ptz":null,"lmnp":null,"pinel":null,"re2020":null,"livraison":null,"prestations":[],"domotique":null,"stationnement":null,"commerces_rdc":null,"transports":[],"commerces":[],"ecoles":[],"arguments_promoteur":[],"baignoire":null,"hauteur_plafond":null,"orientation":null,"vue":null,"cuisine_equipee":null,"double_exposition":null,"ascenseur":null,"digicode":null,"interphone":null,"gardien":null,"piscine":null,"terrasse_confirmee":null,"balcon_confirme":null}

RÈGLES : Copie mot pour mot. Zéro invention. Si absent : null.`;

  const bodyData = body.pdfBase64;

  let messageContent: unknown[];

  try {
    const parsed = JSON.parse(bodyData) as { type: string; pages: string[] };
    if (parsed.type === "compressed_pages") {
      messageContent = [
        ...parsed.pages.map((p) => ({
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: p },
        })),
        {
          type: "text",
          text: "Analyse ces pages de plaquette et extrais toutes les informations demandées.",
        },
      ];
    } else {
      throw new Error("not compressed");
    }
  } catch {
    messageContent = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: bodyData },
      },
      { type: "text", text: "Extrais toutes les informations. Retourne uniquement le JSON." },
    ];
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: "user",
          content: messageContent,
        },
      ],
    }),
  });

  const json = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text =
    json.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim() || "";

  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const parsed = JSON.parse(text.slice(start, end + 1));
    return NextResponse.json({ extractedData: parsed });
  } catch {
    return NextResponse.json({ extractedData: {} });
  }
}
