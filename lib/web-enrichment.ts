/**
 * Enrichissement externe vérifiable : l'agent accepte que l'annonce contienne des informations
 * absentes de la plaquette, à condition qu'elles soient exactes et sourcées.
 * Un fait externe n'est retenu que si son URL figure parmi les pages réellement renvoyées par la
 * recherche web (le modèle ne peut donc pas inventer une source).
 */

export type ExternalFact = { fact: string; sourceName: string; sourceUrl: string };

type ContentBlock = {
  type?: string;
  text?: string;
  url?: string;
  title?: string;
  content?: unknown;
  citations?: Array<{ url?: string; title?: string }>;
};

const MAX_FACTS = 12;
const MAX_FACT_LENGTH = 240;
const MIN_FACT_LENGTH = 12;

/** Faits écartés même sourcés : chiffres de marché, avis, classements, projections. */
const FORBIDDEN_IN_FACT =
  /(?:€|euros?)\s*(?:\/|par)\s*m|prix\s+(?:au|du)\s+m|rendement|rentabilit|taux\s+d'interet|plus-value|valoris|classement|meilleur|avis\s+(?:des|clients)|investisseurs?\s+(?:recherch|plebiscit)/;

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.hostname.replace(/^www\./, "")}${path}`.toLowerCase();
  } catch {
    return "";
  }
}

/** URLs réellement renvoyées par l'outil de recherche web (résultats et citations). */
export function collectSearchUrls(json: { content?: ContentBlock[] }): Map<string, { url: string; title: string }> {
  const urls = new Map<string, { url: string; title: string }>();
  const add = (url?: string, title?: string) => {
    if (!url) return;
    const key = normalizeUrl(url);
    if (key && !urls.has(key)) urls.set(key, { url, title: title ?? "" });
  };

  for (const block of json.content ?? []) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content as ContentBlock[]) {
        if (result?.type === "web_search_result") add(result.url, result.title);
      }
    }
    for (const citation of block.citations ?? []) add(citation.url, citation.title);
  }
  return urls;
}

type RawFact = { fait?: unknown; source_nom?: unknown; source_url?: unknown };

/** Garde uniquement les faits dont la source a réellement été consultée. */
export function validateExternalFacts(
  parsed: unknown,
  searchUrls: Map<string, { url: string; title: string }>,
): { kept: ExternalFact[]; rejected: number } {
  const list: RawFact[] = Array.isArray(parsed)
    ? (parsed as RawFact[])
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { faits?: unknown }).faits)
      ? ((parsed as { faits: RawFact[] }).faits)
      : [];

  const kept: ExternalFact[] = [];
  const seen = new Set<string>();
  let rejected = 0;

  for (const item of list) {
    const fact = typeof item?.fait === "string" ? item.fait.trim() : "";
    const sourceUrl = typeof item?.source_url === "string" ? item.source_url.trim() : "";
    const match = searchUrls.get(normalizeUrl(sourceUrl));
    const folded = fold(fact);

    const valid =
      fact.length >= MIN_FACT_LENGTH &&
      fact.length <= MAX_FACT_LENGTH &&
      Boolean(match) &&
      !FORBIDDEN_IN_FACT.test(folded) &&
      !seen.has(folded);

    if (!valid) {
      rejected += 1;
      continue;
    }
    seen.add(folded);
    const sourceName =
      typeof item?.source_nom === "string" && item.source_nom.trim()
        ? item.source_nom.trim()
        : match?.title || new URL(match!.url).hostname;
    kept.push({ fact, sourceName, sourceUrl: match!.url });
    if (kept.length >= MAX_FACTS) break;
  }

  return { kept, rejected };
}

export function buildEnrichmentPrompt(location: string): string {
  return `Tu prépares des faits vérifiables sur l'environnement d'un programme immobilier neuf, pour une annonce.

LOCALISATION : ${location}

Utilise la recherche web (plusieurs requêtes) et ne retiens que ce que tu as lu dans les pages trouvées. Cherche :
1. Transports : lignes de métro, RER, tramway, bus et stations proches (nom exact)
2. Équipements publics : parcs et jardins, écoles, collèges, lycées, crèches, piscines, bibliothèques, équipements sportifs et culturels (nom exact)
3. Commerces et marchés du quartier (nom exact, jours de marché si la source les donne)
4. Projets urbains officiels en cours ou programmés dans le secteur, uniquement si une source institutionnelle (ville, métropole, région, État) les décrit

RÈGLES :
- Chaque fait tient en une phrase courte et précise, reformulée à partir de la source, sans copier de passage.
- source_url : l'URL exacte d'une page que tu as consultée. Un fait sans page consultée est supprimé.
- Distances et durées à pied : seulement si la source les indique. Ne les calcule pas.
- Interdits : prix au m², rendements, évolution de marché, classements, avis, superlatifs, promesses, tout ce que tu n'as pas lu.
- Privilégie les sources officielles ou institutionnelles (mairie, transporteur, ministère, métropole), puis les sources de référence.
- 6 à 12 faits au maximum, les plus utiles pour une annonce.

Réponds uniquement avec ce JSON, sans markdown :
{"faits":[{"fait":"...","source_nom":"...","source_url":"https://..."}]}`;
}

export function formatExternalFactsBlock(facts: ExternalFact[]): string {
  if (!facts.length) return "";
  return facts
    .map((f, i) => `${i + 1}. ${f.fact} (source : ${f.sourceName})`)
    .join("\n");
}
