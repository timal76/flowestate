/**
 * Règles anti-promesses pour Programmes neufs.
 * À injecter dans tous les prompts Anthropic (génération, suggest-angles, extract).
 */

export const COMPLIANCE_RULES = `RÈGLES DE CONFORMITÉ — ANTI-PROMESSES (ABSOLUES, ZÉRO EXCEPTION) :

PRINCIPE : Ne jamais promettre, garantir, assurer ni présenter comme certain(e) :
- la valorisation, la plus-value ou l'évolution des prix
- le rendement, la rentabilité ou le revenu locatif
- la facilité / rapidité de revente
- le niveau de demande locative (soutenue, forte, permanente, toute l'année…)
- un avantage fiscal concret (montant, éligibilité, économie d'impôt)

PRINCIPE — STABILITÉ / PÉRENNITÉ DE LA VALEUR : Ne jamais qualifier l'évolution future
de la valeur du bien (ni du quartier, ni de l'investissement) par un adjectif suggérant
la sécurité, la stabilité ou la pérennité — même sans le mot "garanti" ou "assuré".
Interdit notamment : pérenne, stable, durable, solide, sécurisé, fiable, constant, sûr,
lorsqu'ils portent sur la valorisation, l'investissement, le placement, la valeur, le prix
ou le rendement (ex. "investissement pérenne", "valorisation stable", "placement solide").
Seuls des faits vérifiables et PRÉSENTS peuvent être décrits (proximité de commerces,
calme du quartier, état du bien, prestations). Jamais une prédiction ni une garantie
implicite sur la valeur future.

Interdit également : "sans risque", "aucun/zéro risque", "placement/investissement sûr ou sécurisé",
"valeur refuge", "à l'abri", "à coup sûr", "stabilité rare/patrimoniale assurée", et toute formulation
équivalente même reformulée.

CE QUI EST AUTORISÉ : décrire le bien, l'emplacement, les prestations, la cible et le contexte
avec un langage QUALIFIÉ uniquement :
- "pensé pour", "peut convenir à", "susceptible d'intéresser", "orienté vers"
- "les dispositifs fiscaux applicables sont à étudier avec votre conseiller"
- "secteur établi", "quartier reconnu", "localisation recherchée"
- "potentiel locatif à confirmer avec votre conseiller"

Ne jamais transformer un angle marketing ou un profil cible en fait de marché ou en promesse.
La "garantie décennale" (mention légale constructeur) reste autorisée ; toute autre "garantie" est interdite.`;

/** Repli accentué → ASCII pour matching insensible aux accents. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Marque les "sûr/sûre/sûrs/sûres" accentués avant le fold, pour les distinguer
 * de "sur" (préposition) après suppression des accents.
 */
const SUR_SAFE_TOKEN = "sursafemarker";

function foldPreservingSurSafe(text: string): string {
  // Token ASCII word-safe pour préserver \b après fold (évite confusion avec "sur").
  return fold(text.replace(/s[ûúù]r(e|es|s)?\b/gi, `${SUR_SAFE_TOKEN}$1`));
}

type PatternDef = {
  re: RegExp;
  /** Ignore les matchs suivis de "decennale" (garantie décennale autorisée). */
  skipDecennale?: boolean;
};

/** "sur" sans accent = "sûr" seulement si suivi d'une frontière de sens (pas "sur le/plan/…"). */
const SUR_SAFE_BOUNDARY = `(?=\\s*(?:en|avec|pour|dans|[,.!?;:]|$))`;

/** Cibles économiques (texte foldé, sans accents). */
const VALUE_NOUN =
  "(?:valorisation|investissement|placement|rendement|prix|valeur(?:\\s+du\\s+bien)?)";

/** Adjectifs de stabilité / pérennité (texte foldé). */
const STABILITY_ADJ =
  `(?:perenne|stable|durable|solide|securis(?:e|es|ee|ees)?|fiable|constante?|${SUR_SAFE_TOKEN})`;

/** Au plus un mot intercalé entre nom et adjectif (texte foldé). */
const NEAR = "\\w*\\s*";

