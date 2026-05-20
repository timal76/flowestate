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

    const body = (await request.json()) as GenerateReportPayload;

    const systemPrompt = `Tu es un agent immobilier senior avec 20 ans d'expérience, spécialisé dans la rédaction de comptes rendus de visite à haute valeur ajoutée. Tes comptes rendus sont utilisés par les agents pour assurer un suivi client irréprochable, convaincre les vendeurs de l'activité commerciale déployée, et préparer les négociations.

RÔLE ET ENJEUX DU COMPTE RENDU :
- C'est un document professionnel engageant la réputation de l'agent et de l'agence
- Il doit permettre à un tiers (collègue, directeur d'agence) de comprendre immédiatement la situation
- Il doit anticiper les prochaines étapes et orienter l'action commerciale

STRUCTURE OBLIGATOIRE (dans cet ordre, avec ces titres exacts) :
1. CONTEXTE DE LA VISITE
   → Bien visité, adresse, prix, date, durée, nom du prospect
2. PROFIL DU PROSPECT
   → Situation personnelle et professionnelle, projet d'achat, budget, délai de recherche, situation financière (si connue)
3. DÉROULEMENT DE LA VISITE
   → Chronologie de la visite, zones d'intérêt, attitude générale, niveau d'engagement observé
4. POINTS POSITIFS RELEVÉS
   → Ce qui a retenu l'attention, suscité de l'enthousiasme ou des questions positives
5. POINTS NÉGATIFS ET OBJECTIONS
   → Réserves exprimées, freins identifiés, objections formulées explicitement ou implicitement
6. QUESTIONS POSÉES PAR LE PROSPECT
   → Questions techniques, juridiques, financières ou pratiques posées durant la visite
7. ANALYSE DE L'AGENT
   → Niveau d'intérêt réel estimé (faible / moyen / élevé), probabilité de suite, points de négociation potentiels
8. SUITE À DONNER
   → Prochaine étape concrète avec délai, action recommandée, interlocuteurs à mobiliser

RÈGLES RÉDACTIONNELLES STRICTES :
- Ton Professionnel : phrases complètes, registre formel, chaque section développée en paragraphe
- Ton Détaillé : exhaustif, chaque information nuancée, sous-points développés, analyse approfondie
- Ton Synthétique : bullet points concis, une ligne par information clé, essentiel uniquement
- Jamais de formules vagues : "le prospect semble intéressé" → "le prospect a demandé le délai de rétractation et sollicité une deuxième visite avec son conjoint"
- Utiliser des faits observables, pas des suppositions non étayées
- Ne jamais inclure les coordonnées de l'agent dans le corps du texte
- Ne jamais écrire "Compte rendu rédigé le" ou "Document établi le"

CONTRÔLE QUALITÉ OBLIGATOIRE :
Avant de retourner le texte, relis-le intégralement et vérifie :
1. Zéro faute d'orthographe, de grammaire, de typographie et d'accord
2. Les 8 sections sont présentes et dans l'ordre
3. Aucune information inventée — si une donnée est manquante, écrire "Information non communiquée"
4. Le ton est cohérent du début à la fin
5. Le document est immédiatement exploitable sans correction

Retourne uniquement le texte du compte rendu, sans commentaire ni encadrement.`;

    const userPrompt = `
Rédige un compte rendu de visite immobilier complet et professionnel à partir des informations suivantes :

INFORMATIONS SUR LE BIEN :
- Type de bien : ${body.propertyType || "Non précisé"}
- Adresse : ${body.propertyAddress || "Non précisée"}
- Prix affiché : ${body.propertyPrice ? body.propertyPrice + " €" : "Non précisé"}

INFORMATIONS SUR LA VISITE :
- Date de visite : ${body.visitDate || "Non précisée"}
- Durée de la visite : ${body.visitDuration || "Non précisée"}

INFORMATIONS SUR LE PROSPECT :
- Nom du prospect : ${body.prospectName || "Non précisé"}
- Email : ${body.prospectEmail || "Non précisé"}
- Téléphone : ${body.prospectPhone || "Non précisé"}
- Situation personnelle et professionnelle : ${body.personalInfo || "Non précisée"}

OBSERVATIONS DE LA VISITE :
- Réaction générale du prospect : ${body.prospectReaction || "Non précisée"}
- Points positifs relevés : ${body.positivePoints || "Non précisés"}
- Points négatifs / objections : ${body.negativePoints || "Non précisés"}
- Questions posées par le prospect : ${body.prospectQuestions || "Non précisées"}

SUITE COMMERCIALE :
- Prochaine étape prévue : ${body.nextStep || "Non précisée"}

PARAMÈTRES RÉDACTIONNELS :
- Ton souhaité : ${body.tone || "Professionnel"}

CONSIGNES FINALES :
- Respecte la structure en 8 sections dans l'ordre exact
- Pour toute information manquante, indique "Information non communiquée"
- Applique le contrôle qualité avant de retourner le texte
- Rédige exclusivement en français
`.trim();

    const { response: anthropicResponse, json: anthropicJson } = await callAnthropicWithRetry(apiKey, {
      model: "claude-sonnet-4-5",
      max_tokens: 6000,
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

    const generationDescription = `Compte-rendu — ${body.propertyType || "Bien"} ${body.propertyAddress || ""}, prospect ${body.prospectReaction || ""}`
      .replace(/\s+/g, " ")
      .trim();

    const prospectName = body.prospectName?.trim() || null;

    await recordGenerationFromRequest(request, {
      type: "compte-rendu",
      description: generationDescription,
      prospectName,
      prospectId: body.prospectId?.trim() || null,
      content: compteRendu,
    });

    return NextResponse.json({ compteRendu });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la génération du compte-rendu." },
      { status: 500 }
    );
  }
}
