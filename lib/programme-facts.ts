/**
 * Faits autorisés et vérification post-génération pour Programmes neufs.
 *
 * Principe : le générateur ne doit utiliser que des faits présents dans la plaquette
 * (données extraites), les informations de l'agent et l'analyse des annexes.
 * Le prompt injecte ces faits (approche positive) et, après génération, un contrôle
 * côté code repère les montants, dates, durées, surfaces et termes qui ne s'y trouvent pas.
 */

export type Dispositif = "nue-propriete" | "lmnp" | "pinel" | "autre";

export type FactsContext = {
  /** Texte brut de tous les faits autorisés. */
  factsText: string;
  externalFacts: ExternalFact[];
  /** Même texte, sans accents ni majuscules, séparateurs de milliers retirés. */
  folded: string;
  /** Tous les nombres présents dans les faits (séparateurs de milliers retirés). */
  numbers: Set<string>;
  /** Années citées par les données web (autorisées pour les projets futurs). */
  webYears: Set<string>;
  dispositif: Dispositif;
  /** Montants présents dans les faits comme « prix moyen » (donc jamais « à partir de »). */
  averageAmounts: Set<string>;
  /** Livraison / début d'usufruit déjà passé : ne plus la mentionner. */
  deliveryPast: boolean;
  deliveryYear: string | null;
  now: Date;
  todayLabel: string;
};

export type FactIssue = {
  platform?: string;
  field?: "titre" | "corps";
  sentence: string;
  reason: string;
};

import { formatExternalFactsBlock, type ExternalFact } from "@/lib/web-enrichment";

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

