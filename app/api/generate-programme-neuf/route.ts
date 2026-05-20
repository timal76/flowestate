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

function extractTextFromAnthropic(json: {
  content?: Array<{ type?: string; text?: string }>;
}): string {
  return (
    json.content
      ?.filter((block) => block.type === "text" && Boolean(block.text))
      .map((block) => block.text)
      .join("\n")
      .trim() || ""
  );
}

function parseJsonFromText(raw: string): unknown {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonStr);
}

function cleanPdfBase64(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes(",")) {
    return trimmed.split(",")[1] ?? trimmed;
  }
  return trimmed;
}

const EXTRACTION_SYSTEM = `Tu es un expert en immobilier neuf français avec 15 ans d'expérience dans l'analyse de plaquettes promoteurs. Analyse ce document et extrais les informations clés de manière structurée en JSON : nom de la résidence, promoteur, ville, quartier, types de biens (T2/T3/T4/maisons), surfaces min/max, prix min/max, dispositifs fiscaux (TVA réduite, PTZ, LMNP, Pinel), prestations listées, performance énergétique (DPE, RE2020), date de livraison estimée, éléments de localisation mentionnés (transports, commerces, écoles), et les arguments marketing utilisés par le promoteur (pour s'en différencier). Si une information est absente, mettre null. Retourne uniquement le JSON, sans markdown ni commentaire.`;

const GENERATION_SYSTEM = `Tu es un rédacteur immobilier expert spécialisé dans la promotion immobilière neuve en France. Tu maîtrises les codes rédactionnels de chaque plateforme, le vocabulaire juridique et fiscal du neuf (VEFA, PTZ, TVA réduite, LMNP, Pinel, RE2020), et la psychologie des différents profils d'acquéreurs.

RÈGLES ABSOLUES :
- Zéro faute d'orthographe, de grammaire, de typographie et d'accord — relis intégralement avant de retourner
- Zéro information inventée — tout doit provenir des données fournies
- Zéro copie de l'angle marketing du promoteur
- Zéro expression interdite : 'havre de paix', 'coup de cœur', 'nichée', 'baignée de lumière', 'demeure d'exception', 'opportunité unique', 'incontournable'
- Mentions légales obligatoires : 'Prix à partir de X € TTC', DPE si connu, dispositifs fiscaux applicables
- Après génération, relire et corriger toute erreur avant de retourner

ANNONCE 1 — LEBONCOIN :
- Titre : 60 caractères max, percutant, sans majuscules excessives
- Corps : 1 200 caractères max
- Structure : accroche directe → caractéristiques clés → avantages concrets selon l'angle → prix → dispositifs fiscaux → appel à l'action
- Ton : direct, concret, pas de jargon excessif

ANNONCE 2 — SELOGER :
- Titre : 100 caractères max, avec mots-clés de recherche (type de bien, ville, caractéristique principale)
- Corps : 2 500 caractères max
- Structure : accroche storytelling (2-3 lignes) → présentation du programme → prestations détaillées → localisation et cadre de vie avec données concrètes → dispositifs fiscaux → appel à l'action
- Ton : professionnel, expert, rassurant
- Vocabulaire technique : 'performance énergétique RE2020', 'agencement optimisé', 'livraison VEFA', 'garantie décennale'

ANNONCE 3 — SITE DE L'AGENCE :
- Titre : libre, accrocheur
- Corps : 3 500 caractères max, liberté éditoriale totale
- Structure : headline émotionnelle → paragraphe storytelling sur le cadre de vie → détail complet du programme → pourquoi investir maintenant → dispositifs fiscaux détaillés → appel à l'action fort
- Peut inclure des sous-titres
- Ton : adapté au ton choisi par l'agent

Retourne un JSON avec 3 clés : leboncoin, seloger, siteAgence. Chaque clé contient : titre (string) et corps (string). Aucun markdown, aucun commentaire.`;

type GenerateProgrammeNeufPayload = {
  pdfBase64?: string;
  angle?: string;
  targetBuyer?: string;
  tone?: string;
  priceFrom?: string;
  additionalInfo?: string;
};

