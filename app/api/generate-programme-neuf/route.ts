import { NextResponse } from "next/server";

import { checkGenerationLimit } from "@/lib/check-generation-limit";
import { recordGenerationFromRequest, resolveGenerationUserId } from "@/lib/record-generation";

export const maxDuration = 300;

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

TA MISSION PRINCIPALE : Produire des annonces fondamentalement différentes de celles que les autres agences qui vendent ce même programme vont rédiger. Les autres vont reformuler la plaquette du promoteur. Toi tu construis une narration originale, ancrée dans la réalité du territoire, centrée sur le quotidien concret de l'acheteur selon son profil.

RÈGLES ABSOLUES :
- Zéro faute d'orthographe, de grammaire, de typographie et d'accord — relis intégralement avant de retourner
- Zéro information inventée — tout doit provenir des données fournies
- Zéro copie de l'angle marketing du promoteur — si le promoteur parle de "métropole dynamique", toi tu parles du marché du jeudi matin à 300m ou du temps de trajet réel vers la gare
- Zéro expression interdite : "havre de paix", "coup de cœur", "nichée", "baignée de lumière", "demeure d'exception", "opportunité unique", "incontournable", "cadre idyllique", "charmant"
- Mentions légales obligatoires : "Prix à partir de X € TTC", DPE si connu, dispositifs fiscaux applicables
- Après génération, relire et corriger toute erreur avant de retourner

STRATÉGIE DE DIFFÉRENCIATION :
- Utilise les données terrain locales (web search) pour ancrer l'annonce dans la réalité
- Utilise les plans et documents annexes pour parler d'agencement concret, pas de généralités
- Construis l'annonce autour du profil acquéreur cible : ce qui change concrètement dans SA vie
- Privilégie les faits précis et chiffrés aux adjectifs creux
- L'accroche doit être inattendue — jamais commencer par le nom de la résidence ou le type de bien

ANNONCE 1 — LEBONCOIN :
- Titre : 60 caractères max, percutant, sans majuscules excessives
- Corps : 1 200 caractères max
- Structure : accroche directe et inattendue → caractéristiques clés chiffrées → avantages concrets selon le profil acquéreur → prix → dispositifs fiscaux → appel à l'action
- Ton : direct, concret, pas de jargon excessif

ANNONCE 2 — SELOGER :
- Titre : 100 caractères max, avec mots-clés de recherche (type de bien, ville, caractéristique principale)
- Corps : 2 500 caractères max
- Structure : accroche storytelling ancrée dans le quotidien (2-3 lignes) → présentation du programme avec données concrètes → agencement et prestations détaillés (utiliser les plans si disponibles) → localisation avec faits précis et chiffrés → dispositifs fiscaux → appel à l'action
- Ton : professionnel, expert, rassurant
- Vocabulaire technique : "performance énergétique RE2020", "agencement optimisé", "livraison VEFA", "garantie décennale"

ANNONCE 3 — SITE DE L'AGENCE :
- Titre : libre, accrocheur, peut être une question ou une affirmation forte
- Corps : 3 500 caractères max, liberté éditoriale totale
- Structure : headline émotionnelle et inattendue → storytelling ancré dans la vie réelle du quartier → détail complet du programme avec données plans si disponibles → argument différenciant principal (ce que les autres ne diront pas) → pourquoi maintenant (marché, fiscal) → dispositifs fiscaux détaillés → appel à l'action fort
- Peut inclure des sous-titres
- Ton : adapté au ton choisi par l'agent, mais toujours ancré dans le concret

