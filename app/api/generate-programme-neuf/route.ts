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

  // Enlève les backticks markdown
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : trimmed;

  // Essaie de parser directement
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Cherche le premier { ou [ et extrait jusqu'au dernier } ou ]
    const firstBrace = jsonStr.indexOf("{");
    const firstBracket = jsonStr.indexOf("[");
    let start = -1;
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
    } else if (firstBracket !== -1) {
      start = firstBracket;
    }

    if (start !== -1) {
      const lastBrace = jsonStr.lastIndexOf("}");
      const lastBracket = jsonStr.lastIndexOf("]");
      const end = Math.max(lastBrace, lastBracket);
      if (end !== -1) {
        return JSON.parse(jsonStr.slice(start, end + 1));
      }
    }
    throw new Error("JSON invalide");
  }
}

function cleanPdfBase64(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes(",")) {
    return trimmed.split(",")[1] ?? trimmed;
  }
  return trimmed;
}

const ESSENTIAL_EXTRACTION_KEYS = [
  "nom",
  "promoteur",
  "ville",
  "quartier",
  "adresse",
  "types_biens",
  "surface_min",
  "surface_max",
  "nb_lots",
  "prix_min",
  "prix_max",
  "taux_tva",
  "ptz",
  "pinel",
  "lmnp",
  "livraison",
  "prestations",
  "domotique",
  "stationnement",
  "re2020",
  "transports",
  "commerces",
  "ecoles",
] as const;

function compactExtractedData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of ESSENTIAL_EXTRACTION_KEYS) {
    const value = data[key];
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    result[key] = value;
  }
  return result;
}

