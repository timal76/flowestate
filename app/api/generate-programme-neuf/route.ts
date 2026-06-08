import { NextResponse } from "next/server";

import { getLeHavreDataForPrompt } from "@/lib/data/le-havre";
import { checkGenerationLimit, checkProgrammesNeufsAccess } from "@/lib/check-generation-limit";
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
- NOM DE LA RÉSIDENCE : Ne jamais mentionner le nom commercial de la résidence (Havre en Scène, etc.) dans les annonces. L'agent l'ajoutera lui-même.
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

ZÉRO INVENTION — RÈGLE FONDAMENTALE :
Chaque information technique dans l'annonce doit être traçable vers un document source (plaquette, plan, annexe, données officielles sourcées). Si une information n'est pas dans les documents fournis ou dans les données Le Havre avec source explicite : elle n'existe pas pour cette annonce.
Cette règle s'applique à TOUT programme, pas seulement au lot B204.
En cas de doute sur une information : NE PAS L'ÉCRIRE.
Mieux vaut une annonce avec moins d'informations qu'une annonce avec une seule information inventée.

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

ORTHOGRAPHE ET NOMS PROPRES :
- Auguste Perret (architecte havrais) : PERRET pas Perrot
- RE2020 pas RT2020
- Dommee pas Domee ou Domée
- Sedelka pas Sédélka
- Relire tous les noms propres avant de retourner le texte

CONTRÔLE QUALITÉ FINAL OBLIGATOIRE :
Avant de retourner les annonces, vérifier :
1. Zéro faute d'orthographe, grammaire, typographie
2. Angle cohérent du début à la fin de chaque annonce
3. Zéro information inventée
4. Toutes les mentions légales présentes
5. Noms propres corrects
6. Données techniques exactes (RE2020, étage, surfaces, nombre de trains)

- PINEL HORS ANGLE INVESTISSEUR : si l'angle ou le profil prospect contient "retraite", "résidence secondaire", "pied-à-terre", "senior", "bord de mer", ne jamais mentionner le dispositif Pinel ni le rendement locatif. Ces mentions sont INTERDITES sur ces angles.
- TRAIN PARIS-LE HAVRE : la liaison Paris Saint-Lazare - Le Havre est un Intercités ou TER Normandie. Ne jamais écrire "TGV" pour cette liaison. Écrire "train direct" ou "Intercités".
- TARIFS TRANSPORT : ne jamais indiquer de prix de billets de train sans source officielle SNCF confirmée. Écrire "tarifs variables selon disponibilités — voir sncf-connect.com" si nécessaire.
- RE2020 ÉCONOMIES : ne jamais écrire "factures divisées par X" sans source officielle. Écrire uniquement "charges énergétiques maîtrisées grâce aux normes RE2020" ou "performance énergétique optimisée RE2020".
- VIS-À-VIS : ne jamais affirmer "sans vis-à-vis" ou "vue dégagée" sauf si explicitement confirmé dans les plans ou documents fournis.
- "HAVRE DE PAIX" : cette expression reste INTERDITE sous toutes ses formes. "Votre havre normand" ou "refuge normand" sont acceptés car ils font référence à la ville.

STRATÉGIE DE DIFFÉRENCIATION — MÉTHODOLOGIE OBLIGATOIRE :

Étape 1 — Analyse des arguments promoteur :
Identifie tous les arguments de la plaquette dans extractedData.arguments_promoteur. Ces arguments sont INTERDITS dans tes annonces sous cette forme. Tu dois les reformuler ou les contourner.

Étape 2 — Construction de l'angle opposé :
Pour chaque argument promoteur identifié, construis l'argument inverse centré sur le quotidien de l'acheteur.
Exemple : Promoteur dit "résidence moderne" → toi tu dis "14 trains quotidiens Paris Saint-Lazare, premier départ 5h14 (source SNCF Connect)"
Exemple : Promoteur dit "prestations haut de gamme" → toi tu dis "prix médian secteur 2 400€/m² soit 15% sous le centre UNESCO (source L'Apporteur d'Immo déc. 2024)"
Exemple : Promoteur dit "cadre de vie agréable" → toi tu dis "Halles Centrales ouvertes tous les jours, 22 commerçants, 5 min à pied"

