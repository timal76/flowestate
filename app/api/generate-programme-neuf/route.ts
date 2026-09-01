import { NextResponse } from "next/server";

import { getLeHavreDataForPrompt } from "@/lib/data/le-havre";
import { checkGenerationLimit, getProgrammesNeufsBlockReason } from "@/lib/check-generation-limit";
import { generationLimitErrorResponse } from "@/lib/generation-limit-api";
import { recordGenerationFromRequest, resolveGenerationUserId } from "@/lib/record-generation";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

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

  const isRateLimit =
    first.response.status === 429 ||
    firstMessage.includes("rate limit") ||
    firstMessage.includes("tokens per minute");

  if (isRateLimit) {
    await new Promise((resolve) => setTimeout(resolve, 8000));
    return callOnce();
  }

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
  if (!input) return "";
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

function buildInterditsDynamiques(
  data: Record<string, unknown>,
  angle: string,
  prospectProfile: string,
): string {
  const interdits: string[] = [];
  const angleLC = (angle + " " + prospectProfile).toLowerCase();

  // RÈGLES UNIVERSELLES — s'appliquent à TOUT programme
  interdits.push(
    "Orientation (sud, nord, est, ouest, plein sud, façade sud) : INTERDITE sauf si explicitement écrite dans la plaquette ou le plan",
  );
  interdits.push(
    "Vue mer, vue dégagée, vue panoramique : INTERDITE sauf si explicitement garantie dans les documents",
  );
  interdits.push("Double exposition, traversant : INTERDIT sauf si confirmé dans les plans");
  interdits.push("Vis-à-vis (affirmer sans vis-à-vis) : INTERDIT sauf si confirmé");
  interdits.push(
    "Baignoire : INTERDITE sauf si le mot 'baignoire' est explicitement dans la plaquette ou le plan — par défaut écrire 'douche'",
  );
  interdits.push(
    "Hauteur sous plafond : n'invente JAMAIS une valeur — utilise uniquement la valeur présente dans les documents, sinon ne pas mentionner",
  );
  interdits.push(
    "Cuisine équipée (réfrigérateur, four, hotte, lave-vaisselle inclus) : INTERDIT sauf si explicitement listés comme inclus — écrire 'cuisine aménageable (équipements à confirmer avec le promoteur)'",
  );
  interdits.push("Ascenseur : INTERDIT sauf si mentionné dans les documents");
  interdits.push("Ventilation double flux : INTERDITE sauf si mentionnée dans les documents");
  interdits.push("Gardien, concierge, digicode : INTERDITS sauf si mentionnés dans les documents");
  interdits.push("Piscine, spa, salle de sport : INTERDITS sauf si mentionnés dans les documents");
  interdits.push("Charges de copropriété chiffrées : INTERDITES sauf si données par le promoteur");
  interdits.push(
    "Taux d'économie d'énergie chiffrés (divisé par X) : INTERDITS sans source officielle — écrire uniquement 'charges énergétiques maîtrisées grâce aux normes RE2020'",
  );
  interdits.push(
    "Havre de paix, coup de cœur, nichée, baignée de lumière, demeure d'exception : EXPRESSIONS INTERDITES",
  );
  interdits.push("Prix inventés ou estimés sans source : INTERDITS — utiliser uniquement les prix de la plaquette");
  interdits.push("Taux d'intérêt ou conditions de crédit : INTERDITS sans source officielle datée");
  interdits.push("Nombre de places de parking supérieur à ce qui est dans la plaquette : INTERDIT");
  interdits.push(
    "Surfaces arrondies : utiliser les surfaces exactes des documents — jamais 28m² si le plan dit 27,62m²",
  );
  interdits.push("Nom du promoteur (Sedelka, Nexity, etc.) : INTERDIT dans les annonces");
  interdits.push("Nom de la résidence commerciale : INTERDIT dans les annonces");
  interdits.push("Sources citées explicitement : INTERDITES — (source : X) ne doit jamais apparaître");
  interdits.push(
    "Années passées dans les données de marché (2024, 2025, l'année précédente) : INTERDITES — utiliser formulations intemporelles. Exception : années futures de projets (2027, 2028) autorisées",
  );
  interdits.push("Puces, tirets, listes, titres en majuscules : INTERDITS — prose uniquement");

  // RÈGLES CONDITIONNELLES — basées sur les données extraites
  if (!data.baignoire) {
    interdits.push(
      "Baignoire confirmée absente de ce programme — écrire uniquement 'douche à l'italienne' ou 'salle de bain avec douche'",
    );
  }
  if (!data.hauteur_plafond) {
    interdits.push("Hauteur sous plafond non confirmée dans ce programme — ne jamais inventer de valeur chiffrée");
  }
  if (!data.orientation) {
    interdits.push("Orientation non confirmée dans ce programme — ne jamais mentionner de point cardinal");
  }
  if (!data.vue) {
    interdits.push("Vue non confirmée dans ce programme — ne jamais mentionner de vue spécifique");
  }
  if (!data.cuisine_equipee) {
    interdits.push(
      "Cuisine équipée non confirmée dans ce programme — écrire 'cuisine aménageable (équipements à confirmer avec le promoteur)'",
    );
  }
  if (!data.ascenseur) {
    interdits.push("Ascenseur non confirmé dans ce programme — ne pas mentionner");
  }

  // RÈGLES ANGLE
  const isPinelInterdit =
    angleLC.includes("retrait") ||
    angleLC.includes("résidence secondaire") ||
    angleLC.includes("residence secondaire") ||
    angleLC.includes("pied-à-terre") ||
    angleLC.includes("pied a terre") ||
    angleLC.includes("senior");

  if (isPinelInterdit) {
    interdits.push("Loi Pinel, rendement locatif, investissement locatif : INTERDITS sur cet angle");
  }

  return interdits.map((i) => `- ${i}`).join("\n");
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
{"nom":null,"promoteur":null,"ville":null,"quartier":null,"adresse":null,"types_biens":null,"surface_min":null,"surface_max":null,"nb_lots":null,"prix_min":null,"prix_max":null,"tva_reduite":null,"taux_tva":null,"ptz":null,"lmnp":null,"pinel":null,"re2020":null,"livraison":null,"prestations":[],"domotique":null,"stationnement":null,"commerces_rdc":null,"transports":[],"commerces":[],"ecoles":[],"arguments_promoteur":[],"baignoire":null,"hauteur_plafond":null,"orientation":null,"vue":null,"cuisine_equipee":null,"double_exposition":null,"ascenseur":null,"digicode":null,"interphone":null,"gardien":null,"piscine":null,"terrasse_confirmee":null,"balcon_confirme":null}

RÈGLES ABSOLUES :
- Copie mot pour mot les informations présentes dans le document, sans reformuler
- Pour "livraison" : copie exactement ce qui est écrit (ex: "T1 2026", "premier trimestre 2026")
- Pour "prestations" : liste exhaustive de TOUT ce qui est mentionné dans le document
- Pour "domotique" : note exactement le nom du système et si il est offert ou non
- Pour "arguments_promoteur" : liste tous les angles marketing utilisés
- "baignoire" : null sauf si le mot "baignoire" est explicitement écrit dans le document
- "hauteur_plafond" : null sauf si une hauteur précise est indiquée dans le document
- "orientation" : null sauf si une orientation cardinale (sud, nord, est, ouest) est explicitement indiquée
- "vue" : null sauf si une vue est explicitement garantie dans le document
- "cuisine_equipee" : null sauf si les équipements sont listés comme inclus (pas optionnels)
- "ascenseur" : null sauf si explicitement mentionné
- "terrasse_confirmee" : copier exactement le terme utilisé (terrasse ou balcon)
- Si une information est absente : null
- Zéro invention, zéro interprétation, zéro extrapolation`;

const GENERATION_SYSTEM = `INSTRUCTION TECHNIQUE ABSOLUE : Ta réponse doit être un JSON valide et UNIQUEMENT un JSON. Elle commence par { et se termine par }. Aucun caractère avant le {. Aucun caractère après le }. Aucun backtick. Aucun \`\`\`json. Aucun commentaire. Aucun texte introductif. Uniquement {"leboncoin":{"titre":"...","corps":"..."},"seloger":{"titre":"...","corps":"..."},"siteAgence":{"titre":"...","corps":"..."}}

Tu es un rédacteur immobilier expert spécialisé dans la promotion immobilière neuve en France. Tu maîtrises les codes rédactionnels de chaque plateforme, le vocabulaire juridique et fiscal du neuf (VEFA, PTZ, TVA réduite, LMNP, Pinel, RE2020), et la psychologie des différents profils d'acquéreurs.

TA MISSION PRINCIPALE : Produire des annonces fondamentalement différentes de celles que les autres agences qui vendent ce même programme vont rédiger. Les autres vont reformuler la plaquette du promoteur. Toi tu construis une narration originale, ancrée dans la réalité du territoire, centrée sur le quotidien concret de l'acheteur selon son profil.

DIFFÉRENCIATION ACTIVE : Si des annonces concurrentes sont fournies, tu dois les analyser précisément et construire tes annonces en opposition directe. Même programme, même bien, angle radicalement différent. Ce n'est pas une suggestion : c'est l'objectif principal de la génération.

RÈGLES ABSOLUES — ZÉRO EXCEPTION :

⚠️ RÈGLES CRITIQUES — VIOLATION = ANNONCE INUTILISABLE :

1. DATE DE LIVRAISON : La date de livraison du programme est celle de la PLAQUETTE uniquement. Le tramway ligne C est prévu pour 2027 — ce n'est PAS la date de livraison du programme. Ne jamais confondre. Si extractedData.livraison contient "T1 2026" ou "2026", écrire exactement cette valeur. INTERDIT d'écrire "Livraison 2027" pour un programme dont la plaquette indique T1 2026.

2. NOMBRE DE CHAMBRES : Utiliser UNIQUEMENT le nombre de chambres du plan architectural fourni. Le plan B204 indique EXPLICITEMENT 2 chambres (9,60m² et 13,18m²). Jamais 3 chambres pour ce lot. Si le plan indique 2 chambres, écrire 2 chambres partout, dans le titre, le corps, et les descriptions.

3. MARKDOWN : Ne jamais utiliser # pour les titres dans les annonces. Les sous-titres doivent être en texte normal, en majuscules ou en gras via la convention de la plateforme, jamais avec des dièses #.

RÈGLES RÉDACTIONNELLES ABSOLUES — ANNONCES PROFESSIONNELLES :

- PROMOTEUR : Ne jamais mentionner le nom du promoteur (Sedelka, Nexity, Bouygues, Kaufman, etc.) dans les annonces. L'agent l'ajoutera lui-même si nécessaire.
- NOM DE LA RÉSIDENCE : Ne jamais mentionner le nom commercial de la résidence (Havre en Scène, Patio Villiers, etc.) dans les annonces, sur TOUTES les plateformes sans exception, y compris siteAgence. L'agent l'ajoutera lui-même si nécessaire.
- SOURCES CITÉES : Ne jamais écrire "(source : X)", "(source X)", "source :" ou toute attribution dans le texte d'une annonce. Les données sont utilisées comme connaissance de fond, jamais citées.
- ANNÉES PASSÉES : Ne jamais mentionner d'années passées ou actuelles liées aux données de marché (pas de "2024", "décembre 2024", "janvier 2026", "l'année précédente", "cette année"). Exception : les années futures de projets urbains (tramway 2027, école 2028) sont AUTORISÉES car elles représentent une valorisation future.
- PUCES ET LISTES : Ne jamais utiliser de puces (•, -, *, ✓, ✗, →) dans le corps des annonces. Rédiger en prose uniquement.
- TITRES EN MAJUSCULES : Ne jamais créer de sections en majuscules (LOCALISATION :, FISCALITÉ :, etc.). Le texte doit être continu et fluide.

DONNÉES TECHNIQUES :
- RE2020 (pas RT2020, pas BBC, pas HQE) : utiliser exactement le terme présent dans la plaquette
- Nombre de trains/transports : utiliser UNIQUEMENT le chiffre présent dans la plaquette ou les données web sourcées. Ne jamais inventer ni arrondir.
- Surfaces : utiliser les chiffres exacts des documents. Jamais d'arrondi non justifié.
- Étage : R+2 = 2ème étage. R+1 = 1er étage. Jamais "3ème étage" pour un R+2.
- Hauteur sous plafond : utiliser la valeur exacte du plan. Ne jamais écrire 2,10m si le plan dit 2,70m.
- Date de livraison : copier mot pour mot depuis la plaquette. Jamais de placeholder.

COHÉRENCE ANGLE/PROFIL :
- L'angle défini par l'agent est EXCLUSIF du début à la fin de TOUTES les annonces
- ANGLE RETRAITE/RÉSIDENCE SECONDAIRE : INTERDIRE toute mention de Pinel, rendement locatif, investissement, LMNP, vacance locative
- ANGLE INVESTISSEUR : INTERDIRE toute mention de lifestyle, émotionnel, week-end, refuge
- ANGLE FAMILLE/PRIMO : INTERDIRE toute mention de rendement, Pinel investisseur
- Ne jamais mélanger les angles dans une même annonce

ZÉRO INVENTION — RÈGLE FONDAMENTALE ABSOLUE :

Chaque information dans l'annonce doit être traçable vers un document source fourni (plaquette, plan, annexe) ou une donnée web avec source officielle explicite dans les données fournies.

INTERDIT SANS SOURCE DANS LES DOCUMENTS FOURNIS :
- Temps de trajet chiffrés (ex: "15 minutes pour Châtelet") — sauf si présent dans les données web fournies avec source
- Délais de vente du marché (ex: "38 jours", "délais courts") — TOUJOURS INTERDIT même avec source
- Rendements locatifs chiffrés (ex: "4% de rendement", "surloyer de 8 à 12%") — TOUJOURS INTERDIT
- Prix au m² chiffrés du marché local — TOUJOURS INTERDIT
- Taux de vacance locative chiffrés — TOUJOURS INTERDIT
- Affirmations de tendance marché ET garanties patrimoniales ("les prix progressent régulièrement", "demande supérieure à l'offre", "les biens ne se déprécient pas", "sans risque", "valorise naturellement", "valorisation assurée", "valorisation préservée", "récompense la patience", "se sont valorisés", "aucun risque de dépréciation", "stabilité patrimoniale solide", "incontournable de la capitale") — TOUJOURS INTERDIT sans exception, remplacer UNIQUEMENT par "secteur établi", "quartier reconnu" ou "localisation recherchée" — jamais de promesse de valorisation
- Événements ou visites non mentionnés par l'agent ("visite gratuite ce samedi") — TOUJOURS INTERDIT
- Vues depuis le logement ("vue sur la rue", "vue dégagée") — INTERDIT sauf si confirmé dans les plans
- Toute caractéristique non présente dans la plaquette, les plans ou les données fournies
- Surfaces par type de bien (ex: "studios 22-35 m²", "2 pièces 45-70 m²") : INTERDIT sauf si les surfaces exactes sont dans la plaquette — utiliser uniquement surface_min et surface_max globales du programme ou ne pas mentionner de surface
- Fourchettes de surfaces inventées : INTERDIT — si surface_min et surface_max sont null, ne jamais écrire de surface chiffrée

FORMULATIONS DE REMPLACEMENT OBLIGATOIRES :
- À la place de "délais de vente courts" → "quartier établi et recherché"
- À la place de "rendement X%" → "potentiel locatif à confirmer avec votre conseiller"
- À la place de "prix au m² X€" → "secteur premium parisien" ou "quartier reconnu"
- À la place de "demande supérieure à l'offre" → "quartier structurellement demandé"
- À la place de temps de trajet inventés → "accès direct ligne 2 et 3 station Villiers"

En cas de doute sur une information : NE PAS L'ÉCRIRE. Une annonce courte et exacte vaut mieux qu'une annonce longue avec une seule invention.

MENTIONS LÉGALES OBLIGATOIRES :
- TVA réduite : toujours "selon conditions de ressources, en résidence principale pendant au minimum 10 ans"
- Pinel : toujours "sous conditions en vigueur — à vérifier avec votre conseiller fiscal"
- PTZ : toujours "réservé aux primo-accédants selon conditions de ressources"
- Prix : toujours "à partir de X€" si fourchette, jamais de prix inventé

DONNÉES WEB :
- Utiliser UNIQUEMENT les données accompagnées d'une source dans les données web
- Chiffres de marché sans source officielle : INTERDITS
- "Constat de marché observé" sans chiffre sourcé : INTERDIT
- Taux d'intérêt et conjoncture financière : INTERDITS

- PINEL HORS ANGLE INVESTISSEUR : si l'angle ou le profil prospect contient "retraite", "résidence secondaire", "pied-à-terre", "senior", "bord de mer", ne jamais mentionner le dispositif Pinel ni le rendement locatif. Ces mentions sont INTERDITES sur ces angles.
- TRAIN PARIS-LE HAVRE : la liaison Paris Saint-Lazare - Le Havre est un Intercités ou TER Normandie. Ne jamais écrire "TGV" pour cette liaison. Écrire "train direct" ou "Intercités".
- TARIFS TRANSPORT : ne jamais indiquer de prix de billets de train sans source officielle SNCF confirmée. Écrire "tarifs variables selon disponibilités — voir sncf-connect.com" si nécessaire.
- RE2020 ÉCONOMIES : ne jamais écrire "factures divisées par X" sans source officielle. Écrire uniquement "charges énergétiques maîtrisées grâce aux normes RE2020" ou "performance énergétique optimisée RE2020".
- VIS-À-VIS : ne jamais affirmer "sans vis-à-vis" ou "vue dégagée" sauf si explicitement confirmé dans les plans ou documents fournis.
- "HAVRE DE PAIX" : cette expression reste INTERDITE sous toutes ses formes. "Votre havre normand" ou "refuge normand" sont acceptés car ils font référence à la ville.

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

ANNONCE INSTAGRAM :
- Titre : accroche visuelle ultra-courte, max 10 mots, sans hashtags dans le titre
- Corps : 150-220 mots, ton lifestyle et émotionnel, projette le lecteur dans une vie idéale
- Structure : accroche forte (1 phrase choc) → bénéfice principal en 2-3 phrases → call to action court
- Terminer par 8-10 hashtags pertinents : #immobilierneuf #programmeneuf #investissement #realestate + hashtags ville/quartier
- Pas de données chiffrées complexes, pas de fiscal, uniquement lifestyle et émotion
- Format : court, aéré, facile à lire sur mobile

ANNONCE LINKEDIN :
- Titre : accroche professionnelle avec données chiffrées, 100 caractères max
- Corps : 300-400 mots, ton expert et factuel, arguments patrimoniaux et investissement
- Structure : accroche avec chiffre clé → contexte marché → argument principal → données rendement/valorisation → call to action professionnel
- Peut mentionner fiscalité, rendement, valorisation patrimoniale
- Terminer par 3-5 hashtags professionnels : #immobilier #investissement #programmeneuf #patrimoine
- Ton : expert, chiffré, sans émotionnel

ANNONCE FACEBOOK :
- Titre : accroche narrative, 80 caractères max
- Corps : 200-300 mots, ton conversationnel et accessible, mix lifestyle et pratique
- Structure : histoire courte → présentation programme → avantages concrets → prix → call to action
- Équilibre entre émotionnel et pratique selon le profil prospect
- 5-7 hashtags accessibles

CHECKLIST ANTI-VIOLATION — À APPLIQUER SUR CHAQUE ANNONCE AVANT DE RETOURNER LE JSON :
□ Zéro puce ou tiret en début de ligne
□ Zéro titre en majuscules
□ Zéro nom de promoteur
□ Zéro nom de résidence commerciale — même partiellement, même en abrégé
□ Zéro "(source : X)"
□ Zéro année passée (2024, 2025)
□ Texte en prose continue uniquement
□ Zéro chiffre de rendement inventé (surloyer %, rendement %, économies d'énergie %) sans source officielle fournie dans les données
□ Zéro affirmation de marché sans source (ex: "les biens ne se déprécient pas", "demande supérieure à l'offre") — utiliser des formulations prudentes ("secteur reconnu", "quartier établi")
□ Leboncoin : corps 1200 caractères MAX — couper si dépassement
□ SeLoger : corps 2500 caractères MAX — couper si dépassement
□ Site agence : corps 3500 caractères MAX — couper si dépassement
□ Instagram : corps 150-220 mots, 8-10 hashtags
□ LinkedIn : corps 300-400 mots, 3-5 hashtags
□ Facebook : corps 200-300 mots, 5-7 hashtags

FORMAT DE SORTIE OBLIGATOIRE : Tu dois retourner UNIQUEMENT un objet JSON valide, sans aucun texte avant ou après, sans backticks, sans markdown, sans commentaire. Commence directement par { et termine par }. Structure exacte :
{
  "leboncoin": { "titre": "...", "corps": "..." },
  "seloger": { "titre": "...", "corps": "..." },
  "siteAgence": { "titre": "...", "corps": "..." }
}

DERNIER RAPPEL ABSOLU : Ta réponse doit commencer par { et se terminer par }. Aucun caractère avant ou après. Aucun backtick. Aucun commentaire. Uniquement le JSON brut.`;

type GenerateProgrammeNeufPayload = {
  pdfBase64?: string;
  extractedProgramData?: Record<string, unknown>;
  lotReference?: string;
  address?: string;
  annexes?: Array<{ data: string; mediaType: string; name: string }>;
  lotAnnexes?: Array<{ data: string; mediaType: string; name: string }>;
  generateLotOnly?: boolean;
  angle?: string;
  prospectProfile?: string;
  competitorAds?: string;
  tone?: string;
  priceFrom?: string;
  additionalInfo?: string;
  platforms?: string[];
};

type AnnonceBlock = { titre: string; corps: string };

type GeneratedAnnonces = {
  leboncoin?: AnnonceBlock;
  seloger?: AnnonceBlock;
  siteAgence?: AnnonceBlock;
  instagram?: AnnonceBlock;
  linkedin?: AnnonceBlock;
  facebook?: AnnonceBlock;
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
      const programmesNeufsBlockReason = await getProgrammesNeufsBlockReason(effectiveUserId);
      if (programmesNeufsBlockReason) {
        return NextResponse.json({ error: programmesNeufsBlockReason }, { status: 403 });
      }

      const limitResult = await checkGenerationLimit(effectiveUserId);
      if (!limitResult.allowed) {
        return generationLimitErrorResponse(limitResult);
      }
    }

    const body = (await request.json()) as GenerateProgrammeNeufPayload;

    // Si extractedProgramData est fourni, on saute l'extraction PDF
    let extractedData: Record<string, unknown> = {};
    let skipPdfExtraction = false;

    if (body.extractedProgramData && Object.keys(body.extractedProgramData).length > 0) {
      extractedData = body.extractedProgramData;
      skipPdfExtraction = true;
    } else if (!body.pdfBase64?.trim?.() && !body.extractedProgramData) {
      return NextResponse.json({ error: "Le PDF est requis." }, { status: 400 });
    }

    if (!body.angle?.trim()) {
      return NextResponse.json({ error: "L'angle souhaité est requis." }, { status: 400 });
    }

    const angle = body.angle.trim();
    const prospectProfile = body.prospectProfile?.trim() || "";
    const competitorAds = body.competitorAds?.trim() || "";
    const tone = body.tone?.trim() || "Professionnel";
    const priceFrom = body.priceFrom?.trim() || "";
    const additionalInfo = body.additionalInfo?.trim() || "";
    const address = body.address?.trim() || "";

    const platforms =
      Array.isArray(body.platforms) && body.platforms.length > 0
        ? body.platforms
        : ["leboncoin", "seloger", "siteAgence"];

    const wantsLeboncoin = platforms.includes("leboncoin");
    const wantsSeloger = platforms.includes("seloger");
    const wantsSiteAgence = platforms.includes("siteAgence");
    const wantsInstagram = platforms.includes("instagram");
    const wantsLinkedin = platforms.includes("linkedin");
    const wantsFacebook = platforms.includes("facebook");

    const wantsPortails = wantsLeboncoin || wantsSeloger || wantsSiteAgence;
    const wantsReseaux = wantsInstagram || wantsLinkedin || wantsFacebook;

    if (!skipPdfExtraction) {
      if (!body.pdfBase64) {
        return NextResponse.json({ error: "Le PDF est requis." }, { status: 400 });
      }
      const pdfData = cleanPdfBase64(body.pdfBase64);
      if (!pdfData || pdfData.length < 10) {
        return NextResponse.json({ error: "Le PDF invalide." }, { status: 400 });
      }
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
                text: "Sois ultra concis. Retourne uniquement le JSON avec les champs non-null. Maximum 500 tokens.\n\nAnalyse cette plaquette promoteur et extrais toutes les informations demandées.",
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

      try {
        extractedData = parseJsonFromText(extractionText) as Record<string, unknown>;
      } catch (e) {
        console.error("PARSE ERROR:", e, "RAW:", extractionText?.substring(0, 200));
        extractedData = {
          nom: null,
          ville: body.address?.split(",").pop()?.trim() || "Paris",
          quartier: null,
          promoteur: null,
          types_biens: null,
          arguments_promoteur: [],
        };
      }
    }

    const ville =
      (typeof extractedData.ville === "string" && extractedData.ville) ||
      (typeof extractedData.quartier === "string" && extractedData.quartier) ||
      "la ville du programme";
    const quartier =
      typeof extractedData.quartier === "string" && extractedData.quartier
        ? extractedData.quartier
        : "";

    const isLeHavre =
      ville.toLowerCase().includes("havre") ||
      (address?.toLowerCase().includes("havre") ?? false) ||
      (address?.toLowerCase().includes("76600") ?? false);

    const isParis =
      ville.toLowerCase().includes("paris") ||
      address?.toLowerCase().includes("paris") ||
      address?.toLowerCase().includes("75") ||
      ville.toLowerCase().includes("île-de-france") ||
      ville.toLowerCase().includes("ile-de-france") ||
      ville.toLowerCase().includes("boulogne") ||
      ville.toLowerCase().includes("neuilly") ||
      ville.toLowerCase().includes("vincennes") ||
      ville.toLowerCase().includes("saint-denis") ||
      ville.toLowerCase().includes("levallois") ||
      ville.toLowerCase().includes("issy") ||
      ville.toLowerCase().includes("courbevoie") ||
      ville.toLowerCase().includes("nanterre");

    const hardcodedData = isLeHavre ? getLeHavreDataForPrompt(quartier, prospectProfile) : null;

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

    let webData: unknown = null;
    if (!isLeHavre) {
      const location = `${ville}${quartier ? `, ${quartier}` : ""}${address ? `, ${address}` : ""}`;

      const parisSearchPrompt = isParis
        ? `Tu es un expert immobilier parisien. Effectue des recherches ciblées pour enrichir une annonce programme neuf.

LOCALISATION : ${location}
ANGLE : ${angle}
PROFIL : ${prospectProfile}

Recherche ces informations SANS mentionner d'années dans tes résultats :
1. Prix médian appartements neuf dans ce quartier/arrondissement
2. Transports : lignes de métro/RER/tramway à proximité, fréquences
3. Projets urbains officiels en cours dans ce secteur
4. Services médicaux, commerces, écoles de qualité à proximité
5. Atouts lifestyle du quartier (parcs, gastronomie, culture)

RÈGLES :
- Données vérifiables uniquement
- Pas de prix au m² chiffrés — utiliser des formulations relatives ("secteur accessible", "quartier premium")
- Pas d'années dans les données
- Pas de sources citées

Retourne un JSON sans markdown avec les données utiles pour rédiger une annonce.`
        : webSearchPrompt;

      const webSearchCall = await callAnthropicWithRetry(apiKey, {
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 1 }],
        messages: [{ role: "user", content: parisSearchPrompt }],
      });

      if (!webSearchCall.response.ok) {
        return anthropicErrorResponse(webSearchCall.response, webSearchCall.json);
      }

      const webSearchText = extractTextFromAnthropic(webSearchCall.json);
      webData = webSearchText;
      if (webSearchText) {
        try {
          webData = parseJsonFromText(webSearchText);
        } catch {
          webData = webSearchText;
        }
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

    const buildGenerationUserPrompt = (
      mode: "programme" | "lot" | "programme-court" | "programme-site" | "lot-court" | "lot-site",
      requestedPlatforms?: string[],
    ) => {
      const isProgramme =
        mode === "programme" || mode === "programme-court" || mode === "programme-site";
      const isLot = mode === "lot" || mode === "lot-court" || mode === "lot-site";
      const isCourt = mode === "programme-court" || mode === "lot-court";
      const isSiteOnly = mode === "programme-site" || mode === "lot-site";

      const modeInstruction = isProgramme
        ? `MODE : Annonce programme global. Tu décris l'ensemble de la résidence (tous les types de lots, fourchette de surfaces et prix, prestations communes). Ne pas mentionner un lot spécifique. L'objectif est d'attirer un maximum de profils différents vers le programme.`
        : `MODE : Annonce lot spécifique. Tu décris uniquement ce lot précis avec toutes ses caractéristiques détaillées (surfaces exactes, orientation, étage, balcon, agencement). C'est une annonce de vente directe pour ce lot.`;

      const programmeStrictRule = isProgramme
        ? `RÈGLE ABSOLUE PROGRAMME GLOBAL : Tu disposes uniquement des données extraites de la plaquette promoteur. N'invente aucune information non présente dans ces données. Si une information n'est pas dans la plaquette (surface min/max, date de livraison, équipements, dispositifs fiscaux), utilise exactement ce qui est écrit dans la plaquette ou ne le mentionne pas. Zéro extrapolation.`
        : "";

      const addressBlock = isLot && address ? `ADRESSE EXACTE DU PROGRAMME : ${address}` : "";
      const annexesBlock =
        isLot && annexesDescription
          ? `ANALYSE DES DOCUMENTS ANNEXES (plans, vues 3D) :\n${annexesDescription}`
          : "";

      const allPlatforms =
        requestedPlatforms && requestedPlatforms.length > 0
          ? requestedPlatforms
          : ["leboncoin", "seloger", "siteAgence"];

      const platformInstructions = allPlatforms
        .map((p) => {
          if (p === "leboncoin") return "leboncoin";
          if (p === "seloger") return "seloger";
          if (p === "siteAgence") return "siteAgence";
          if (p === "instagram") return "instagram";
          if (p === "linkedin") return "linkedin";
          if (p === "facebook") return "facebook";
          return p;
        })
        .join(", ");

      const formatJson = `{${allPlatforms.map((p) => `"${p}":{"titre":"...","corps":"..."}`).join(",")}}`;

      const introLine = `Génère les annonces pour ces plateformes : ${platformInstructions}.`;

      const titleRulesBlock = isCourt
        ? `RÈGLES OBLIGATOIRES POUR LES TITRES :
${allPlatforms.includes("leboncoin") ? "- Leboncoin (60 car max) : DOIT contenir surface OU prix OU trajet train." : ""}
${allPlatforms.includes("seloger") ? "- SeLoger (100 car max) : DOIT contenir ville + type + caractéristique chiffrée." : ""}
${allPlatforms.includes("instagram") ? "- Instagram : accroche lifestyle max 10 mots, corps 150-220 mots, 8-10 hashtags en fin." : ""}
${allPlatforms.includes("linkedin") ? "- LinkedIn : accroche chiffrée 100 car max, corps 300-400 mots expert, 3-5 hashtags pro." : ""}
${allPlatforms.includes("facebook") ? "- Facebook : accroche narrative 80 car max, corps 200-300 mots conversationnel, 5-7 hashtags." : ""}`
        : isSiteOnly
          ? `RÈGLES OBLIGATOIRES POUR LES TITRES :
- Site agence : titre libre mais DOIT contenir une affirmation forte avec chiffre. Ex: "Votre refuge normand à 2h05 de Paris — 15% sous le prix du centre UNESCO"`
          : `RÈGLES OBLIGATOIRES POUR LES TITRES :
- Leboncoin (60 car max) : DOIT contenir surface OU prix OU trajet train. Ex: "2h05 Paris • T3 64m² neuf • Livraison T1 2026"
- SeLoger (100 car max) : DOIT contenir ville + type + caractéristique chiffrée. Ex: "Le Havre Arcole Brindeau — T3 neuf 64m² + balcon 28m² — 2 400€/m² secteur — Livraison T1 2026"
- Site agence : titre libre mais DOIT contenir une affirmation forte avec chiffre. Ex: "Votre refuge normand à 2h05 de Paris — 15% sous le prix du centre UNESCO"`;

      return `
${introLine}

${modeInstruction}
${programmeStrictRule ? `\n${programmeStrictRule}\n` : ""}
DONNÉES EXTRAITES DE LA PLAQUETTE (JSON) :
${JSON.stringify(essentialExtractedData)}

${hardcodedData ? `DONNÉES LOCALES OFFICIELLES VÉRIFIÉES (Le Havre) :
${hardcodedData}

IMPORTANT : Ces données sont utilisées comme connaissance de fond uniquement. Ne jamais citer les sources, ne jamais mentionner d'années liées aux données de marché dans les annonces. Utiliser des formulations intemporelles : "prix médian du secteur", "loyer de marché", "demande structurelle".` : `DONNÉES WEB LOCALES :
${typeof webData === "string" ? webData : JSON.stringify(webData, null, 2)}`}

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

LISTE NOIRE DYNAMIQUE — INFORMATIONS INTERDITES POUR CE PROGRAMME :
Ces informations ne sont PAS confirmées dans les documents fournis et ne doivent JAMAIS apparaître :
${buildInterditsDynamiques(extractedData, angle, prospectProfile)}

Ces interdictions sont absolues et priment sur toute autre instruction.

${titleRulesBlock}

RÈGLE ABSOLUE ACCROCHE :
Le premier mot du corps de chaque annonce NE PEUT PAS être : "Découvrez", "Bienvenue", le nom de la résidence, "Ce", "Cet", "Cette".
L'accroche doit projeter le lecteur dans une situation concrète de sa vie future.

Consignes finales :
- Adapter chaque annonce au profil acquéreur et à l'angle demandé
- Ne pas reprendre les formulations marketing du promoteur listées dans les arguments promoteur
- Respecter strictement les limites de caractères par plateforme
- Retourner uniquement le JSON demandé

FORMAT OBLIGATOIRE DE SORTIE :

Avant de retourner le JSON, vérifie CHAQUE annonce :
1. Aucune puce (•, -, *, ✓, ✗, →) nulle part
2. Aucun titre en majuscules (LOCALISATION :, PRESTATIONS :, etc.)
3. Aucun nom de promoteur (Sedelka, Nexity, etc.)
4. Aucun nom de résidence commerciale (Havre en Scène, etc.)
5. Aucune source citée (source : X)
6. Aucune année passée (2024, 2025) — seules les années futures de projets (2027, 2028) sont autorisées
7. Texte en prose continue uniquement

Si tu trouves une violation, corrige-la avant de retourner le JSON.

RAPPEL FINAL : ${formatJson}
`.trim();
    };

    function parseGeneratedAnnonces(
      generationText: string,
      label: string,
    ): GeneratedAnnonces | NextResponse {
      if (!generationText) {
        return NextResponse.json(
          { error: `Aucune annonce ${label} n'a ete generee par Anthropic.` },
          { status: 502 },
        );
      }

      const textWithBrace = "{" + generationText.trim();

      let annonces: GeneratedAnnonces;
      try {
        annonces = parseJsonFromText(textWithBrace) as GeneratedAnnonces;
      } catch {
        // Tentative de récupération : extraire manuellement les champs
        console.error(`GENERATION PARSE ERROR ${label}:`, textWithBrace?.substring(0, 500));

        try {
          // Cherche les titres et corps individuellement
          const leboncoinTitre =
            textWithBrace.match(/"leboncoin"\s*:\s*\{\s*"titre"\s*:\s*"([^"]+)"/)?.[1] ||
            "Annonce programme neuf";
          const leboncoinCorps =
            textWithBrace
              .match(/"leboncoin"[\s\S]*?"corps"\s*:\s*"([\s\S]*?)"\s*\}/)?.[1]
              ?.replace(/\\n/g, "\n") || textWithBrace.substring(0, 500);
          const selogerTitre =
            textWithBrace.match(/"seloger"\s*:\s*\{\s*"titre"\s*:\s*"([^"]+)"/)?.[1] ||
            "Programme neuf Le Havre";
          const selogerCorps =
            textWithBrace
              .match(/"seloger"[\s\S]*?"corps"\s*:\s*"([\s\S]*?)"\s*\}/)?.[1]
              ?.replace(/\\n/g, "\n") || textWithBrace.substring(0, 800);
          const siteAgenceTitre =
            textWithBrace.match(/"siteAgence"\s*:\s*\{\s*"titre"\s*:\s*"([^"]+)"/)?.[1] ||
            "Découvrez ce programme neuf";
          const siteAgenceCorps =
            textWithBrace
              .match(/"siteAgence"[\s\S]*?"corps"\s*:\s*"([\s\S]*?)"\s*\}[\s\S]*?\}/)?.[1]
              ?.replace(/\\n/g, "\n") || textWithBrace.substring(0, 1200);

          annonces = {
            leboncoin: { titre: leboncoinTitre, corps: leboncoinCorps },
            seloger: { titre: selogerTitre, corps: selogerCorps },
            siteAgence: { titre: siteAgenceTitre, corps: siteAgenceCorps },
          };
        } catch {
          return NextResponse.json(
            { error: `Format de generation ${label} invalide. Veuillez reessayer.` },
            { status: 502 },
          );
        }
      }

      const platformKeys = [
        "leboncoin",
        "seloger",
        "siteAgence",
        "instagram",
        "linkedin",
        "facebook",
      ] as const;
      const hasAtLeastOne = platformKeys.some((k) => annonces[k]?.titre);
      if (!hasAtLeastOne) {
        return NextResponse.json(
          { error: `Format de generation ${label} invalide. Veuillez reessayer.` },
          { status: 502 },
        );
      }

      return annonces;
    }

    const buildFormatReminder = (platformList: string[]) =>
      `{${platformList.map((p) => `"${p}":{"titre":"...","corps":"..."}`).join(",")}}`;

    const generateSplitAnnonces = async (
      baseMode: "programme" | "lot",
    ): Promise<GeneratedAnnonces | NextResponse> => {
      const courtMode = baseMode === "programme" ? "programme-court" : "lot-court";
      const siteMode = baseMode === "programme" ? "programme-site" : "lot-site";

      const portailPlatforms = platforms.filter((p) => ["leboncoin", "seloger"].includes(p));
      const reseauxPlatforms = platforms.filter((p) =>
        ["instagram", "linkedin", "facebook"].includes(p),
      );
      const haikuPlatforms = [...portailPlatforms, ...reseauxPlatforms];
      const onlySiteAgence = wantsSiteAgence && haikuPlatforms.length === 0;
      const noSiteAgence = !wantsSiteAgence;

      if (onlySiteAgence) {
        const siteFormat = buildFormatReminder(["siteAgence"]);
        const siteCall = await callAnthropicWithRetry(apiKey, {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          system: GENERATION_SYSTEM + `\n\nRAPPEL : Retourne UNIQUEMENT ${siteFormat}`,
          messages: [
            {
              role: "user",
              content:
                buildGenerationUserPrompt(siteMode, ["siteAgence"]) +
                `\n\nGénère UNIQUEMENT siteAgence. Format: ${siteFormat}`,
            },
            { role: "assistant", content: "{" },
          ],
        });

        if (!siteCall.response.ok) {
          return anthropicErrorResponse(siteCall.response, siteCall.json);
        }

        const siteText = extractTextFromAnthropic(siteCall.json);
        return parseGeneratedAnnonces(siteText, `${baseMode}-site`);
      }

      if (noSiteAgence) {
        const haikuFormat = buildFormatReminder(haikuPlatforms);
        const shortCall = await callAnthropicWithRetry(apiKey, {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          system: GENERATION_SYSTEM + `\n\nRAPPEL : Retourne UNIQUEMENT ${haikuFormat}`,
          messages: [
            {
              role: "user",
              content:
                buildGenerationUserPrompt(courtMode, haikuPlatforms) +
                `\n\nFormat: ${haikuFormat}`,
            },
            { role: "assistant", content: "{" },
          ],
        });

        if (!shortCall.response.ok) {
          return anthropicErrorResponse(shortCall.response, shortCall.json);
        }

        const shortText = extractTextFromAnthropic(shortCall.json);
        return parseGeneratedAnnonces(shortText, `${baseMode}-court`);
      }

      const portailsToGenerate = platforms.filter((p) => ["leboncoin", "seloger"].includes(p));
      const reseauxToGenerate = platforms.filter((p) =>
        ["instagram", "linkedin", "facebook"].includes(p),
      );

      const results: GeneratedAnnonces = {};

      if (portailsToGenerate.length > 0) {
        const portailFormat = buildFormatReminder(portailsToGenerate);
        const portailCall = await callAnthropicWithRetry(apiKey, {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          system: GENERATION_SYSTEM + `\n\nRAPPEL : Retourne UNIQUEMENT ${portailFormat}`,
          messages: [
            {
              role: "user",
              content:
                buildGenerationUserPrompt(courtMode, portailsToGenerate) +
                `\n\nFormat: ${portailFormat}`,
            },
            { role: "assistant", content: "{" },
          ],
        });
        if (portailCall.response.ok) {
          const parsed = parseGeneratedAnnonces(
            extractTextFromAnthropic(portailCall.json),
            `${baseMode}-portails`,
          );
          if (!(parsed instanceof NextResponse)) Object.assign(results, parsed);
        }
      }

      if (reseauxToGenerate.length > 0) {
        const reseauxFormat = buildFormatReminder(reseauxToGenerate);
        const reseauxCall = await callAnthropicWithRetry(apiKey, {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          system: GENERATION_SYSTEM + `\n\nRAPPEL : Retourne UNIQUEMENT ${reseauxFormat}`,
          messages: [
            {
              role: "user",
              content:
                buildGenerationUserPrompt(courtMode, reseauxToGenerate) +
                `\n\nFormat: ${reseauxFormat}`,
            },
            { role: "assistant", content: "{" },
          ],
        });
        if (reseauxCall.response.ok) {
          const parsed = parseGeneratedAnnonces(
            extractTextFromAnthropic(reseauxCall.json),
            `${baseMode}-reseaux`,
          );
          if (!(parsed instanceof NextResponse)) Object.assign(results, parsed);
        }
      }

      if (wantsSiteAgence) {
        const siteFormat = buildFormatReminder(["siteAgence"]);
        const siteCall = await callAnthropicWithRetry(apiKey, {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          system: GENERATION_SYSTEM + `\n\nRAPPEL : Retourne UNIQUEMENT ${siteFormat}`,
          messages: [
            {
              role: "user",
              content:
                buildGenerationUserPrompt(siteMode, ["siteAgence"]) +
                `\n\nGénère UNIQUEMENT siteAgence. Format: ${siteFormat}`,
            },
            { role: "assistant", content: "{" },
          ],
        });
        if (siteCall.response.ok) {
          const parsed = parseGeneratedAnnonces(
            extractTextFromAnthropic(siteCall.json),
            `${baseMode}-site`,
          );
          if (!(parsed instanceof NextResponse)) Object.assign(results, parsed);
        }
      }

      return results;
    };

    const hasAnnexes = annexes.length > 0;
    const lotAnnexes = body.lotAnnexes ?? [];
    const generateLotOnly = body.generateLotOnly ?? false;

    let programmeAnnonces: GeneratedAnnonces;
    let lotAnnonces: GeneratedAnnonces | null = null;

    if (generateLotOnly && lotAnnexes.length > 0) {
      const lotAnnexeContents = lotAnnexes.map((file) => {
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

      const lotAnalysisCall = await callAnthropicWithRetry(apiKey, {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system:
          "Tu es un expert en immobilier neuf. Analyse ce plan de lot et extrais : surface totale, surface de chaque pièce, étage, orientation si visible, présence balcon/terrasse et sa surface, type de logement (T1/T2/T3/T4), numéro de lot si visible, particularités. Retourne un texte structuré factuel.",
        messages: [
          {
            role: "user",
            content: [
              ...lotAnnexeContents,
              {
                type: "text",
                text: "Analyse ce plan de lot et extrais toutes les informations chiffrées et factuelles.",
              },
            ],
          },
        ],
      });

      let lotDescription = "";
      if (lotAnalysisCall.response.ok) {
        lotDescription = extractTextFromAnthropic(lotAnalysisCall.json);
      }

      const lotEnrichedData = {
        ...extractedData,
        lot_description: lotDescription,
        lot_reference: body.lotReference || "",
      };
      extractedData = lotEnrichedData;

      programmeAnnonces = {} as GeneratedAnnonces;
      const lotResult = await generateSplitAnnonces("lot");
      if (lotResult instanceof NextResponse) return lotResult;
      lotAnnonces = lotResult;
    } else {
      const programmeResult = await generateSplitAnnonces("programme");
      if (programmeResult instanceof NextResponse) return programmeResult;
      programmeAnnonces = programmeResult;
    }

    const residenceLabel =
      nomResidence ||
      (typeof extractedData["nom de la résidence"] === "string"
        ? extractedData["nom de la résidence"]
        : "Programme neuf");
    const generationDescription = `Programme neuf — ${residenceLabel} — ${ville}`.replace(/\s+/g, " ").trim();

    let annonces = lotAnnonces ?? programmeAnnonces;

    console.log("[programme-neuf] attempting to record generation for userId:", effectiveUserId);

    const recordContent = JSON.stringify({
      leboncoin: annonces.leboncoin,
      seloger: annonces.seloger,
      siteAgence: annonces.siteAgence,
    });

    console.log("[programme-neuf] content length:", recordContent.length);

    try {
      await recordGenerationFromRequest(request, {
        type: "programme-neuf",
        description: generationDescription,
        prospectName: null,
        prospectId: null,
        content: recordContent.substring(0, 10000),
      });
      console.log("[programme-neuf] generation recorded successfully");
    } catch (e) {
      console.error("[programme-neuf] recordGeneration failed:", e);
    }

    const scoring = null;

    return NextResponse.json({
      programme: programmeAnnonces,
      lot: lotAnnonces,
      scoring,
      extractedData,
    });
  } catch (err) {
    console.error("[programme-neuf] CRASH:", err);
    return NextResponse.json(
      { error: "Erreur interne lors de la generation des annonces programme neuf." },
      { status: 500 },
    );
  }
}
