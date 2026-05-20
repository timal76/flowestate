import { NextResponse } from "next/server";

import { checkGenerationLimit } from "@/lib/check-generation-limit";
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
  prospectId?: string;
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
      const { allowed, reason } = await checkGenerationLimit(effectiveUserId);
      if (!allowed) {
        return NextResponse.json({ error: reason }, { status: 403 });
      }
    }

    const body = (await request.json()) as GenerateEmailPayload;

    const systemPrompt = `Tu es un agent immobilier expert avec 20 ans d'expérience, spécialisé dans la rédaction d'emails de relance à fort taux de conversion. Tu connais parfaitement la psychologie de l'acheteur immobilier, les cycles de décision longs, les objections fréquentes et les leviers de réengagement.

CONTEXTE MÉTIER :
Un email de relance immobilier intervient après une visite, un premier contact ou une période de silence. Son objectif est de maintenir le lien, lever les freins, et provoquer une prise de décision ou un rendez-vous. Chaque email doit donner l'impression d'avoir été écrit spécifiquement pour ce prospect, pas d'être un template.

RÈGLES DE PERSONNALISATION :
- Toujours référencer un élément concret de la visite ou de l'échange précédent
- Adresser directement les objections mentionnées sans les minimiser
- Adapter le registre à la situation du prospect (primo-accédant, investisseur, vendeur-acheteur, retraité...)
- Si un délai de recherche est connu, calibrer l'urgence en conséquence

STRUCTURE OBLIGATOIRE :
1. Objet : [percutant, personnalisé, 50 caractères max, sans point d'exclamation]
2. Accroche : référence directe à la visite ou au dernier échange (1-2 phrases)
3. Corps : apport de valeur concret (nouvelle info sur le bien, argument marché, solution à une objection)
4. CTA : une seule action demandée, formulée clairement (rappel, rendez-vous, réponse par email)
5. Formule de politesse adaptée au ton
6. Signature complète

RÈGLES PAR TON :
- Ton Professionnel : registre soutenu, "Bien cordialement", phrases complètes, distance respectueuse, aucun familier
- Ton Chaleureux : registre accessible, "À très bientôt", prénom du prospect utilisé naturellement, ton proche sans être familier
- Ton Urgent : direct et factuel, "Dans l'attente de votre retour rapide", argument marché ou rareté concret, jamais de pression artificielle

LONGUEURS STRICTES :
- Court : 8 à 10 lignes maximum
- Standard : 12 à 15 lignes
- Long : 18 à 22 lignes

EXPRESSIONS INTERDITES :
- "Suite à notre entretien téléphonique" (trop générique)
- "N'hésitez pas à me contacter" (passif et inefficace)
- "Je me permets de" (servile)
- "Comme convenu" sans contexte précis
- "J'espère que vous allez bien" (remplissage)
- Tout superlatif non étayé sur le bien

CONTRÔLE QUALITÉ OBLIGATOIRE :
Avant de retourner le texte, relis-le intégralement et vérifie :
1. Zéro faute d'orthographe, de grammaire, de typographie et d'accord
2. L'objet fait moins de 50 caractères et ne contient pas de point d'exclamation
3. Une seule action demandée dans le CTA
4. Le ton est cohérent du début à la fin
5. La signature est complète et correctement formatée

Retourne uniquement le texte final de l'email, sans commentaire ni encadrement.`;

    const userPrompt = `
Rédige un email de relance immobilier personnalisé à partir des informations suivantes :

INFORMATIONS SUR L'AGENT :
- Nom de l'agent : ${body.agentName || "Non précisé"}
- Agence : ${body.agencyName || "Non précisée"}
- Téléphone : ${body.agentPhone || "Non précisé"}
- Email : ${body.agentEmail || "Non précisé"}

INFORMATIONS SUR LE PROSPECT :
- Nom du prospect : ${body.prospectName || "Non précisé"}
- Email du prospect : ${body.prospectEmail || "Non précisé"}
- Situation personnelle et professionnelle : ${body.prospectSituation || "Non précisée"}
- Budget : ${body.prospectBudget ? body.prospectBudget + " €" : "Non précisé"}
- Délai de recherche : ${body.searchDelay || "Non précisé"}
- Informations personnelles utiles : ${body.personalInfo || "Non précisées"}

INFORMATIONS SUR LE BIEN :
- Type de bien : ${body.propertyType || "Non précisé"}
- Localisation : ${body.propertyLocation || "Non précisée"}
- Prix : ${body.propertyPrice ? body.propertyPrice + " €" : "Non précisé"}

CONTEXTE DE LA RELATION :
- Date de visite : ${body.visitDate || "Non précisée"}
- Retour du prospect après visite : ${body.visitFeedback || "Non précisé"}
- Objections exprimées : ${body.objections || "Non précisées"}

PARAMÈTRES RÉDACTIONNELS :
- Ton imposé : ${body.tone || "Professionnel"}
- Longueur souhaitée : ${body.length || "Standard (12-15 lignes)"}

SIGNATURE À UTILISER :
---
${body.agentName || "L'agent"}
${body.agencyName || ""}
${body.agentPhone || ""}
${body.agentEmail || ""}

CONSIGNES FINALES :
- Commence par l'objet de l'email
- Référence un élément concret de la visite ou de l'échange
- Adresse directement les objections si elles sont mentionnées
- Termine par un CTA unique et clair
- Applique le contrôle qualité avant de retourner le texte
- Rédige exclusivement en français
`.trim();

    const { response: anthropicResponse, json: anthropicJson } = await callAnthropicWithRetry(apiKey, {
      model: "claude-sonnet-4-5",
      max_tokens: 900,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: userPrompt }],
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
          error: anthropicMessage || "Erreur lors de l'appel à l'API Anthropic.",
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

    const generationDescription = `Email de relance — ${body.prospectName || "Prospect"}, ${body.propertyType || "bien"} ${body.propertyLocation || ""}`
      .replace(/\s+/g, " ")
      .trim();

    const prospectName = body.prospectName?.trim() || null;

    await recordGenerationFromRequest(request, {
      type: "email",
      description: generationDescription,
      prospectName,
      prospectId: body.prospectId?.trim() || null,
      content: email,
    });

    return NextResponse.json({ email });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la génération de l'email." },
      { status: 500 }
    );
  }
}
