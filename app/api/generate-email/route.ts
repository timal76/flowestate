import { NextResponse } from "next/server";

type GenerateEmailPayload = {
  agentName?: string;
  agencyName?: string;
  agentPhone?: string;
  agentEmail?: string;
  prospectName?: string;
  prospectEmail?: string;
  propertyType?: string;
  propertyLocation?: string;
  propertyPrice?: string;
  visitDate?: string;
  prospectBudget?: string;
  prospectSituation?: string;
  visitFeedback?: string;
  searchDelay?: string;
  objections?: string;
  personalInfo?: string;
  tone?: string;
  length?: string;
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

    const body = (await request.json()) as GenerateEmailPayload;

    const userPrompt = `
Rédige un email de relance immobilier avec ces informations :

- Prénom et nom de l'agent : ${body.agentName || "Non précisé"}
- Nom de l'agence : ${body.agencyName || "Non précisé"}
- Téléphone de l'agent : ${body.agentPhone || "Non précisé"}
- Email de l'agent : ${body.agentEmail || "Non précisé"}
- Prénom et nom du prospect : ${body.prospectName || "Non précisé"}
- Email du prospect : ${body.prospectEmail || "Non précisé"}
- Type de bien visité : ${body.propertyType || "Non précisé"}
- Localisation du bien : ${body.propertyLocation || "Non précisé"}
- Prix du bien : ${body.propertyPrice || "Non précisé"} EUR
- Date de visite : ${body.visitDate || "Non précisée"}
- Budget du prospect : ${body.prospectBudget || "Non précisé"} EUR
- Situation du prospect : ${body.prospectSituation || "Non précisée"}
- Retour après visite : ${body.visitFeedback || "Non précisé"}
- Délai de recherche : ${body.searchDelay || "Non précisé"}
- Objections éventuelles : ${body.objections || "Non précisées"}
- Informations personnelles du prospect : ${body.personalInfo || "Non précisées"}
- Ton de l'email : ${body.tone || "Professionnel"}
- Longueur souhaitée : ${body.length || "Standard (10-15 lignes)"}

Consignes :
- Rédige en français.
- Personnalise fortement le message.
- Commence impérativement par un objet d'email accrocheur et personnalisé.
- Adapte la formule de politesse finale selon le ton :
  - Professionnel = "Bien cordialement"
  - Chaleureux = "À très bientôt"
  - Urgent = "Dans l'attente de votre retour"
- Termine impérativement l'email avec cette signature exacte, formatée exactement ainsi, avec des doubles sauts de ligne :
  ---

  Timothé Costantin

  FlowEstate

  0750099231

  timothecostantin@gmail.com
- Chaque élément doit être sur sa propre ligne. Pas de virgule, pas d'espace entre les éléments.
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
        max_tokens: 900,
        system:
          "Tu es un agent immobilier expérimenté qui rédige ses propres emails de relance depuis 20 ans. Tu écris de façon naturelle, directe et humaine. Jamais pompeux ni robotique. Tu personnalises chaque email selon le profil du prospect, son niveau d'intérêt, ses objections et sa situation personnelle. Tu ne mentionnes jamais l'IA. L'email doit sembler écrit par un vrai agent qui connaît bien son prospect.",
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

    const email =
      anthropicJson.content
        ?.filter((block) => block.type === "text" && Boolean(block.text))
        .map((block) => block.text)
        .join("\n")
        .trim() || "";

    if (!email) {
      return NextResponse.json({ error: "Aucun email n'a été généré par Anthropic." }, { status: 502 });
    }

    return NextResponse.json({ email });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la génération de l'email." },
      { status: 500 }
    );
  }
}
