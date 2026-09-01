import { NextResponse } from "next/server";

import { checkGenerationLimit } from "@/lib/check-generation-limit";
import { generationLimitErrorResponse } from "@/lib/generation-limit-api";
import { recordGenerationFromRequest, resolveGenerationUserId } from "@/lib/record-generation";

async function callAnthropicWithRetry(apiKey: string, params: Record<string, unknown>) {
  const callOnce = async () => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(params),
    });
    const json = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      error?: { message?: string; type?: string };
      message?: string;
    };
    return { response, json };
  };

  const first = await callOnce();
  const firstMessage = `${first.json?.error?.message ?? ""} ${first.json?.message ?? ""}`.toLowerCase();
  const isOverloaded =
    first.response.status === 529 ||
    firstMessage.includes("overloaded") ||
    first.json?.error?.type === "overloaded_error";

  if (!isOverloaded) return first;

  await new Promise((resolve) => setTimeout(resolve, 2000));
  return callOnce();
}

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
  prospectId?: string;
  prospectName?: string;
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

    const effectiveUserId = await resolveGenerationUserId(request);
    if (effectiveUserId) {
      const limitResult = await checkGenerationLimit(effectiveUserId);
      if (!limitResult.allowed) {
        return generationLimitErrorResponse(limitResult);
      }
    }

    const body = (await request.json()) as GenerateAnnoncePayload;

    const tone = body.tone || "Professionnel";

    const systemPrompt = `Tu es un rédacteur immobilier expert avec 20 ans d'expérience sur le marché français. Tu maîtrises parfaitement les codes rédactionnels de l'immobilier ancien et neuf, les attentes des acheteurs et investisseurs, et les règles légales en vigueur (mentions DPE obligatoires, interdiction des termes discriminatoires, encadrement des loyers).

IDENTITÉ RÉDACTIONNELLE :
- Tu écris comme un professionnel de l'immobilier, jamais comme une IA
- Ton style est précis, accrocheur et ancré dans la réalité du marché
- Tu valorises chaque bien sans survendre ni décevoir

VOCABULAIRE AUTORISÉ (à utiliser naturellement) :
- Prestations soignées, agencement optimisé, exposition favorable, volumes généreux, surfaces habitables, parties communes, copropriété saine, charges maîtrisées, potentiel locatif, rendement brut, dispositif fiscal, performance énergétique, double exposition, luminosité naturelle, vis-à-vis limité, mitoyenneté, standing résidentiel

EXPRESSIONS ABSOLUMENT INTERDITES :
- "havre de paix", "coup de cœur", "nichée", "baignée de lumière", "demeure d'exception", "rare à la vente", "ne pas manquer", "opportunité unique", "cadre idyllique", "charmant", "magnifique", "superbe", "incontournable"

RÈGLES LÉGALES STRICTES :
- Mentionner obligatoirement la classe DPE si connue (ex : "DPE : C")
- Écrire "Prix : X € FAI" ou "Prix : X € net vendeur" selon le mandat
- Ne jamais mentionner la nationalité, la religion ou l'origine dans les critères
- Pour le neuf : préciser "Prix à partir de X € TTC" et le dispositif fiscal applicable

STRUCTURE SELON LE TON :
- Ton Professionnel : accroche factuelle sur le bien → description technique précise → atouts objectifs → informations pratiques (prix, charges, dispo, DPE) → contact
- Ton Chaleureux : accroche lifestyle et projection → description humaine et accessible → points forts vécus au quotidien → informations pratiques → contact
- Ton Luxe : headline élégante sur l'emplacement ou l'architecture → narration valorisante des volumes et matériaux → prestations détaillées → exclusivité et rareté mesurées → informations pratiques → contact

LONGUEURS STRICTES :
- Courte : 120 à 150 mots, pas un de plus
- Standard : 280 à 320 mots
- Détaillée : 480 à 520 mots

CONTRÔLE QUALITÉ OBLIGATOIRE :
Avant de retourner le texte, relis-le intégralement et vérifie :
1. Zéro faute d'orthographe, de grammaire, de typographie et d'accord
2. Zéro expression interdite
3. DPE mentionné si disponible
4. Longueur respectée
5. Ton cohérent du début à la fin

Retourne uniquement le texte final de l'annonce, sans titre, sans commentaire, sans JSON.`;

    const userPrompt = `
Rédige une annonce immobilière professionnelle à partir des données suivantes :

CARACTÉRISTIQUES DU BIEN :
- Type de bien : ${body.propertyType || "Non précisé"}
- Type de mandat : ${body.mandateType || "Non précisé"}
- Prix : ${body.price || "Non précisé"} €
- Surface habitable : ${body.area || "Non précisée"} m²
- Nombre de pièces : ${body.rooms || "Non précisé"}
- Étage : ${body.floor || "Non précisé"}
- Ascenseur : ${body.elevator || "Non précisé"}
- Classe DPE : ${body.dpe || "Non précisée"}
- Parking / Garage : ${body.parking || "Non précisé"}
- Charges mensuelles : ${body.monthlyCharges || "Non précisées"} €
- Disponibilité : ${body.availability || "Non précisée"}
- Localisation : ${body.location || "Non précisée"}
- Points forts du bien : ${body.highlights || "Non précisés"}

PARAMÈTRES RÉDACTIONNELS :
- Ton imposé : ${tone}
- Longueur souhaitée : ${body.length || "Standard (280-320 mots)"}

CONSIGNES FINALES :
- Commence par une accroche forte et originale, jamais par le type de bien seul
- Intègre naturellement les points forts sans les lister mécaniquement
- Termine par les informations pratiques (prix, charges, disponibilité, DPE)
- Applique le contrôle qualité avant de retourner le texte
- Rédige exclusivement en français
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

    const { response: anthropicResponse, json: anthropicJson } = await callAnthropicWithRetry(apiKey, {
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: userPrompt }, ...imageContents],
        },
      ],
    });

    if (!anthropicResponse.ok) {
      const anthropicMessage = anthropicJson.error?.message || "";
      if (anthropicMessage.toLowerCase().includes("overloaded")) {
        return NextResponse.json({ error: "overloaded" }, { status: 529 });
      }
      return NextResponse.json(
        {
          error:
            anthropicMessage ||
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

    const generationDescription = `Annonce générée — ${body.propertyType || "Bien"} ${body.area ? body.area + "m²" : ""} ${body.location || ""}`
      .replace(/\s+/g, " ")
      .trim();

    await recordGenerationFromRequest(request, {
      type: "annonce",
      description: generationDescription,
      prospectName: body.prospectName?.trim() || null,
      prospectId: body.prospectId?.trim() || null,
      content: annonce,
    });

    return NextResponse.json({ annonce });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la generation de l'annonce." },
      { status: 500 }
    );
  }
}