const VIOLATION_PATTERNS: PatternDef[] = [
  { re: /\bassure(?:e|es|s)?\b/g },
  { re: /\bgarant(?:ie|ies|i|issant|it)\b/g, skipDecennale: true },
  { re: /\bsans\s+risque\b/g },
  { re: /\baucun\s+risque\b/g },
  { re: /\bzero\s+risque\b/g },
  { re: new RegExp(`\\bplacement\\s+${SUR_SAFE_TOKEN}(?:e|es|s)?\\b`, "g") },
  { re: /\bplacement\s+securis(?:e|es|ee|ees)?\b/g },
  { re: new RegExp(`\\binvestissement\\s+${SUR_SAFE_TOKEN}(?:e|es|s)?\\b`, "g") },
  { re: /\binvestissement\s+securis(?:e|es|ee|ees)?\b/g },
  { re: new RegExp(`\\bplacement\\s+surs?\\b${SUR_SAFE_BOUNDARY}`, "g") },
  { re: new RegExp(`\\binvestissement\\s+surs?\\b${SUR_SAFE_BOUNDARY}`, "g") },
  { re: /\bvaleur\s+refuge\b/g },
  { re: /\ba\s+l['']abri\b/g },
  { re: new RegExp(`\\ba\\s+coup\\s+${SUR_SAFE_TOKEN}\\b`, "g") },
  { re: /\ba\s+coup\s+sur\b/g },
  { re: /\bcertaines?\s+de\s+se\s+valoriser\b/g },
  {
    re: /\bvalorisation\s+(?:patrimoniale\s+)?(?:assuree?|garanties?|certaines?|naturelle?)\b/g,
  },
  { re: /\brendement\s+(?:garanti|assure|certain)\b/g },
  { re: /\bplus[- ]values?\s+(?:garanties?|assuree?s?|certaines?)\b/g },
  { re: /\bstabilite\s+(?:rare|patrimoniale(?:\s+solide)?)\b/g },
  { re: /\bdemande\s+locative\s+(?:reste\s+)?soutenue\b/g },
  { re: /\bforte\s+demande\s+locative\b/g },
  // Promesses implicites : stabilité/pérennité appliquée à la valeur / l'investissement (2 ordres)
  { re: new RegExp(`\\b${VALUE_NOUN}\\s+${NEAR}${STABILITY_ADJ}\\b`, "g") },
  { re: new RegExp(`\\b${STABILITY_ADJ}\\s+${NEAR}${VALUE_NOUN}\\b`, "g") },
];

function sentenceHasViolation(foldedSentence: string): boolean {
  for (const { re, skipDecennale } of VIOLATION_PATTERNS) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(foldedSentence)) !== null) {
      if (skipDecennale) {
        const after = foldedSentence.slice(
          match.index + match[0].length,
          match.index + match[0].length + 20,
        );
        if (/^\s*decennale/.test(after)) continue;
      }
      return true;
    }
  }
  return false;
}

/** Découpe en phrases (ponctuation / retours ligne). */
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+|\n+/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Détecte les formulations de promesse / garantie dans un texte.
 * Insensible à la casse et aux accents. Retourne les phrases fautives (dédupliquées).
 */
export function findViolations(text: string): string[] {
  if (!text?.trim()) return [];

  const found: string[] = [];
  const seen = new Set<string>();

  const sentences = splitSentences(text);
  const units = sentences.length > 0 ? sentences : [text.trim()];

  for (const sentence of units) {
    const foldedSentence = foldPreservingSurSafe(sentence);
    if (!sentenceHasViolation(foldedSentence)) continue;
    const key = fold(sentence);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(sentence.trim());
  }

  return found;
}

/** Retire les phrases contenant des violations (nettoyage angle / profil). */
export function stripViolations(text: string): string {
  if (!text?.trim()) return text ?? "";
  const violations = findViolations(text);
  if (violations.length === 0) return text.trim();

  let result = text;
  for (const phrase of violations) {
    result = result.split(phrase).join(" ");
  }
  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

export function buildComplianceCorrectionMessage(violations: string[]): string {
  const cited = violations.map((v) => `« ${v} »`).join(", ");
  return `CORRECTION CONFORMITÉ OBLIGATOIRE : le texte contient des promesses interdites : ${cited}.
Réécris UNIQUEMENT ces passages sans aucune promesse ni garantie (valeur, rendement, revente, demande locative, fiscalité).
Garde le reste du texte strictement identique. Respecte les règles de conformité anti-promesses.
Retourne le même format JSON.`;
}

/** Collecte titre+corps d'un bloc annonce pour scan compliance. */
export function annonceText(block: { titre?: string; corps?: string } | null | undefined): string {
  if (!block) return "";
  return `${block.titre ?? ""}\n${block.corps ?? ""}`.trim();
}