type AnnonceBlock = { titre: string; corps: string };

type GeneratedAnnonces = {
  leboncoin: AnnonceBlock;
  seloger: AnnonceBlock;
  siteAgence: AnnonceBlock;
};

function anthropicErrorResponse(
  anthropicResponse: Response,
  anthropicJson: { error?: { message?: string }; message?: string },
) {
  const anthropicMessage = anthropicJson.error?.message || anthropicJson.message || "";
  if (anthropicMessage.toLowerCase().includes("overloaded")) {
    return NextResponse.json({ error: "overloaded" }, { status: 529 });
  }
  return NextResponse.json(
    {
      error: anthropicMessage || "Erreur lors de l'appel a l'API Anthropic.",
    },
    { status: anthropicResponse.status },
  );
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY manquant dans les variables d'environnement." },
        { status: 500 },
      );
    }

    const effectiveUserId = await resolveGenerationUserId(request);
    if (effectiveUserId) {
      const { allowed, reason } = await checkGenerationLimit(effectiveUserId);
      if (!allowed) {
        return NextResponse.json({ error: reason }, { status: 403 });
      }
    }

    const body = (await request.json()) as GenerateProgrammeNeufPayload;

    if (!body.pdfBase64?.trim()) {
      return NextResponse.json({ error: "Le PDF est requis." }, { status: 400 });
    }
    if (!body.angle?.trim()) {
      return NextResponse.json({ error: "L'angle souhaité est requis." }, { status: 400 });
    }

    const pdfData = cleanPdfBase64(body.pdfBase64);
    const angle = body.angle.trim();
    const targetBuyer = body.targetBuyer?.trim() || "Tout profil";
    const tone = body.tone?.trim() || "Professionnel";
    const priceFrom = body.priceFrom?.trim() || "";
    const additionalInfo = body.additionalInfo?.trim() || "";

    const extractionCall = await callAnthropicWithRetry(apiKey, {
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfData,
              },
            },
            {
              type: "text",
              text: "Analyse cette plaquette promoteur et extrais toutes les informations demandées.",
            },
          ],
        },
      ],
    });

    if (!extractionCall.response.ok) {
      return anthropicErrorResponse(extractionCall.response, extractionCall.json);
    }

    const extractionText = extractTextFromAnthropic(extractionCall.json);
    if (!extractionText) {
      return NextResponse.json(
        { error: "Impossible d'extraire les informations du PDF." },
        { status: 502 },
      );
    }

    let extractedData: Record<string, unknown>;
    try {
      extractedData = parseJsonFromText(extractionText) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Format d'extraction PDF invalide. Réessayez avec un autre document." },
        { status: 502 },
      );
    }

    const ville =
      (typeof extractedData.ville === "string" && extractedData.ville) ||
      (typeof extractedData.quartier === "string" && extractedData.quartier) ||
      "la ville du programme";
    const quartier =
      typeof extractedData.quartier === "string" && extractedData.quartier
        ? extractedData.quartier
        : "";
    const nomResidence =
      typeof extractedData.nom === "string"
        ? extractedData.nom
        : typeof extractedData.nom_residence === "string"
          ? extractedData.nom_residence
          : typeof extractedData["nom de la résidence"] === "string"
            ? extractedData["nom de la résidence"]
            : "";

    const webSearchPrompt = `
Recherche des informations locales actualisées et vérifiables pour enrichir une annonce immobilière neuf en France.

LOCALISATION :
- Ville : ${ville}
${quartier ? `- Quartier : ${quartier}` : ""}
${nomResidence ? `- Programme : ${nomResidence}` : ""}

DONNÉES DÉJÀ EXTRAITES DE LA PLAQUETTE :
${JSON.stringify(extractedData, null, 2)}

OBJECTIF :
Fournis un résumé structuré en JSON (sans markdown) avec ces clés :
- transports (accès métro/tram/bus, gares, axes routiers)
- ecoles_et_services (écoles, commerces, équipements)
- economie_locale (dynamisme, emploi, projets si mentionnés)
- projets_urbains (aménagements, rénovations urbaines récentes ou annoncées)
- prix_m2_reference (fourchette indicative du marché local si trouvable)
- cadre_de_vie (atouts du quartier factuels)
- sources_resume (liste courte des types de sources consultées)

Règles : uniquement des informations plausibles et récentes ; si une donnée est introuvable, mettre null. Pas d'invention.
`.trim();

    const webSearchCall = await callAnthropicWithRetry(apiKey, {
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
      messages: [{ role: "user", content: webSearchPrompt }],
    });

    if (!webSearchCall.response.ok) {
      return anthropicErrorResponse(webSearchCall.response, webSearchCall.json);
    }

    const webSearchText = extractTextFromAnthropic(webSearchCall.json);
    let webData: unknown = webSearchText;
    if (webSearchText) {
      try {
        webData = parseJsonFromText(webSearchText);
      } catch {
        webData = webSearchText;
      }
    }

    const generationUserPrompt = `
Génère les 3 annonces immobilières différenciées à partir des données suivantes.

DONNÉES EXTRAITES DE LA PLAQUETTE (JSON) :
${JSON.stringify(extractedData, null, 2)}

DONNÉES WEB LOCALES (enrichissement) :
${typeof webData === "string" ? webData : JSON.stringify(webData, null, 2)}

PARAMÈTRES AGENT :
- Angle souhaité : ${angle}
- Type d'acquéreur cible : ${targetBuyer}
- Ton souhaité : ${tone}
${priceFrom ? `- Prix à partir de (prioritaire si cohérent avec la plaquette) : ${priceFrom}` : "- Prix à partir de : utiliser les données de la plaquette"}
${additionalInfo ? `- Informations complémentaires : ${additionalInfo}` : ""}

Consignes finales :
- Adapter chaque annonce au profil acquéreur et à l'angle demandé
- Ne pas reprendre les formulations marketing du promoteur listées dans les arguments promoteur
- Respecter strictement les limites de caractères par plateforme
- Retourner uniquement le JSON demandé
`.trim();

    const generationCall = await callAnthropicWithRetry(apiKey, {
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      system: GENERATION_SYSTEM,
      messages: [{ role: "user", content: generationUserPrompt }],
    });

    if (!generationCall.response.ok) {
      return anthropicErrorResponse(generationCall.response, generationCall.json);
    }

    const generationText = extractTextFromAnthropic(generationCall.json);
    if (!generationText) {
      return NextResponse.json(
        { error: "Aucune annonce n'a ete generee par Anthropic." },
        { status: 502 },
      );
    }

    let annonces: GeneratedAnnonces;
    try {
      annonces = parseJsonFromText(generationText) as GeneratedAnnonces;
    } catch {
      return NextResponse.json(
        { error: "Format de generation invalide. Veuillez reessayer." },
        { status: 502 },
      );
    }

    if (!annonces.leboncoin?.titre || !annonces.seloger?.titre || !annonces.siteAgence?.titre) {
      return NextResponse.json(
        { error: "Les 3 annonces n'ont pas ete generees correctement." },
        { status: 502 },
      );
    }

    const residenceLabel =
      nomResidence ||
      (typeof extractedData["nom de la résidence"] === "string"
        ? extractedData["nom de la résidence"]
        : "Programme neuf");
    const generationDescription = `Programme neuf — ${residenceLabel} — ${ville}`.replace(/\s+/g, " ").trim();

    const recordContent = JSON.stringify({
      leboncoin: annonces.leboncoin,
      seloger: annonces.seloger,
      siteAgence: annonces.siteAgence,
    });

    await recordGenerationFromRequest(request, {
      type: "programme-neuf",
      description: generationDescription,
      prospectName: null,
      prospectId: null,
      content: recordContent,
    });

    return NextResponse.json({
      leboncoin: annonces.leboncoin,
      seloger: annonces.seloger,
      siteAgence: annonces.siteAgence,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la generation des annonces programme neuf." },
      { status: 500 },
    );
  }
}
