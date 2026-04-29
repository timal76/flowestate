import { NextResponse } from "next/server";

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
        system:
          "Tu es un agent immobilier expérimenté qui rédige ses propres comptes-rendus de visite depuis 20 ans. Tu écris de façon claire, structurée et professionnelle. Ton compte-rendu doit être utile pour le suivi client et pour informer le vendeur. Tu ne mentionnes jamais l'IA. Le document doit sembler rédigé par un vrai agent.",
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

    return NextResponse.json({ compteRendu });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la génération du compte-rendu." },
      { status: 500 }
    );
  }
}
