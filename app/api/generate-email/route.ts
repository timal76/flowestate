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

    const systemPrompt = `Tu es un agent immobilier expérimenté qui rédige des emails 
de relance depuis 20 ans. Tu écris de façon naturelle, directe 
et humaine. Jamais pompeux ni robotique.

Règles strictes :
- Personnalise chaque email selon le profil du prospect, 
  son intérêt, ses objections et sa situation
- Commence toujours par : Objet: [objet accrocheur et personnalisé]
- Structure : Accroche personnalisée → Corps → CTA clair → Politesse → Signature
- Ton Professionnel : sobre, factuel, formule 'Bien cordialement'
- Ton Chaleureux : humain, proche, formule 'À très bientôt'
- Ton Urgent : direct, créateur d'urgence, formule 'Dans l'attente de votre retour'
- Ne mentionne jamais l'IA
- Retourne uniquement le texte final de l'email`;

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

Termine avec cette signature :
---

${body.agentName || "L'agent"}
${body.agencyName || ""}
${body.agentPhone || ""}
${body.agentEmail || ""}

Chaque élément sur sa propre ligne.

Consignes :
- Rédige en français.
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