export function foldText(text: string): string {
  return text
    .replace(/[  ]/g, " ")
    .replace(/[’‘`]/g, "'")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** « 326 500 » / « 326.500 » → « 326500 » (séparateurs de milliers uniquement). */
function collapseThousands(text: string): string {
  let previous: string;
  let current = text;
  do {
    previous = current;
    current = current.replace(/(\d)[ .](?=\d{3}(?!\d))/g, "$1");
  } while (current !== previous);
  return current;
}

function normalizeNumberToken(token: string): string {
  return token.replace(",", ".");
}

function extractNumbers(foldedCollapsed: string): Set<string> {
  const numbers = new Set<string>();
  for (const match of foldedCollapsed.matchAll(/\d+(?:[.,]\d+)?/g)) {
    numbers.add(normalizeNumberToken(match[0]));
  }
  return numbers;
}

/* ------------------------------------------------------------------ */
/* Dispositif et dates                                                 */
/* ------------------------------------------------------------------ */

export function detectDispositif(texts: string[]): Dispositif {
  const folded = foldText(texts.join(" "));
  if (/nue[- ]propriete|demembrement|usufruit/.test(folded)) return "nue-propriete";
  if (/\blmnp\b|\blmp\b|meuble non professionnel/.test(folded)) return "lmnp";
  if (/\bpinel\b/.test(folded)) return "pinel";
  return "autre";
}

const MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
};

/** Fin de la période citée dans une date de livraison (trimestre, mois ou année). */
export function parseDeliveryEnd(text: string): { end: Date; year: string } | null {
  const folded = foldText(text);

  const quarterA = folded.match(/\b([1-4])\s*(?:er|e|eme)?\s*trimestre\s*(20\d{2})/);
  if (quarterA) {
    const month = Number(quarterA[1]) * 3;
    return { end: new Date(Date.UTC(Number(quarterA[2]), month, 0)), year: quarterA[2] };
  }
  const quarterB = folded.match(/\bt([1-4])\s*(20\d{2})/);
  if (quarterB) {
    const month = Number(quarterB[1]) * 3;
    return { end: new Date(Date.UTC(Number(quarterB[2]), month, 0)), year: quarterB[2] };
  }
  const monthMatch = folded.match(
    /\b(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s*(20\d{2})/,
  );
  if (monthMatch) {
    const month = MONTHS[monthMatch[1]];
    return { end: new Date(Date.UTC(Number(monthMatch[2]), month, 0)), year: monthMatch[2] };
  }
  const yearMatch = folded.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    return { end: new Date(Date.UTC(Number(yearMatch[1]), 12, 0)), year: yearMatch[1] };
  }
  return null;
}

function formatToday(now: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(now);
}

/* ------------------------------------------------------------------ */
/* Construction du contexte                                            */
/* ------------------------------------------------------------------ */

export function buildFactsContext(input: {
  externalFacts?: ExternalFact[];
  extractedData: Record<string, unknown>;
  additionalInfo?: string;
  priceFrom?: string;
  annexesDescription?: string;
  webText?: string;
  now?: Date;
}): FactsContext {
  const now = input.now ?? new Date();
  const programmeJson = JSON.stringify(input.extractedData);
  const factsText = [
    programmeJson,
    input.additionalInfo ?? "",
    input.priceFrom ?? "",
    input.annexesDescription ?? "",
    formatExternalFactsBlock(input.externalFacts ?? []),
  ]
    .filter(Boolean)
    .join("\n");

  const folded = collapseThousands(foldText(factsText));
  const numbers = extractNumbers(folded);

  const webYears = new Set<string>();
  if (input.webText) {
    for (const match of foldText(input.webText).matchAll(/\b(20\d{2})\b/g)) {
      webYears.add(match[1]);
    }
  }

  const averageAmounts = new Set<string>();
  for (const match of folded.matchAll(/moyens?\W{0,12}(?:de\W{0,4})?(\d+(?:[.,]\d+)?)/g)) {
    averageAmounts.add(normalizeNumberToken(match[1]));
  }
  for (const match of folded.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:€|euros?)?\s*\(?\s*prix\s+moyen/g)) {
    averageAmounts.add(normalizeNumberToken(match[1]));
  }
  const prixType = typeof input.extractedData.prix_type === "string" ? foldText(input.extractedData.prix_type) : "";
  if (prixType.includes("moyen") && input.extractedData.prix_min != null) {
    averageAmounts.add(String(input.extractedData.prix_min));
  }

  const livraison =
    typeof input.extractedData.livraison === "string" ? input.extractedData.livraison : "";
  const delivery = livraison ? parseDeliveryEnd(livraison) : null;
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const deliveryPast = delivery ? delivery.end < startOfToday : false;

  return {
    factsText,
    externalFacts: input.externalFacts ?? [],
    folded,
    numbers,
    webYears,
    dispositif: detectDispositif([
      typeof input.extractedData.dispositif === "string" ? input.extractedData.dispositif : "",
      input.additionalInfo ?? "",
      programmeJson,
    ]),
    averageAmounts,
    deliveryPast,
    deliveryYear: delivery?.year ?? null,
    now,
    todayLabel: formatToday(now),
  };
}

/* ------------------------------------------------------------------ */
/* Bloc injecté dans le prompt                                         */
/* ------------------------------------------------------------------ */

function buildDispositifRules(dispositif: Dispositif): string {
  if (dispositif === "nue-propriete") {
    return `11. DISPOSITIF NUE-PROPRIÉTÉ : l'acquéreur achète la nue-propriété (jamais la « pleine propriété » à l'achat). Pendant toute la durée du démembrement il ne perçoit aucun loyer, ne gère rien et n'occupe pas le bien. Il retrouve la pleine propriété à l'issue. N'emploie ni « rendement », ni « revenus locatifs », ni « capitalisation ». Ne suggère jamais d'habiter le bien pendant le démembrement.`;
  }
  if (dispositif === "lmnp" || dispositif === "pinel") {
    return `11. DISPOSITIF FISCAL : ne chiffre aucun avantage fiscal ni aucun rendement. Renvoie vers le conseiller pour l'étude du dispositif.`;
  }
  return "";
}

