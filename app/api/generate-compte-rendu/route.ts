import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

async function recordGeneration(request: Request, type: "annonce" | "email" | "compte-rendu") {
  const userId = request.headers.get("x-user-id")?.trim();
  if (!userId) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const supabase = createClient(url, key);
  const { error } = await supabase.from("generations").insert({ type, user_id: userId });
  if (error) {
    console.error("[generations] insert", error);
  }
}

type GenerateReportPayload = {
  prospectName?: string;
  prospectEmail?: string;
  prospectPhone?: string;
  propertyType?: string;
  propertyAddress?: string;
  propertyPrice?: string;
  visitDate?: string;
  visitDuration?: string;
  prospectReaction?: string;
  positivePoints?: string;
  negativePoints?: string;
  prospectQuestions?: string;
  nextStep?: string;
  personalInfo?: string;
  agentName?: string;
  agencyName?: string;
  agentPhone?: string;
  agentEmail?: string;
  tone?: string;
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

    const body = (await request.json()) as GenerateReportPayload;

    const systemPrompt = `Tu es un agent immobilier expérimenté qui rédige des 
comptes-rendus de visite depuis 20 ans. Tu écris de façon 
claire, structurée et professionnelle.

Règles strictes :
- Structure obligatoire : 
  1. CONTEXTE DE LA VISITE (bien, date, durée, prospect)
  2. DÉROULEMENT DE LA VISITE (observations, réactions)
  3. POINTS POSITIFS relevés par le prospect
  4. POINTS NÉGATIFS / OBJECTIONS
  5. QUESTIONS POSÉES PAR LE PROSPECT
  6. ANALYSE ET RECOMMANDATIONS
  7. SUITE À DONNER (prochaine étape concrète)
- Ton Professionnel : sobre, factuel, document formel
- Ton Détaillé : exhaustif, chaque point développé, nuancé
- Ton Synthétique : bullet points, concis, essentiel uniquement
- Ne jamais mentionner le nom/agence/contact de l'agent 
  dans le corps du texte (géré séparément dans le PDF)
- Ne jamais écrire 'Compte-rendu rédigé le' ou 
  'Document établi le'
- Ne jamais mentionner l'IA
- Retourne uniquement le texte du compte-rendu`;

    const userPrompt = `
Rédige un compte-rendu de visite immobilier avec les informations suivantes :

- Prospect : ${body.prospectName || "Non précisé"}
- Email prospect : ${body.prospectEmail || "Non précisé"}
- Téléphone prospect : ${body.prospectPhone || "Non précisé"}
- Bien visité : ${body.propertyType || "Non précisé"}
- Adresse : ${body.propertyAddress || "Non précisée"}
- Prix : ${body.propertyPrice || "Non précisé"} EUR
- Date de visite : ${body.visitDate || "Non précisée"}
- Durée de visite : ${body.visitDuration || "Non précisée"}
- Réaction générale : ${body.prospectReaction || "Non précisée"}
- Points positifs : ${body.positivePoints || "Non précisés"}
- Points négatifs : ${body.negativePoints || "Non précisés"}
- Questions du prospect : ${body.prospectQuestions || "Non précisées"}
- Prochaine étape : ${body.nextStep || "Non précisée"}
- Informations personnelles : ${body.personalInfo || "Non précisées"}
- Agent : ${body.agentName || "Non précisé"}
- Agence : ${body.agencyName || "Non précisée"}
- Téléphone agent : ${body.agentPhone || "Non précisé"}
- Email agent : ${body.agentEmail || "Non précisé"}
- Ton souhaité : ${body.tone || "Professionnel"}

Consignes :
- Rédige en français.
- Structure clairement le compte-rendu (contexte, observations, objections, recommandations, suite).
- Produit un document exploitable en suivi client et partage vendeur.
- Ne jamais inclure les informations de l'agent (nom, agence, téléphone, email) dans le corps du texte - elles seront ajoutées automatiquement dans la signature. Ne jamais écrire 'Compte-rendu rédigé le' ou 'Document établi le' dans le texte.
- Retourne uniquement le texte final.
    `.trim();

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: userPrompt }],
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
            anthropicJson.error?.message || "Erreur lors de l'appel à l'API Anthropic.",
        },
        { status: anthropicResponse.status }
      );
    }

    const compteRendu =
      anthropicJson.content
        ?.filter((block) => block.type === "text" && Boolean(block.text))
        .map((block) => block.text)
        .join("\n")
        .trim() || "";

    if (!compteRendu) {
      return NextResponse.json(
        { error: "Aucun compte-rendu n'a été généré par Anthropic." },
        { status: 502 }
      );
    }

    await recordGeneration(request, "compte-rendu");

    return NextResponse.json({ compteRendu });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la génération du compte-rendu." },
      { status: 500 }
    );
  }
}