Étape 3 — Titres avec chiffres réels obligatoires :
Chaque titre DOIT contenir au minimum UN chiffre réel sourcé.
INTERDIT : "Appartement neuf Le Havre — résidence moderne"
OBLIGATOIRE : "2h05 de Paris • T3 neuf 64m² • 2 400€/m² secteur • livraison T1 2026"
Les chiffres disponibles : trajet train, prix au m², nombre de trains, surfaces exactes, loyer médian, date livraison, distance plage/centre.

Étape 4 — Accroche inattendue obligatoire :
L'accroche ne commence JAMAIS par le nom de la résidence, le type de bien, ou "Découvrez".
Elle commence par une situation concrète de vie réelle selon le profil :
- Retraité/résidence secondaire : "Vendredi 18h32, train direct depuis Saint-Lazare." ou "Depuis votre smartphone parisien, vous préchauffez l'appartement."
- Investisseur : "Loyer médian 12€/m² dans ce secteur (source Observatoire Clameur 2026). Voici pourquoi ce T3 change l'équation."
- Famille : "À 800m de l'école, à 14 min des plages. C'est ça, grandir au Havre."

Étape 5 — Données hardcodées = arguments différenciants :
Les données Le Havre fournies sont ton avantage concurrentiel principal. Aucune autre agence ne les utilisera avec leurs sources précises. Cite-les avec leurs sources dans chaque annonce.
Au minimum dans chaque annonce : 1 donnée marché immobilier sourcée + 1 donnée transport sourcée + 1 projet urbain sourcé.

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

CHECKLIST ANTI-VIOLATION — À APPLIQUER SUR CHAQUE ANNONCE AVANT DE RETOURNER LE JSON :
□ Zéro puce ou tiret en début de ligne
□ Zéro titre en majuscules
□ Zéro nom de promoteur
□ Zéro nom de résidence commerciale  
□ Zéro "(source : X)"
□ Zéro année passée (2024, 2025)
□ Texte en prose uniquement

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

      const hasAccess = await checkProgrammesNeufsAccess(effectiveUserId);
      if (!hasAccess) {
        return NextResponse.json(
          {
            error:
              "La feature Programmes neufs est réservée au plan Expert. Passez au plan Expert pour y accéder.",
          },
          { status: 403 },
        );
      }
    }

    const body = (await request.json()) as GenerateProgrammeNeufPayload;

    // Si extractedProgramData est fourni, on saute l'extraction PDF
    let extractedData: Record<string, unknown> = {};
    let skipPdfExtraction = false;

    if (body.extractedProgramData && Object.keys(body.extractedProgramData).length > 0) {
      extractedData = body.extractedProgramData;
      skipPdfExtraction = true;
    } else if (!body.pdfBase64?.trim()) {
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

    if (!skipPdfExtraction) {
    const pdfData = cleanPdfBase64(body.pdfBase64!);
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
        max_tokens: 600,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: isParis ? 2 : 1 }],
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

      const introLine = isCourt
        ? "Génère UNIQUEMENT les annonces leboncoin et seloger différenciées à partir des données suivantes."
        : isSiteOnly
          ? "Génère UNIQUEMENT l'annonce siteAgence à partir des données suivantes."
          : "Génère les 3 annonces immobilières différenciées à partir des données suivantes.";

      const titleRulesBlock = isCourt
        ? `RÈGLES OBLIGATOIRES POUR LES TITRES :
- Leboncoin (60 car max) : DOIT contenir surface OU prix OU trajet train. Ex: "2h05 Paris • T3 64m² neuf • Livraison T1 2026"
- SeLoger (100 car max) : DOIT contenir ville + type + caractéristique chiffrée. Ex: "Le Havre Arcole Brindeau — T3 neuf 64m² + balcon 28m² — 2 400€/m² secteur — Livraison T1 2026"`
        : isSiteOnly
          ? `RÈGLES OBLIGATOIRES POUR LES TITRES :
- Site agence : titre libre mais DOIT contenir une affirmation forte avec chiffre. Ex: "Votre refuge normand à 2h05 de Paris — 15% sous le prix du centre UNESCO"`
          : `RÈGLES OBLIGATOIRES POUR LES TITRES :
- Leboncoin (60 car max) : DOIT contenir surface OU prix OU trajet train. Ex: "2h05 Paris • T3 64m² neuf • Livraison T1 2026"
- SeLoger (100 car max) : DOIT contenir ville + type + caractéristique chiffrée. Ex: "Le Havre Arcole Brindeau — T3 neuf 64m² + balcon 28m² — 2 400€/m² secteur — Livraison T1 2026"
- Site agence : titre libre mais DOIT contenir une affirmation forte avec chiffre. Ex: "Votre refuge normand à 2h05 de Paris — 15% sous le prix du centre UNESCO"`;

      const formatJson = isCourt
        ? '{"leboncoin":{"titre":"...","corps":"..."},"seloger":{"titre":"...","corps":"..."}}'
        : isSiteOnly
          ? '{"siteAgence":{"titre":"...","corps":"..."}}'
          : '{"leboncoin":{"titre":"...","corps":"..."},"seloger":{"titre":"...","corps":"..."},"siteAgence":{"titre":"...","corps":"..."}}';

      const programmeMandatoryBlock = isProgramme
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
${introLine}