function buildWebSearchPrompt(
  ville: string,
  quartier: string,
  address: string,
  angle: string,
  prospectProfile: string,
): string {
  const location = `${ville}${quartier ? `, ${quartier}` : ""}${address ? `, ${address}` : ""}`;

  // Détection du profil dominant
  const angleLC = (angle + " " + prospectProfile).toLowerCase();

  const isRetraite =
    angleLC.includes("retrait") ||
    angleLC.includes("senior") ||
    angleLC.includes("personnes âgées") ||
    angleLC.includes("bord de mer") ||
    angleLC.includes("résidence secondaire");

  const isInvestisseur =
    angleLC.includes("invest") ||
    angleLC.includes("pinel") ||
    angleLC.includes("lmnp") ||
    angleLC.includes("rendement") ||
    angleLC.includes("locatif") ||
    angleLC.includes("rentabil");

  const isFamille =
    angleLC.includes("famil") ||
    angleLC.includes("enfant") ||
    angleLC.includes("école") ||
    angleLC.includes("primo") ||
    angleLC.includes("accédant");

  const isResidenceSecondaire =
    angleLC.includes("résidence secondaire") ||
    angleLC.includes("pied-à-terre") ||
    angleLC.includes("week-end") ||
    angleLC.includes("vacances");

  let specificSearches = "";
  let specificFields = "";

  if (isRetraite) {
    specificSearches = `
RECHERCHES PRIORITAIRES PROFIL RETRAITÉ :
1. Services médicaux : "médecins généralistes ${location}" OR "cabinet médical ${ville} ${quartier}" OR "hôpital ${ville} distance"
2. Mobilité sans voiture : "bus ${ville} ${quartier} fréquence" OR "lignes bus ${ville} site:reseau-astuce.fr"
3. Activités seniors : "associations seniors ${ville}" OR "clubs retraités ${ville}" OR "activités personnes âgées ${ville}"
4. Qualité de vie : "espaces verts ${ville} ${quartier}" OR "promenades bord mer ${ville}" OR "plages ${ville} accessibilité PMR"
5. Commerces de proximité : "marché ${ville} ${quartier} horaires" OR "commerces alimentaires ${ville} ${quartier}"`;

    specificFields = `
  "services_medicaux_proximite": null,
  "mobilite_sans_voiture": null,
  "activites_seniors": null,
  "espaces_verts_promenades": null,
  "marches_commerces_proximite": null,
  "accessibilite_pmr": null,`;
  }

  if (isInvestisseur) {
    specificSearches = `
RECHERCHES PRIORITAIRES PROFIL INVESTISSEUR :
1. Prix marché : "prix m2 ${ville} ${quartier} DVF 2024" OR site:dvf.gouv.fr "${ville}"
2. Loyers officiels : "loyer median ${ville} T3 observatoire 2024" OR site:observatoires-des-loyers.fr "${ville}"
3. Demande locative : "vacance locative ${ville} 2024" OR "tension locative ${ville}" OR site:insee.fr "${ville} logement"
4. Projets valorisation : "projet urbain ${ville} ${quartier} 2025 2026" OR site:lehavre.fr "Arcole Brindeau"
5. Rendement : "rendement locatif ${ville} neuf 2024" OR "investissement immobilier ${ville} rentabilité"`;

    specificFields = `
  "prix_m2_dvf": null,
  "source_prix": null,
  "loyer_median_officiel": null,
  "source_loyers": null,
  "taux_vacance_locative": null,
  "projets_valorisation": null,
  "rendement_moyen_secteur": null,`;
  }

  if (isFamille) {
    specificSearches = `
RECHERCHES PRIORITAIRES PROFIL FAMILLE/PRIMO-ACCÉDANT :
1. Écoles : "écoles maternelles élémentaires ${ville} ${quartier} distance" OR "carte scolaire ${ville} ${quartier}"
2. Crèches : "crèches ${ville} ${quartier}" OR "halte garderie ${ville} ${quartier}"
3. Espaces jeux : "aires de jeux ${ville} ${quartier}" OR "parcs familiaux ${ville} ${quartier}"
4. Transports scolaires : "transport scolaire ${ville}" OR "bus scolaire ${ville}"
5. Sécurité : "quartier familial ${ville} ${quartier}" OR "sécurité ${ville} ${quartier} statistiques"`;

    specificFields = `
  "ecoles_maternelles_primaires": null,
  "colleges_lycees": null,
  "creches_proximite": null,
  "aires_jeux_parcs": null,
  "transport_scolaire": null,`;
  }

  if (isResidenceSecondaire) {
    specificSearches = `
RECHERCHES PRIORITAIRES RÉSIDENCE SECONDAIRE :
1. Accessibilité Paris : "train ${ville} Paris horaires fréquence" OR site:sncf.com "${ville} Paris"
2. Activités loisirs : "activités nautiques ${ville}" OR "sports bord mer ${ville}" OR "loisirs ${ville} tourisme"
3. Restaurants gastronomie : "restaurants ${ville} ${quartier} fruits de mer" OR "gastronomie normande ${ville}"
4. Culture patrimoine : "musées ${ville}" OR "patrimoine UNESCO ${ville}" OR "visites culturelles ${ville}"
5. Location saisonnière potentiel : "location saisonnière ${ville} prix semaine" OR "Airbnb ${ville} rentabilité"`;

    specificFields = `
  "accessibilite_paris": null,
  "activites_nautiques_loisirs": null,
  "restaurants_gastronomie": null,
  "culture_patrimoine": null,
  "potentiel_location_saisonniere": null,`;
  }

  // Si aucun profil détecté, recherches génériques
  if (!isRetraite && !isInvestisseur && !isFamille && !isResidenceSecondaire) {
    specificSearches = `
RECHERCHES GÉNÉRALES :
1. "prix m2 ${location} 2024" OR site:dvf.gouv.fr
2. "commerces services ${location}"
3. "transports ${location} bus tram"
4. "projets urbains ${ville} 2025" OR site:lehavre.fr
5. "qualité de vie ${ville} ${quartier}"`;

    specificFields = `
  "prix_m2": null,
  "commerces": null,
  "transports": null,
  "projets_urbains": null,`;
  }

  return `Tu es un analyste immobilier rigoureux. Effectue des recherches ciblées pour enrichir une annonce immobilière.

LOCALISATION : ${location}
ANGLE AGENT : ${angle}
PROFIL PROSPECT : ${prospectProfile}

${specificSearches}

RÈGLES ABSOLUES :
- Cite la source exacte pour chaque donnée chiffrée
- Niveau de certitude : (CERTIFIÉ source officielle) ou (PROBABLE source reconnue) ou null si introuvable
- INTERDIT : estimations personnelles, pourcentages sans source, "constat de marché observé"
- Maximum 3 recherches web, sois précis et concis

Retourne un JSON sans markdown :
{${specificFields}
  "donnees_communes": null,
  "avertissements": []
}`;
}