Retourne un JSON avec 3 clés : leboncoin, seloger, siteAgence. Chaque clé contient : titre (string) et corps (string). Aucun markdown, aucun commentaire.`;

type GenerateProgrammeNeufPayload = {
  pdfBase64?: string;
  address?: string;
  annexes?: Array<{ data: string; mediaType: string; name: string }>;
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
    const address = body.address?.trim() || "";

    const webSearchVille = address
      ? `localisation ciblée via l'adresse : ${address}`
      : "la commune du programme immobilier neuf";
    const webSearchQuartier = "non précisé (plaquette en cours d'analyse)";
    const webSearchNomResidence = "programme immobilier neuf";

    const webSearchPrompt = `
Tu es un expert immobilier et analyste territorial français. Tu dois enrichir une annonce immobilière neuf avec des informations locales précises, concrètes et différenciantes — des informations que les autres agences qui vendent ce même programme n'auront pas pensé à chercher.

LOCALISATION :
- Ville : ${webSearchVille}
- Quartier : ${webSearchQuartier}
- Programme : ${webSearchNomResidence}
${address ? `- Adresse exacte : ${address}` : ""}

DONNÉES DÉJÀ DANS LA PLAQUETTE (à NE PAS répéter dans l'annonce) :
Non disponibles pour cette recherche — base-toi sur l'adresse et la localisation ci-dessus.

OBJECTIF : Trouve des informations que le promoteur n'a PAS mises dans sa plaquette mais qui sont pertinentes et différenciantes pour convaincre un acheteur. Exemples : une école réputée à 200m, un marché local le dimanche matin, un projet de tramway annoncé, une hausse des prix au m² sur ce secteur, un employeur majeur à 5 minutes, une piste cyclable directe vers le centre.

Fournis un JSON structuré (sans markdown) avec ces clés :
- mobilite_concrete (temps de trajet réels vers le centre, gare, autoroute avec chiffres)
- vie_de_quartier (commerces, marchés, restaurants, parcs dans un rayon de 500m)
- ecoles_proximite (noms et distances des établissements scolaires)
- dynamisme_economique (employeurs locaux, bassin d'emploi, taux de chômage si disponible)
- projets_territoire (aménagements urbains, infrastructures annoncées ou en cours)
- evolution_marche_immo (tendance des prix au m² sur ce secteur sur 2 ans si disponible)
- atouts_meconnus (faits locaux positifs peu connus, que les autres agences n'auront pas)
- environnement_immediat (description de ce qu'on trouve dans un rayon de 200m autour de l'adresse)
${address ? `- description_rue (ambiance réelle de la rue et du quartier immédiat basée sur l'adresse : ${address})` : ""}

Règles : uniquement des faits vérifiables et récents, chiffres précis quand disponibles, aucune invention. Si une donnée est introuvable, mettre null.
`.trim();

    const [extractionCall, webSearchCall] = await Promise.all([
      callAnthropicWithRetry(apiKey, {
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
      }),
      callAnthropicWithRetry(apiKey, {
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{ role: "user", content: webSearchPrompt }],
      }),
    ]);

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

    const annexes = body.annexes ?? [];
    let annexesDescription = "";

    if (annexes.length > 0) {
      const annexeContents = annexes.map((file) => {
        if (file.mediaType === "application/pdf") {
          return {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: cleanPdfBase64(file.data) },
          };
        }
        return {
          type: "image",
          source: { type: "base64", media_type: file.mediaType, data: cleanPdfBase64(file.data) },
        };
      });

      const annexeCall = await callAnthropicWithRetry(apiKey, {
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system:
          "Tu es un expert en immobilier neuf. Analyse ces documents annexes (plans de logements, vues 3D, photos) et extrais les informations utiles pour rédiger une annonce commerciale : agencement des pièces, volumes, points forts architecturaux, qualité des espaces, orientation, luminosité apparente, qualité des finitions visibles. Sois précis et factuel. Retourne un texte structuré en bullet points.",
        messages: [
          {
            role: "user",
            content: [
              ...annexeContents,
              {
                type: "text",
                text: "Analyse ces documents et extrais les informations utiles pour enrichir une annonce immobilière commerciale.",
              },
            ],
          },
        ],
      });

      if (annexeCall.response.ok) {
        annexesDescription = extractTextFromAnthropic(annexeCall.json);
      }
    }

    const generationUserPrompt = `
Génère les 3 annonces immobilières différenciées à partir des données suivantes.

DONNÉES EXTRAITES DE LA PLAQUETTE (JSON) :
${JSON.stringify(extractedData, null, 2)}

DONNÉES WEB LOCALES (enrichissement) :
${typeof webData === "string" ? webData : JSON.stringify(webData, null, 2)}

${address ? `ADRESSE EXACTE DU PROGRAMME : ${address}` : ""}
${annexesDescription ? `ANALYSE DES DOCUMENTS ANNEXES (plans, vues 3D) :\n${annexesDescription}` : ""}

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