export function buildFactsPrompt(ctx: FactsContext, compactProgrammeJson: string): string {
  const deliveryRule = ctx.deliveryPast
    ? `La date de livraison ou de début indiquée dans les faits est DÉPASSÉE à la date du jour : ne la mentionne pas, n'écris aucune date ni aucun trimestre pour la livraison.`
    : `N'écris aucune date de livraison autre que celle des faits.`;

  return `FAITS AUTORISÉS — SEULES INFORMATIONS UTILISABLES
Date du jour : ${ctx.todayLabel}.
Données du programme (plaquette promoteur) :
${compactProgrammeJson}
Sont aussi des faits autorisés : les informations complémentaires et le prix indicatif de l'agent, ainsi que l'analyse des documents annexes, quand ils sont fournis plus bas.${
    ctx.externalFacts.length
      ? `

FAITS EXTERNES VÉRIFIÉS (issus de pages web consultées, avec leur source ; ils complètent la plaquette) :
${formatExternalFactsBlock(ctx.externalFacts)}`
      : ""
  }

RÈGLES D'USAGE DES FAITS (ABSOLUES) :
1. Tout élément précis que tu écris (montant, date, durée, pourcentage, surface, nombre de lots, équipement, garantie, label, matériau, style architectural, nom de lieu proche) doit figurer dans les faits autorisés. Sinon, tu ne l'écris pas. En cas de doute, tu omets.
2. Tu peux citer les FAITS EXTERNES VÉRIFIÉS ci-dessus, tels qu'ils sont écrits, sans les enrichir ni les extrapoler. Aucune autre information sur le quartier, la ville ou le marché : ni chiffre, ni date, ni projet futur, ni promesse en dehors de ces faits.
3. Reprends chaque prix avec son qualificatif exact : un prix « moyen » s'écrit « prix moyen » et jamais « à partir de ».
4. ${deliveryRule}
5. L'angle et le profil prospect servent à choisir le ton et les arguments. Ne cite jamais l'âge, le budget ni la situation du profil comme un fait du programme.
6. Aucune formule d'urgence ou de rareté qui ne soit pas dans les faits.
7. Décris, ne qualifie pas : n'ajoute aucun superlatif ni adjectif de standing, d'innovation, de durabilité ou d'écologie qui ne figure pas dans les faits.
8. Un équipement de l'immeuble (ascenseur, accès, local à vélos, patio, toitures) n'est jamais attribué à chaque logement. Un équipement présent dans certains logements seulement est cité avec sa restriction.
9. Pour un fait externe, ne présume pas de la distance au programme : écris « dans le quartier » ou cite l'élément tel que la source le décrit, sans « à proximité » ni « à deux pas ».
10. N'écris jamais « vous êtes un investisseur… » ni aucune description du profil cible : écris pour lui sans le désigner.${
    buildDispositifRules(ctx.dispositif) ? `\n${buildDispositifRules(ctx.dispositif)}` : ""
  }`;
}

/* ------------------------------------------------------------------ */
/* Vérification post-génération                                        */
/* ------------------------------------------------------------------ */

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type TermRule = { re: RegExp; label: string };

/** Termes interdits sauf s'ils figurent dans les faits. */
const UNSUPPORTED_TERMS: TermRule[] = [
  { re: /\bdecennale\b/, label: "garantie décennale" },
  { re: /\bgaranti\w*/, label: "garantie" },
  { re: /\bagrees?\b/, label: "« agréé »" },
  { re: /\bhaussmann\w*/, label: "style haussmannien" },
  { re: /\bappels?\s+de\s+fonds?\b/, label: "appels de fonds" },
  { re: /\bisf\b/, label: "ISF" },
  { re: /\bpierre\s+de\s+taille\b/, label: "pierre de taille" },
  { re: /\b(?:re\s?2020|rt\s?2012|bbc|hqe|nf\s+habitat)\b/, label: "label ou norme" },
  { re: /\bpourquoi\s+maintenant\b/, label: "formule d'urgence" },
  { re: /\bfortement\s+impose\w*/, label: "situation fiscale du profil cible" },
  {
    re: /\b(?:intemporel\w*|perenne\w*|raffin\w+|novateur\w*|novatrice|innovant\w*|optimis\w+|premium|prestig\w+|haut\s+de\s+gamme|luxueu\w+|meilleur\w*|etabli\w*|attractif\w*|privilegi\w+|modulable\w*|specialis\w+|specialiste\w*|substantiel\w*|soucieu\w+|durablement|ancr\w+|soigne\w*|de\s+qualite|haute\s+qualite|surprise|tracas|sans\s+souci|serein\w*|serenite|equilibr\w+|encadr\w+|transparen\w+|levier|diversification|partout|reconnu\w*|coherent\w*|exposition\s+(?:immobiliere|au\s+marche)|ecolog\w+|durab\w+|priv(?:e|ee|es|ees|atif|atifs|ative|atives))\b/,
    label: "qualificatif ou superlatif non sourcé",
  },
  {
    re: /\b(?:rares?|rarete|dernieres?\s+opportunites?|derniers?\s+lots?|exceptionnel(?:le)?s?|unique)\b/,
    label: "formule de rareté ou d'urgence",
  },
];

