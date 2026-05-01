import { NextResponse } from "next/server";

type GenerateAnnoncePayload = {
  propertyType?: string;
  mandateType?: string;
  price?: string;
  area?: string;
  rooms?: string;
  floor?: string;
  elevator?: string;
  dpe?: string;
  parking?: string;
  monthlyCharges?: string;
  availability?: string;
  location?: string;
  highlights?: string;
  tone?: string;
  length?: string;
  images?: Array<{
    data?: string;
    mediaType?: string;
  }>;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY manquant dans les variables d'environnement." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerateAnnoncePayload;

    const tone = body.tone || "Professionnel";

    const systemPrompt = `Tu es un agent immobilier expérimenté qui rédige des annonces depuis 20 ans. Tu écris de façon naturelle, directe et convaincante. Ton style est humain et professionnel.

Règles strictes :
- Jamais d'expressions clichées : 'havre de paix', 'demeure d'exception', 'nichée', 'baignée de lumière', 'coup de coeur'
- Commence toujours par une accroche forte et originale sur le bien ou la localisation
- Structure : Accroche → Description du bien → Points forts → Informations pratiques (prix, charges, dispo)
- Ton Professionnel : factuel, précis, sobre
- Ton Chaleureux : humain, accessible, projections lifestyle
- Ton Luxe : élégant, valorisant, vocabulaire haut de gamme sans être pompeux
- Respecte strictement la longueur : Courte=150 mots, Standard=300 mots, Détaillée=500 mots
- Ne mentionne jamais l'IA
- Retourne uniquement le texte de l'annonce, rien d'autre`;

    const userPrompt = `
Voici les donnees du bien immobilier a transformer en annonce :

- Type de bien : ${body.propertyType || "Non precise"}
- Type de mandat : ${body.mandateType || "Non precise"}
- Prix : ${body.price || "Non precise"}
- Surface : ${body.area || "Non precise"} m2
- Nombre de pieces : ${body.rooms || "Non precise"}
- Localisation : ${body.location || "Non precise"}
- Etage : ${body.floor || "Non precise"}
- Ascenseur : ${body.elevator || "Non precise"}
- DPE : ${body.dpe || "Non precise"}
- Parking/Garage : ${body.parking || "Non precise"}
- Charges mensuelles : ${body.monthlyCharges || "Non precise"} EUR
- Disponibilite : ${body.availability || "Non precise"}
- Points forts : ${body.highlights || "Non precise"}
- Ton souhaite : ${tone}
- Longueur souhaitee : ${body.length || "Standard (~300 mots)"}

Ton imposé : ${tone}. Sois cohérent avec ce ton du début à la fin de l'annonce.

Consignes :
- Redige en francais.
- Propose une annonce immobiliere claire, elegante et persuasive.
- Utilise un style adapte au ton demande.
- Retourne uniquement le texte final de l'annonce, sans titre technique ni JSON.
    `.trim();

    const images = body.images ?? [];
    const imageContents =
      images
        .filter((img) => Boolean(img?.data))
        .map((img) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: img.mediaType || "image/jpeg",
            data: img.data as string,
          },
        })) ?? [];

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...imageContents,
            ],
          },
        ],
      }),
    });

    const anthropicJson = (await anthropicResponse.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      error?: { message?: string };
    };

    if (!anthropicResponse.ok) {
      return NextResponse.json(
        {
          error:
            anthropicJson.error?.message ||
            "Erreur lors de l'appel a l'API Anthropic.",
        },
        { status: anthropicResponse.status }
      );
    }

    const annonce =
      anthropicJson.content
        ?.filter((block) => block.type === "text" && Boolean(block.text))
        .map((block) => block.text)
        .join("\n")
        .trim() || "";

    if (!annonce) {
      return NextResponse.json(
        { error: "Aucun texte n'a ete genere par Anthropic." },
        { status: 502 }
      );
    }

    return NextResponse.json({ annonce });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la generation de l'annonce." },
      { status: 500 }
    );
  }
}