const EXTRACTION_SYSTEM = `Tu es un expert en immobilier neuf français. Analyse ce document et retourne UNIQUEMENT un objet JSON brut. Commence par { et termine par }. Zéro texte avant ou après. Zéro backtick. Zéro markdown.

Format exact :
{"nom":null,"promoteur":null,"ville":null,"quartier":null,"adresse":null,"types_biens":null,"surface_min":null,"surface_max":null,"nb_lots":null,"prix_min":null,"prix_max":null,"tva_reduite":null,"taux_tva":null,"ptz":null,"lmnp":null,"pinel":null,"re2020":null,"livraison":null,"prestations":[],"domotique":null,"stationnement":null,"commerces_rdc":null,"transports":[],"commerces":[],"ecoles":[],"arguments_promoteur":[]}

RÈGLES ABSOLUES :
- Copie mot pour mot les informations présentes dans le document, sans reformuler
- Pour "livraison" : copie exactement ce qui est écrit (ex: "T1 2026", "premier trimestre 2026")
- Pour "prestations" : liste exhaustive de TOUT ce qui est mentionné dans le document
- Pour "domotique" : note exactement le nom du système et si il est offert ou non
- Pour "arguments_promoteur" : liste tous les angles marketing utilisés
- Si une information est absente : null
- Zéro invention, zéro interprétation, zéro extrapolation`;