const AMOUNT_RE = /(\d+(?:[.,]\d+)?)\s*(k)?\s*(?:€|euros?\b)/g;
const PERCENT_RE = /(\d+(?:[.,]\d+)?)\s*%/g;
const SURFACE_RE = /(\d+(?:[.,]\d+)?)\s*m(?:2|²)/g;
const DURATION_RE = /(\d+)\s*ans\b/g;
const COUNT_RE = /(\d+)\s*(?:logements?|lots?|appartements?|studios?)\b/g;
const TRAVEL_RE = /(\d+)\s*(?:min(?:utes?)?|km|kilometres?)\b/g;
const YEAR_RE = /\b(20\d{2})\b/g;
const FROM_PRICE_RE = /(?:a\s+partir\s+de|des)\s+(\d+(?:[.,]\d+)?)\s*(?:€|euros?\b)/g;

function amountToToken(raw: string, k: string | undefined): string {
  const value = Number(normalizeNumberToken(raw));
  if (Number.isNaN(value)) return raw;
  return String(k ? value * 1000 : value);
}

/** Contrôle d'une phrase (ou d'un titre) par rapport aux faits. */
export function verifySentence(sentence: string, ctx: FactsContext): string[] {
  const reasons: string[] = [];
  const folded = collapseThousands(foldText(sentence));

  for (const { re, label } of UNSUPPORTED_TERMS) {
    if (re.test(folded) && !re.test(ctx.folded)) {
      reasons.push(`${label} absent(e) des faits`);
    }
  }

  for (const match of folded.matchAll(AMOUNT_RE)) {
    const token = amountToToken(match[1], match[2]);
    if (!ctx.numbers.has(token)) reasons.push(`montant ${match[0].trim()} absent des faits`);
  }
  for (const match of folded.matchAll(PERCENT_RE)) {
    if (!ctx.numbers.has(normalizeNumberToken(match[1]))) {
      reasons.push(`pourcentage ${match[0].trim()} absent des faits`);
    }
  }
  for (const match of folded.matchAll(SURFACE_RE)) {
    if (!ctx.numbers.has(normalizeNumberToken(match[1]))) {
      reasons.push(`surface ${match[0].trim()} absente des faits`);
    }
  }
  for (const match of folded.matchAll(DURATION_RE)) {
    if (!ctx.numbers.has(match[1])) reasons.push(`durée « ${match[0].trim()} » absente des faits`);
  }
  for (const match of folded.matchAll(TRAVEL_RE)) {
    if (!ctx.numbers.has(match[1])) reasons.push(`durée ou distance « ${match[0].trim()} » absente des faits`);
  }
  for (const match of folded.matchAll(COUNT_RE)) {
    if (!ctx.numbers.has(match[1])) reasons.push(`nombre « ${match[0].trim()} » absent des faits`);
  }

  const currentYear = ctx.now.getUTCFullYear();
  for (const match of folded.matchAll(YEAR_RE)) {
    const year = match[1];
    if (Number(year) < currentYear) {
      reasons.push(`année passée ${year}`);
    } else if (!ctx.numbers.has(year) && !ctx.webYears.has(year)) {
      reasons.push(`année ${year} absente des faits`);
    }
  }

  if (ctx.deliveryPast) {
    const mentionsDeliveryDate =
      (ctx.deliveryYear !== null && folded.includes(ctx.deliveryYear)) ||
      /\btrimestre\b/.test(folded) ||
      /\bt[1-4]\b/.test(folded);
    if (mentionsDeliveryDate) reasons.push("date de livraison dépassée à ne pas mentionner");
  }

  if (
    /\b(?:chaque|chacun\w*|tous\s+les|toutes\s+les)\s+(?:logements?|unites?|appartements?|lots?|studios?)\b/.test(
      folded,
    ) &&
    /\b(?:ascenseur|local\s+a\s+velos?|controles?\s+d'acces|acces\s+securise|patio|toitures?|pompe\s+a\s+chaleur|terrasse|balcon|kitchenette)\b/.test(
      folded,
    )
  ) {
    reasons.push("équipement de l'immeuble ou de certains lots attribué à chaque logement");
  }

  if (/\b(?:tous\s+les\s+etages|acces\s+direct|desservant)\b/.test(folded)) {
    reasons.push("précision d'accès ou de desserte absente des faits");
  }

  // Dans une vente en nue-propriété, 61 % est la part de valeur payée : « 61 % moins cher » est faux.
  if (
    ctx.dispositif === "nue-propriete" &&
    /\b\d{1,3}(?:[.,]\d+)?\s*%[^.;:]{0,25}\b(?:moins\s+cher|de\s+(?:reduction|decote|remise|moins)|d'economie)|\b(?:decote|reduction|remise|reduit\w*|economie)\b[^.;:]{0,25}\d{1,3}(?:[.,]\d+)?\s*%/.test(
      folded,
    )
  ) {
    reasons.push("pourcentage de nue-propriété présenté comme une décote (il s'agit de la part de valeur payée)");
  }

  if (/pompe\s+a\s+chaleur\s+individuelle/.test(ctx.folded) && /electrique/.test(ctx.folded)) {
    for (const match of folded.matchAll(/chauffage[^.;]{0,40}pompe\s+a\s+chaleur/g)) {
      const start = Math.max(0, (match.index ?? 0) - 60);
      const around = folded.slice(start, (match.index ?? 0) + match[0].length + 60);
      if (!/\b(?:studios?\s+(?:du\s+)?(?:r\+6|dernier)|r\+6|dernier\s+etage|selon|certain\w*|electrique|autres\s+logements)\b/.test(around)) {
        reasons.push("pompe à chaleur présentée comme chauffage de tous les logements");
        break;
      }
    }
  }

  if (
    ctx.dispositif === "nue-propriete" &&
    /\bvous\s+(?:restituez|rendez|perdez|revendez)\b[^.;]{0,30}pleine\s+propriete/.test(folded)
  ) {
    reasons.push("la pleine propriété est récupérée par le nue-propriétaire, pas restituée");
  }

  if (
    ctx.dispositif === "nue-propriete" &&
    /\bproprietaire\s+(?:du\s+sol|des\s+murs)\b|\b(?:devenez|etes)\s+proprietaire\s+a\s+\d/.test(folded)
  ) {
    reasons.push("rôle juridique inexact : pendant le démembrement le client est nu-propriétaire, pas plein propriétaire");
  }

  if (/\binvestisseurs?\s+(?:patrimoni\w+|fortement)|\bprofil\s+(?:investisseur|patrimonial)/.test(folded)) {
    reasons.push("profil cible présenté comme une caractéristique du programme");
  }

  if (/\b(?:manuel\w*|a\s+manoeuvre\s+manuelle)\b/.test(folded) && !/\bmanuel\w*/.test(ctx.folded)) {
    reasons.push("mode de manœuvre non mentionné dans les faits");
  }

  if (/\baeroports?\s+region\w+|\bappels?\s+de\s+charges?\b|\bcharges?\s+surprise\b/.test(folded)) {
    reasons.push("formule non sourcée");
  }

  if (/\bvous\s+etes\s+(?:un|une)\b/.test(folded)) {
    reasons.push("profil du prospect cité comme un fait");
  }

  for (const match of folded.matchAll(FROM_PRICE_RE)) {
    const token = normalizeNumberToken(match[1]);
    if (ctx.averageAmounts.has(token)) {
      reasons.push(`« à partir de ${match[1]} € » alors que c'est un prix moyen`);
    }
  }

  if (ctx.dispositif === "nue-propriete") {
    if (
      /\brendements?\b|\brevenus?\s+(?:locatifs?|complementaires?)\b|\bcapitalis\w*|\bpercev\w+\s+(?:des\s+)?loyers?\b|\bloyers?\s+percus\b/.test(
        folded,
      )
    ) {
      reasons.push("rendement ou loyers perçus incompatibles avec la nue-propriété");
    }
    if (
      /\b(?:acquerez|achetez|acquerir|acheter)\b.{0,40}\bpleine\s+propriete\b/.test(folded) &&
      !/valeur|%|retrouv|recuper|terme|issue/.test(folded)
    ) {
      reasons.push("l'acquéreur achète la nue-propriété, pas la pleine propriété");
    }
    if (
      /\b(?:habiter|emmenager|y\s+vivre|y\s+resider|occuper|vous\s+installer|residence\s+principale)\b/.test(
        folded,
      ) &&
      !/retrouv|recuper|terme|issue|echeance|\d+\s*ans|plus\s+tard|ensuite/.test(folded)
    ) {
      reasons.push("occupation du bien pendant le démembrement");
    }
  }

  return [...new Set(reasons)];
}