${programmeMandatoryBlock}${modeInstruction}
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

RAPPEL FINAL : {"leboncoin":{"titre":"...","corps":"..."},"seloger":{"titre":"...","corps":"..."},"siteAgence":{"titre":"...","corps":"..."}}
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

      // Vérification et fallback sur les champs manquants
      if (!annonces.leboncoin?.titre)
        annonces.leboncoin = {
          titre: "Programme neuf Le Havre",
          corps: annonces.leboncoin?.corps || "",
        };
      if (!annonces.seloger?.titre)
        annonces.seloger = {
          titre: "Programme neuf Le Havre",
          corps: annonces.seloger?.corps || "",
        };
      if (!annonces.siteAgence?.titre)
        annonces.siteAgence = {
          titre: "Programme neuf Le Havre",
          corps: annonces.siteAgence?.corps || "",
        };

      return annonces;
    }

    const generateSplitAnnonces = async (
      baseMode: "programme" | "lot",
    ): Promise<GeneratedAnnonces | NextResponse> => {
      const courtMode = baseMode === "programme" ? "programme-court" : "lot-court";
      const siteMode = baseMode === "programme" ? "programme-site" : "lot-site";

      const shortCall = await callAnthropicWithRetry(apiKey, {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2500,
        system:
          GENERATION_SYSTEM +
          '\n\nRAPPEL : Retourne UNIQUEMENT {"leboncoin":{"titre":"...","corps":"..."},"seloger":{"titre":"...","corps":"..."}}',
        messages: [
          {
            role: "user",
            content:
              buildGenerationUserPrompt(courtMode) +
              '\n\nGénère UNIQUEMENT leboncoin et seloger. Format: {"leboncoin":{...},"seloger":{...}}',
          },
          { role: "assistant", content: "{" },
        ],
      });

      if (!shortCall.response.ok) {
        return anthropicErrorResponse(shortCall.response, shortCall.json);
      }

      const siteCall = await callAnthropicWithRetry(apiKey, {
        model: "claude-sonnet-4-5",
        max_tokens: 3000,
        system:
          GENERATION_SYSTEM +
          '\n\nRAPPEL : Retourne UNIQUEMENT {"siteAgence":{"titre":"...","corps":"..."}}',
        messages: [
          {
            role: "user",
            content:
              buildGenerationUserPrompt(siteMode) +
              '\n\nGénère UNIQUEMENT siteAgence. Format: {"siteAgence":{...}}',
          },
          { role: "assistant", content: "{" },
        ],
      });

      if (!siteCall.response.ok) {
        return anthropicErrorResponse(siteCall.response, siteCall.json);
      }

      const shortText = extractTextFromAnthropic(shortCall.json);
      const shortParsed = parseGeneratedAnnonces(shortText, `${baseMode}-court`);
      if (shortParsed instanceof NextResponse) return shortParsed;

      const siteText = extractTextFromAnthropic(siteCall.json);
      const siteParsed = parseGeneratedAnnonces(siteText, `${baseMode}-site`);
      if (siteParsed instanceof NextResponse) return siteParsed;

      return {
        leboncoin: shortParsed.leboncoin,
        seloger: shortParsed.seloger,
        siteAgence: siteParsed.siteAgence,
      };
    };

    const hasAnnexes = annexes.length > 0;

    let programmeAnnonces: GeneratedAnnonces;
    let lotAnnonces: GeneratedAnnonces | null = null;

    if (hasAnnexes) {
      const [programmeResult, lotResult] = await Promise.all([
        generateSplitAnnonces("programme"),
        generateSplitAnnonces("lot"),
      ]);

      if (programmeResult instanceof NextResponse) return programmeResult;
      programmeAnnonces = programmeResult;

      if (lotResult instanceof NextResponse) return lotResult;
      lotAnnonces = lotResult;
    } else {
      const programmeResult = await generateSplitAnnonces("programme");
      if (programmeResult instanceof NextResponse) return programmeResult;
      programmeAnnonces = programmeResult;
    }

    const runAnnoncesVerification = async (
      annoncesToVerify: GeneratedAnnonces,
    ): Promise<GeneratedAnnonces> => {
      const verificationPrompt = `Tu es un vérificateur immobilier strict. Tu reçois des annonces générées et les données sources. Tu dois supprimer ou corriger TOUTE information qui n'est pas présente dans les sources.

DONNÉES SOURCES AUTORISÉES :
${JSON.stringify(essentialExtractedData)}
${hardcodedData ? `DONNÉES LE HAVRE VÉRIFIÉES : ${hardcodedData.substring(0, 500)}` : ""}

ANNONCES À VÉRIFIER :
${JSON.stringify(annoncesToVerify)}

RÈGLES DE VÉRIFICATION — SUPPRIME IMMÉDIATEMENT :
- Ascenseur si non mentionné dans les sources
- Baignoire si non mentionnée dans les sources
- VMC double flux si non mentionnée
- Hauteur sous plafond inventée
- Orientation (sud/nord/est/ouest) si non confirmée
- "Sans vis-à-vis" si non confirmé
- Prix au m² calculés pour un lot spécifique
- Nombre de restaurants/commerces inventé
- Pinel sur angle retraite/résidence secondaire
- Toute information non traçable vers les sources

CORRECTIONS :
- "ascenseur" → supprimer la mention
- "baignoire" → remplacer par "douche à l'italienne"
- prix calculés → supprimer
- Pinel → supprimer si angle retraite

Retourne UNIQUEMENT le JSON corrigé, commence par { et termine par } :
{"leboncoin":{"titre":"...","corps":"..."},"seloger":{"titre":"...","corps":"..."},"siteAgence":{"titre":"...","corps":"..."}}`;

      const verificationCall = await callAnthropicWithRetry(apiKey, {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [
          { role: "user", content: verificationPrompt },
          { role: "assistant", content: "{" },
        ],
      });

      if (verificationCall.response.ok) {
        const verifText = "{" + extractTextFromAnthropic(verificationCall.json);
        try {
          const verifiedAnnonces = parseJsonFromText(verifText) as GeneratedAnnonces;
          if (
            verifiedAnnonces.leboncoin?.titre &&
            verifiedAnnonces.seloger?.titre &&
            verifiedAnnonces.siteAgence?.titre
          ) {
            return verifiedAnnonces;
          }
        } catch {
          console.error("[verification] parse failed, using original annonces");
        }
      }

      return annoncesToVerify;
    };

    programmeAnnonces = await runAnnoncesVerification(programmeAnnonces);
    if (lotAnnonces) {
      lotAnnonces = await runAnnoncesVerification(lotAnnonces);
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

    let scoring = null;
    try {
      const scoringPrompt = `Tu es expert marketing immobilier. Évalue ces annonces sur 4 critères précis.

ANNONCES À ÉVALUER :
Leboncoin titre: ${annonces.leboncoin.titre.substring(0, 120).replace(/"/g, "'")}
Leboncoin extrait: ${annonces.leboncoin.corps.substring(0, 200).replace(/"/g, "'")}
SeLoger extrait: ${annonces.seloger.corps.substring(0, 200).replace(/"/g, "'")}
Site extrait: ${annonces.siteAgence.corps.substring(0, 400).replace(/"/g, "'")}

ANGLE AGENT: ${angle.substring(0, 80).replace(/"/g, "'")}
PROFIL PROSPECT: ${(prospectProfile || "").substring(0, 80).replace(/"/g, "'")}

CRITÈRES DE NOTATION (score global = moyenne pondérée) :
1. Différenciation vs promoteur (3pts) : L'annonce évite-t-elle les formules génériques ? Contient-elle des angles que le promoteur n'utilise pas ?
2. Cohérence profil prospect (3pts) : L'angle est-il tenu du début à la fin ? Les arguments correspondent-ils exactement au profil ?
3. Données factuelles sourcées (2pts) : Y a-t-il des prix au m² sourcés, des horaires de train précis, des projets urbains avec sources ? Si oui : 2pts automatiques.
4. Qualité rédactionnelle (2pts) : L'accroche est-elle inattendue ? Les titres contiennent-ils des chiffres réels ?

BARÈME :
- 8-10 : Annonces publiables immédiatement, différenciation forte, données sourcées présentes
- 6-7 : Bonnes annonces avec 1-2 axes d'amélioration identifiés
- 4-5 : Annonces correctes mais trop proches du discours promoteur
- 1-3 : Annonces génériques non différenciées

Si les annonces contiennent des données chiffrées sourcées (prix m², horaires train, projets datés) → score minimum 7.
Si les titres contiennent des chiffres réels → bonus +1 sur qualité rédactionnelle.

Retourne UNIQUEMENT ce JSON (commence par {, termine par }) :
{"score":8,"verdict":"Une phrase courte et précise","points_forts":["point fort 1 concret","point fort 2 concret","point fort 3 concret"],"suggestions":["amélioration 1 actionnable","amélioration 2 actionnable"]}`;

      const scoringCall = await callAnthropicWithRetry(apiKey, {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: scoringPrompt }],
      });

      if (scoringCall.response.ok) {
        const raw = extractTextFromAnthropic(scoringCall.json)?.trim() ?? "";
        console.log("SCORING RAW:", raw.substring(0, 150));
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          try {
            const parsed = JSON.parse(raw.slice(start, end + 1)) as {
              score?: number;
              verdict?: string;
              points_forts?: string[];
              suggestions?: string[];
            };
            if (typeof parsed.score === "number") {
              scoring = parsed;
            }
          } catch {
            console.error("SCORING PARSE FAILED:", raw.substring(0, 100));
          }
        }
      }
    } catch (e) {
      console.error("SCORING ERROR:", e);
    }

    return NextResponse.json({
      programme: programmeAnnonces,
      lot: lotAnnonces,
      scoring,
      extractedData,
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur interne lors de la generation des annonces programme neuf." },
      { status: 500 },
    );
  }
}