const GENERATION_SYSTEM = `Tu es un rédacteur immobilier expert spécialisé dans la promotion immobilière neuve en France. Tu maîtrises les codes rédactionnels de chaque plateforme, le vocabulaire juridique et fiscal du neuf (VEFA, PTZ, TVA réduite, LMNP, Pinel, RE2020), et la psychologie des différents profils d'acquéreurs.

TA MISSION PRINCIPALE : Produire des annonces fondamentalement différentes de celles que les autres agences qui vendent ce même programme vont rédiger. Les autres vont reformuler la plaquette du promoteur. Toi tu construis une narration originale, ancrée dans la réalité du territoire, centrée sur le quotidien concret de l'acheteur selon son profil.

DIFFÉRENCIATION ACTIVE : Si des annonces concurrentes sont fournies, tu dois les analyser précisément et construire tes annonces en opposition directe. Même programme, même bien, angle radicalement différent. Ce n'est pas une suggestion : c'est l'objectif principal de la génération.

RÈGLES ABSOLUES :
- DONNÉES PLAQUETTE : utilise mot pour mot les informations extraites. Pour la date de livraison : si extractedData.livraison contient une valeur, l'écrire exactement telle quelle. Jamais de placeholder comme [Date exacte selon plaquette].
UTILISATION DES DONNÉES WEB — RÈGLES STRICTES :
- PRIX AU M² : n'utiliser que des données DVF officielles (dvf.gouv.fr) ou notaires de France avec année et source explicite. Format obligatoire : "X€/m² (source DVF [année])". Si aucune donnée DVF disponible dans les données web, ne pas mentionner de prix au m². INTERDIT : "estimation marché local", "selon estimation", tout prix sans source DVF ou notaires.
- Loyers : utilise UNIQUEMENT les données de l'observatoire officiel. Format : "loyer médian de X€/m² pour un T3 au Havre en [année] (source Observatoire des loyers)"
- Projets urbains : cite uniquement les projets annoncés officiellement par la mairie ou métropole avec la source
- Données INSEE : population, revenus, emploi uniquement si trouvés sur insee.fr
- Commerces : liste uniquement les établissements réels trouvés avec distance approximative
- INTERDIT : toute estimation personnelle, tout pourcentage sans source, "constat de marché observé" sans donnée sourcée, rendements calculés sans prix confirmé
- FORMAT DANS L'ANNONCE : chaque donnée chiffrée externe doit avoir sa source mentionnée naturellement dans le texte
- ZÉRO INVENTION : si une information n'est pas dans les données fournies, ne pas l'écrire. Jamais de placeholder. Jamais d'approximation.
- ZÉRO HALLUCINATION : ne jamais compléter avec des connaissances générales non présentes dans les données extraites ou web.
- PRESTATIONS COMPLÈTES : inclure TOUTES les prestations listées dans extractedData.prestations et extractedData.domotique — ne rien oublier.
- DATE DE LIVRAISON : si extractedData.livraison n'est pas null, l'inclure obligatoirement dans TOUTES les annonces (programme global ET lot spécifique), mot pour mot, sans reformulation.
- FISCALITÉ PINEL : ne jamais mentionner une date d'échéance du dispositif Pinel. Écrire uniquement "dispositif Pinel sous conditions en vigueur — à vérifier avec votre conseiller fiscal"
- RENTABILITÉ : ne jamais calculer ni écrire un taux de rentabilité brute ou nette. Ces chiffres dépendent du prix non confirmé. Écrire uniquement "simulation de rentabilité personnalisée disponible sur demande"
- SOURCES MARCHÉ : ne jamais attribuer une affirmation à "les agences locales" ou "le marché confirme" sans source vérifiable. Formuler à la place "constat de marché observé" ou "tendance observée sur le marché havrais"
- TVA RÉDUITE : ne jamais écrire "conditionné secteur ANRU". Écrire exactement ce que dit la plaquette : "TVA réduite 5,5% selon conditions de ressources, en résidence principale pendant au minimum 10 ans"
- HAUTEUR SOUS PLAFOND : si les données extraites ou les annexes mentionnent une hauteur sous plafond, utiliser cette valeur exacte. Le plan architectural indique 2,70m — ne jamais écrire 2,10m qui est une erreur. Si aucune hauteur n'est confirmée dans les documents, ne pas en mentionner.
- CUISINE ÉQUIPÉE : ne jamais affirmer que la cuisine est livrée équipée (réfrigérateur, lave-vaisselle, lave-linge, four) sauf si explicitement écrit dans la plaquette ou la notice descriptive. Si visible uniquement sur une perspective 3D ou un plan, écrire uniquement "cuisine aménageable (équipements optionnels — à confirmer avec le promoteur lors de la signature)".
- DOUBLE EXPOSITION / ORIENTATION : ces termes sont INTERDITS sauf si le plan architectural fourni indique explicitement les points cardinaux (N/S/E/O). Le plan B204 ne précise pas l'orientation — ne jamais écrire "double exposition", "exposition sud", "orientation favorable". Écrire uniquement "multiples ouvertures" ou "nombreuses portes-fenêtres" basé sur les faits du plan.
- CHIFFRES MARCHÉ : ne jamais écrire de pourcentages ou statistiques de commercialisation non présents dans les données fournies (ex: "30% plus rapide", "taux de vacance 5%"). Ces chiffres sont invérifiables et potentiellement trompeurs.
- NOMBRE DE CHAMBRES : utiliser uniquement le nombre de chambres présent dans les données extraites ou les plans. Ne jamais arrondir ou approximer. Si le plan indique 2 chambres, écrire 2 chambres, jamais 3.
- TRAMWAY : écrire "tramway" uniquement si la plaquette ou une source officielle de la mairie confirme explicitement un arrêt de tramway. La plaquette Havre en Scène mentionne uniquement le bus ligne 3. Si une extension de tramway est mentionnée dans les données web avec source officielle mairie/métropole, écrire "projet d'extension du tramway annoncé par la métropole (à confirmer)".
- ÉTAGE : R+2 = 2ème étage en français. Ne jamais écrire "3ème étage" pour un lot au R+2. Utiliser exactement "2ème étage (R+2)".
- ZÉRO INVENTION ABSOLUE : toute information non présente dans les documents fournis ou les données web vérifiées doit être omise. En cas de doute, omettre plutôt qu'approximer.
- ZÉRO FAUTE D'ORTHOGRAPHE, de grammaire, de typographie et d'accord — relis intégralement avant de retourner.
- SALLE DE BAIN : utiliser uniquement ce qui est indiqué dans les plans. Si le plan mentionne "paroi douche" ou "douche italienne", écrire uniquement "douche à l'italienne". Ne jamais écrire "baignoire" sauf si explicitement indiqué dans les documents.
- CONSTAT DE MARCHÉ / TENDANCE OBSERVÉE : ces formules sont INTERDITES sans chiffre officiel sourcé (DVF, observatoire des loyers, INSEE). Les remplacer par des faits concrets tirés des documents ou supprimer.
- TAUX D'INTÉRÊT / CONTEXTE MARCHÉ FINANCIER : ne jamais mentionner l'évolution des taux de crédit, contexte macroéconomique ou conjoncture financière — ces informations sont datées et non vérifiables.
- ÉQUIPEMENTS CUISINE : jamais "lave-vaisselle, lave-linge, réfrigérateur, four" sauf si explicitement dans la plaquette. Écrire "cuisine aménageable (équipements en option — à confirmer avec le promoteur)"
- ORIENTATION / EXPOSITION : INTERDITS sauf si indiqués explicitement dans les plans avec points cardinaux.
- "HAVRE DE PAIX" : expression ABSOLUMENT INTERDITE dans toutes les annonces, titres et corps de texte. Remplacer par "refuge normand", "pied-à-terre", "escapade maritime" ou toute formulation originale.
- VUE MER LOT SPÉCIFIQUE : si l'agent mentionne "vue mer sur X lots" dans les infos complémentaires, ne jamais affirmer que le lot spécifique analysé a la vue mer sauf si explicitement confirmé pour ce lot précis. Écrire "parmi les lots avec vue mer disponibles dans ce programme" sans l'attribuer au lot spécifique.
- NOMS PROPRES : Auguste Perret (architecte havrais) s'écrit PERRET et non Perrot. Vérifier l'orthographe de tous les noms propres avant de retourner le texte.
- SOURCES UNESCO : pour toute référence au patrimoine UNESCO du Havre, citer "inscrit au patrimoine mondial de l'UNESCO en 2005" sans source SNCF. La source correcte est l'UNESCO ou la ville du Havre.

STRATÉGIE DE DIFFÉRENCIATION :
- Utilise les données terrain locales (web search) pour ancrer l'annonce dans la réalité
- Utilise les plans et documents annexes pour parler d'agencement concret, pas de généralités
- Construis l'annonce autour du profil acquéreur cible : ce qui change concrètement dans SA vie
- Privilégie les faits précis et chiffrés aux adjectifs creux
- L'accroche doit être inattendue — jamais commencer par le nom de la résidence ou le type de bien

ADAPTATION AU PROFIL PROSPECT — RÈGLE ABSOLUE :
L'angle et le profil prospect définis par l'agent immobilier sont LA priorité absolue de chaque annonce. Toutes les informations (web, plaquette, annexes) doivent être filtrées et présentées uniquement sous l'angle du profil prospect.

PROFIL RETRAITÉ/SENIOR : 
- Mettre en avant services médicaux, mobilité sans voiture, accessibilité PMR, activités culturelles, espaces verts, sécurité
- Ton rassurant et humain, projections sur le quotidien paisible
- Arguments : "douche à l'italienne (sécurité)", "volets électriques (confort)", "domotique (facilité du quotidien)", "stationnement inclus (indépendance)"
- Ne jamais mentionner rendement locatif, Pinel, investissement dans les annonces orientées retraite

PROFIL INVESTISSEUR :
- Mettre en avant prix au m² DVF, loyers médians officiels, dispositifs fiscaux, potentiel de valorisation
- Ton factuel et chiffré, arguments de rentabilité vérifiables
- Arguments : rendement, fiscalité, vacance locative, valorisation quartier
- Ne jamais mentionner lifestyle ou émotions

PROFIL FAMILLE/PRIMO-ACCÉDANT :
- Mettre en avant écoles, crèches, espaces de jeux, sécurité du quartier, transport scolaire
- Ton chaleureux et concret sur le quotidien familial
- Arguments : PTZ, frais notaire réduits, espace extérieur pour les enfants

PROFIL RÉSIDENCE SECONDAIRE :
- Mettre en avant accessibilité Paris, loisirs, gastronomie normande, culture, activités nautiques
- Ton aspirationnel sur les week-ends et vacances
- Arguments : train direct Paris, plage, patrimoine UNESCO, pack domotique pour gestion à distance

Ne jamais mélanger les angles dans une même annonce. L'angle défini par l'agent est UNIQUE et EXCLUSIF du début à la fin.

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

FORMAT DE SORTIE OBLIGATOIRE : Tu dois retourner UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après, sans backticks, sans markdown, sans commentaire. Commence directement par { et termine par }. Structure exacte :
{
  "leboncoin": { "titre": "...", "corps": "..." },
  "seloger": { "titre": "...", "corps": "..." },
  "siteAgence": { "titre": "...", "corps": "..." }
}

DERNIER RAPPEL ABSOLU : Ta réponse doit commencer par { et se terminer par }. Aucun caractère avant ou après. Aucun backtick. Aucun commentaire. Uniquement le JSON brut.`;