type AnnonceLike = { titre?: string; corps?: string };

/** Contrôle de toutes les annonces générées. */
export function collectFactIssues(
  annonces: Record<string, AnnonceLike | undefined>,
  ctx: FactsContext,
): FactIssue[] {
  const issues: FactIssue[] = [];
  for (const [platform, block] of Object.entries(annonces)) {
    if (!block) continue;
    if (block.titre) {
      for (const reason of verifySentence(block.titre, ctx)) {
        issues.push({ platform, field: "titre", sentence: block.titre, reason });
      }
    }
    for (const sentence of splitSentences(block.corps ?? "")) {
      for (const reason of verifySentence(sentence, ctx)) {
        issues.push({ platform, field: "corps", sentence, reason });
      }
    }
  }
  return issues;
}

/** Retire du corps les phrases fautives ; les titres fautifs sont signalés. */
export function stripFactIssues<T extends AnnonceLike & { compliance_warning?: boolean; compliance_violations?: string[] }>(
  platform: string,
  block: T,
  issues: FactIssue[],
): T {
  const mine = issues.filter((i) => i.platform === platform);
  if (mine.length === 0) return block;

  const badSentences = new Set(mine.filter((i) => i.field === "corps").map((i) => i.sentence));
  // Même découpage que collectFactIssues, ligne par ligne, pour conserver les paragraphes.
  const keptCorps = (block.corps ?? "")
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter((part) => part && !badSentences.has(part))
        .join(" "),
    )
    .reduce<string[]>((lines, line, index, all) => {
      if (line) lines.push(line);
      else if (all[index - 1] !== undefined && lines.length && lines[lines.length - 1] !== "") lines.push("");
      return lines;
    }, [])
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const titleIssues = mine.filter((i) => i.field === "titre");
  return {
    ...block,
    corps: keptCorps || block.corps,
    ...(titleIssues.length > 0
      ? {
          compliance_warning: true,
          compliance_violations: [
            ...(block.compliance_violations ?? []),
            ...titleIssues.map((i) => `${i.sentence} (${i.reason})`),
          ],
        }
      : {}),
  };
}

export function buildFactsCorrectionMessage(issues: FactIssue[]): string {
  const lines = [
    ...new Set(issues.map((i) => `« ${i.sentence} » → ${i.reason}`)),
  ].join("\n");
  return `CORRECTION FAITS OBLIGATOIRE : les passages suivants contiennent des informations absentes des FAITS AUTORISÉS ou contraires aux règles d'usage des faits :
${lines}
Réécris UNIQUEMENT ces passages en retirant toute information qui ne figure pas dans les faits (si besoin, supprime la phrase). Garde le reste du texte strictement identique.
Retourne le même format JSON.`;
}


/* ------------------------------------------------------------------ */
/* Hashtags                                                            */
/* ------------------------------------------------------------------ */

const GENERIC_HASHTAG =
  /^(?:immobilier\w*|programme\w*|neuf\w*|invest\w*|patrimoin\w*|nuepropriet\w*|demembrement\w*|lmnp|lmp|pinel|ptz|logement\w*|appartement\w*|achat\w*|residence\w*|vefa|primoaccedant\w*|conseilimmo|agenceimmo\w*|projetimmo\w*|proprietaire\w*|usufruit\w*)$/;

/** Retire les hashtags qui ne sont ni génériques ni présents dans les faits (fautes, lieux inventés). */
export function sanitizeHashtags(text: string, ctx: FactsContext): string {
  const compactFacts = foldText(ctx.factsText).replace(/[^a-z0-9]/g, "");
  const ville =
    foldText(ctx.factsText.match(/"ville"\s*:\s*"([^"]+)"/)?.[1] ?? "").replace(/[^a-z0-9]/g, "");

  return text
    .replace(/(^|\s)#([\p{L}\p{N}_]+)/gu, (full, lead: string, tag: string) => {
      const folded = foldText(tag).replace(/[^a-z0-9]/g, "");
      const isGeneric = GENERIC_HASHTAG.test(folded);
      const isVille = ville !== "" && (folded === ville || new RegExp(`^${ville}\\d{0,2}e?$`).test(folded));
      const inFacts = folded.length >= 4 && compactFacts.includes(folded);
      return isGeneric || isVille || inFacts ? full : lead;
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "");
}