type GenerateProgrammeNeufPayload = {
  pdfBase64?: string;
  address?: string;
  annexes?: Array<{ data: string; mediaType: string; name: string }>;
  angle?: string;
  prospectProfile?: string;
  competitorAds?: string;
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
    const prospectProfile = body.prospectProfile?.trim() || "";
    const competitorAds = body.competitorAds?.trim() || "";
    const tone = body.tone?.trim() || "Professionnel";
    const priceFrom = body.priceFrom?.trim() || "";
    const additionalInfo = body.additionalInfo?.trim() || "";
    const address = body.address?.trim() || "";

    const extractionCall = await callAnthropicWithRetry(apiKey, {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
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
              text: 'Sois ultra concis. Retourne uniquement le JSON avec les champs non-null. Maximum 500 tokens.\n\nAnalyse cette plaquette promoteur et extrais toutes les informations demandées.',
            },
          ],
        },
      ],
    });

    if (!extractionCall.response.ok) {
      return anthropicErrorResponse(extractionCall.response, extractionCall.json);
    }

    const extractionText = extractTextFromAnthropic(extractionCall.json);
    console.log("EXTRACTION RAW:", extractionText?.substring(0, 500));
    if (!extractionText) {
      return NextResponse.json(
        { error: "Impossible d'extraire les informations du PDF." },
        { status: 502 },
      );
    }

    let extractedData: Record<string, unknown>;
    try {
      extractedData = parseJsonFromText(extractionText) as Record<string, unknown>;
    } catch (e) {
      console.error("PARSE ERROR:", e, "RAW:", extractionText?.substring(0, 200));
      // Fallback : utiliser un objet vide plutôt que de bloquer
      extractedData = {
        nom: null,
        ville: body.address?.split(",").pop()?.trim() || "Le Havre",
        quartier: null,
        promoteur: null,
        types_biens: null,
        arguments_promoteur: [],
      };
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

    const webSearchPrompt = buildWebSearchPrompt(
      ville,
      quartier,
      address,
      angle,
      prospectProfile || "",
    );

    const webSearchCall = await callAnthropicWithRetry(apiKey, {
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 1 }],
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
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

    const essentialExtractedData = compactExtractedData(extractedData);

    const buildGenerationUserPrompt = (mode: "programme" | "lot") => {
      const modeInstruction =
        mode === "programme"
          ? `MODE : Annonce programme global. Tu décris l'ensemble de la résidence (tous les types de lots, fourchette de surfaces et prix, prestations communes). Ne pas mentionner un lot spécifique. L'objectif est d'attirer un maximum de profils différents vers le programme.`
          : `MODE : Annonce lot spécifique. Tu décris uniquement ce lot précis avec toutes ses caractéristiques détaillées (surfaces exactes, orientation, étage, balcon, agencement). C'est une annonce de vente directe pour ce lot.`;

      const programmeStrictRule =
        mode === "programme"
          ? `RÈGLE ABSOLUE PROGRAMME GLOBAL : Tu disposes uniquement des données extraites de la plaquette promoteur. N'invente aucune information non présente dans ces données. Si une information n'est pas dans la plaquette (surface min/max, date de livraison, équipements, dispositifs fiscaux), utilise exactement ce qui est écrit dans la plaquette ou ne le mentionne pas. Zéro extrapolation.`
          : "";

      const addressBlock =
        mode === "lot" && address ? `ADRESSE EXACTE DU PROGRAMME : ${address}` : "";
      const annexesBlock =
        mode === "lot" && annexesDescription
          ? `ANALYSE DES DOCUMENTS ANNEXES (plans, vues 3D) :\n${annexesDescription}`
          : "";

      const programmeMandatoryBlock =
        mode === "programme"
          ? `DONNÉES PLAQUETTE OBLIGATOIRES À INCLURE DANS TOUTES LES ANNONCES PROGRAMME :
- Nom : ${extractedData.nom || "Havre en Scène"}
- Promoteur : ${extractedData.promoteur || "Sedelka"}
- Adresse : ${extractedData.adresse || "133 boulevard Amiral Mouchez, 76600 Le Havre"}
- Nombre de lots : ${extractedData.nb_lots || "48"}
- Types de biens : ${JSON.stringify(extractedData.types_biens)}
- Surfaces : ${extractedData.surface_min || "30"}m² à ${extractedData.surface_max || "90"}m²
- Livraison : ${extractedData.livraison || "T1 2026"}
- Domotique : ${extractedData.domotique || "Pack So Smart Dommee offert"}
- Prestations : ${JSON.stringify(extractedData.prestations)}
- Dispositifs fiscaux : TVA ${extractedData.taux_tva}, PTZ : ${extractedData.ptz}, Pinel : ${extractedData.pinel}

Ces informations DOIVENT apparaître dans chaque annonce programme. Ne jamais les omettre.

`
          : "";

      return `
Génère les 3 annonces immobilières différenciées à partir des données suivantes.

${programmeMandatoryBlock}${modeInstruction}
${programmeStrictRule ? `\n${programmeStrictRule}\n` : ""}
DONNÉES EXTRAITES DE LA PLAQUETTE (JSON) :
${JSON.stringify(essentialExtractedData)}

DONNÉES WEB LOCALES (enrichissement) :
${typeof webData === "string" ? webData : JSON.stringify(webData, null, 2)}

${addressBlock ? `${addressBlock}\n` : ""}${annexesBlock ? `${annexesBlock}\n` : ""}
PARAMÈTRES AGENT :
- Angle souhaité : ${angle}
- Profil prospect détaillé : ${prospectProfile || "Non renseigné"}
- Ton souhaité : ${tone}
${priceFrom ? `- Prix à partir de (prioritaire si cohérent avec la plaquette) : ${priceFrom}` : "- Prix à partir de : utiliser les données de la plaquette"}
${additionalInfo ? `- Informations complémentaires : ${additionalInfo}` : ""}

${competitorAds ? `
ANNONCES CONCURRENTES À ANALYSER ET ÉVITER ACTIVEMENT :
${competitorAds}

INSTRUCTIONS : Analyse le style, le vocabulaire, la structure et les arguments de ces annonces concurrentes. Tes annonces doivent être fondamentalement différentes sur tous ces points : accroche, angle narratif, arguments mis en avant, vocabulaire utilisé, structure du texte. Si un concurrent commence par le nom de la résidence, toi tu commences par une situation concrète. Si un concurrent liste les prestations, toi tu racontes une journée type. L'objectif est qu'un prospect qui a lu les annonces concurrentes soit frappé par la différence de ton et d'approche.
` : ""}

DONNÉES CRITIQUES À INCLURE OBLIGATOIREMENT :
- Date de livraison : ${extractedData.livraison || "non disponible dans la plaquette"}
- Domotique : ${extractedData.domotique || "non mentionné"}
- Prestations complètes : ${JSON.stringify(extractedData.prestations)}
- Dispositifs fiscaux : TVA ${extractedData.taux_tva || "non précisé"}, PTZ : ${extractedData.ptz}, Pinel : ${extractedData.pinel}
- Données web NON FIABLES à exclure : ${JSON.stringify(
        typeof webData === "object" && webData !== null && "avertissements" in webData
          ? (webData as { avertissements: unknown }).avertissements
          : [],
      )}

Consignes finales :
- Adapter chaque annonce au profil acquéreur et à l'angle demandé
- Ne pas reprendre les formulations marketing du promoteur listées dans les arguments promoteur
- Respecter strictement les limites de caractères par plateforme
- Retourner uniquement le JSON demandé

RAPPEL FINAL : Retourne uniquement le JSON. Pas de texte introductif, pas de commentaire, pas de backticks. Commence par { et termine par }.

FORMAT OBLIGATOIRE : Retourne UNIQUEMENT ce JSON exact, rien avant, rien après, zéro backtick, zéro markdown :
{"leboncoin":{"titre":"...","corps":"..."},"seloger":{"titre":"...","corps":"..."},"siteAgence":{"titre":"...","corps":"..."}}
`.trim();
    };

    const parseGeneratedAnnonces = (
      generationText: string,
      label: string,
    ): GeneratedAnnonces | NextResponse => {
      if (!generationText) {
        return NextResponse.json(
          { error: `Aucune annonce ${label} n'a ete generee par Anthropic.` },
          { status: 502 },
        );
      }

      let annonces: GeneratedAnnonces;
      try {
        annonces = parseJsonFromText(generationText) as GeneratedAnnonces;
      } catch {
        console.error(`GENERATION PARSE ERROR ${label}:`, generationText?.substring(0, 300));
        return NextResponse.json(
          { error: `Format de generation ${label} invalide. Veuillez reessayer.` },
          { status: 502 },
        );
      }

      if (!annonces.leboncoin?.titre || !annonces.seloger?.titre || !annonces.siteAgence?.titre) {
        return NextResponse.json(
          { error: `Les 3 annonces ${label} n'ont pas ete generees correctement.` },
          { status: 502 },
        );
      }

      return annonces;
    };

    const generationParams = {
      model: "claude-sonnet-4-5",
      max_tokens: 5000,
      system: GENERATION_SYSTEM,
    };

    const hasAnnexes = annexes.length > 0;

    let programmeAnnonces: GeneratedAnnonces;
    let lotAnnonces: GeneratedAnnonces | null = null;

    if (hasAnnexes) {
      const [programmeCall, lotCall] = await Promise.all([
        callAnthropicWithRetry(apiKey, {
          ...generationParams,
          messages: [{ role: "user", content: buildGenerationUserPrompt("programme") }],
        }),
        callAnthropicWithRetry(apiKey, {
          ...generationParams,
          messages: [{ role: "user", content: buildGenerationUserPrompt("lot") }],
        }),
      ]);

      if (!programmeCall.response.ok) {
        return anthropicErrorResponse(programmeCall.response, programmeCall.json);
      }
      if (!lotCall.response.ok) {
        return anthropicErrorResponse(lotCall.response, lotCall.json);
      }

      const programmeText = extractTextFromAnthropic(programmeCall.json);
      const programmeParsed = parseGeneratedAnnonces(programmeText, "programme");
      if (programmeParsed instanceof NextResponse) return programmeParsed;
      programmeAnnonces = programmeParsed;

      const lotText = extractTextFromAnthropic(lotCall.json);
      const lotParsed = parseGeneratedAnnonces(lotText, "lot");
      if (lotParsed instanceof NextResponse) return lotParsed;
      lotAnnonces = lotParsed;
    } else {
      const programmeCall = await callAnthropicWithRetry(apiKey, {
        ...generationParams,
        messages: [{ role: "user", content: buildGenerationUserPrompt("programme") }],
      });

      if (!programmeCall.response.ok) {
        return anthropicErrorResponse(programmeCall.response, programmeCall.json);
      }

      const programmeText = extractTextFromAnthropic(programmeCall.json);
      const programmeParsed = parseGeneratedAnnonces(programmeText, "programme");
      if (programmeParsed instanceof NextResponse) return programmeParsed;
      programmeAnnonces = programmeParsed;
    }

    const residenceLabel =
      nomResidence ||
      (typeof extractedData["nom de la résidence"] === "string"
        ? extractedData["nom de la résidence"]
        : "Programme neuf");
    const generationDescription = `Programme neuf — ${residenceLabel} — ${ville}`.replace(/\s+/g, " ").trim();

    const recordContent = JSON.stringify({
      programme: programmeAnnonces,
      lot: lotAnnonces,
    });

    await recordGenerationFromRequest(request, {
      type: "programme-neuf",
      description: generationDescription,
      prospectName: null,
      prospectId: null,
      content: recordContent,
    });

    const annonces = lotAnnonces ?? programmeAnnonces;

    let scoring = null;
    try {
      const scoringPrompt = `Tu es un expert en rédaction immobilière. Évalue ces annonces selon des critères réalistes et professionnels.

ANNONCES :
Leboncoin: ${annonces.leboncoin.titre} — ${annonces.leboncoin.corps.substring(0, 300)}
SeLoger: ${annonces.seloger.titre} — ${annonces.seloger.corps.substring(0, 300)}
Site: ${annonces.siteAgence.titre} — ${annonces.siteAgence.corps.substring(0, 300)}

ANGLE : ${angle}
PROFIL PROSPECT : ${prospectProfile || "Non précisé"}
ARGUMENTS PROMOTEUR À ÉVITER : ${JSON.stringify(extractedData.arguments_promoteur || []).substring(0, 200)}

Critères de scoring adaptés au contexte immobilier neuf /10 :
- Différenciation vs discours promoteur standard (3pts) : l'annonce dit-elle autre chose que la plaquette ?
- Cohérence avec le profil prospect et l'angle (3pts) : l'annonce parle-t-elle vraiment au prospect cible ?
- Ancrage factuel et données réelles (2pts) : présence de faits concrets, distances, données vérifiables
- Qualité rédactionnelle et accroche (2pts) : accroche mémorable, structure claire, zéro cliché

IMPORTANT : Note de manière juste et encourageante. Une annonce qui tient bien son angle prospect, utilise des données réelles de la plaquette et évite les clichés mérite un 7 ou 8. Réserve les notes basses (< 6) aux annonces vraiment génériques ou incohérentes avec le profil. Réserve le 9-10 aux annonces exceptionnellement différenciantes avec données officielles sourcées.

Retourne UNIQUEMENT ce JSON sans texte avant ou après, commence par { :
{"score":7,"verdict":"Une phrase courte de verdict","points_forts":["point 1","point 2","point 3"],"suggestions":["suggestion concrète 1","suggestion concrète 2","suggestion concrète 3"]}`;

      const scoringCall = await callAnthropicWithRetry(apiKey, {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: scoringPrompt }],
      });

      if (scoringCall.response.ok) {
        const scoringText = extractTextFromAnthropic(scoringCall.json);
        console.log("SCORING RAW FULL:", scoringText);
        if (scoringText && scoringText.trim().length > 0) {
          try {
            const parsed = parseJsonFromText(scoringText);
            if (parsed && typeof parsed === "object" && "score" in parsed) {
              scoring = parsed;
            } else {
              console.error("SCORING: JSON parsé mais structure invalide", parsed);
            }
          } catch (e) {
            console.error("SCORING PARSE ERROR:", e, "RAW:", scoringText?.substring(0, 200));
          }
        } else {
          console.error("SCORING: texte vide retourné par Haiku");
        }
      }
    } catch (e) {
      console.error("SCORING ERROR:", e);
      scoring = null;
    }

    return NextResponse.json({
      programme: programmeAnnonces,
      lot: lotAnnonces,
      scoring,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la generation des annonces programme neuf." },
      { status: 500 },
    );
  }
}
