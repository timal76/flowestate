import { COMPLIANCE_RULES } from "@/lib/compliance";

/**
 * Extraction des données d'une plaquette promoteur (PDF) via l'API Anthropic.
 * Partagé par /api/extract-programme et /api/generate-programme-neuf.
 *
 * Garanties : cette fonction ne renvoie JAMAIS un objet vide. En cas d'échec
 * (réponse tronquée, JSON invalide, erreur API, timeout), elle lève une
 * ExtractionError avec un message exploitable côté UI.
 */

export type ExtractionErrorCode =
  | "EXTRACTION_EMPTY"
  | "EXTRACTION_TRUNCATED"
  | "EXTRACTION_TIMEOUT"
  | "EXTRACTION_UPSTREAM"
  | "EXTRACTION_OVERLOADED";

export class ExtractionError extends Error {
  code: ExtractionErrorCode;
  status: number;

  constructor(code: ExtractionErrorCode, message: string, status: number) {
    super(message);
    this.name = "ExtractionError";
    this.code = code;
    this.status = status;
  }
}

const EXTRACTION_MODEL = "claude-haiku-4-5-20251001";
/** Le JSON complet (≈60 champs + tableaux) dépasse largement 800 tokens. */
const FIRST_MAX_TOKENS = 4096;
const RETRY_MAX_TOKENS = 8192;
const ATTEMPT_TIMEOUT_MS = 35_000;
const RETRY_DELAYS_MS = [1_500, 3_000];

export const EXTRACTION_SYSTEM = `Tu es un expert en immobilier neuf français. Analyse ce document et retourne UNIQUEMENT un objet JSON brut. Commence par { et termine par }. Zéro texte avant ou après. Zéro backtick. Zéro markdown.
${COMPLIANCE_RULES}
Format exact :
{"nom":null,"promoteur":null,"ville":null,"quartier":null,"adresse":null,"types_biens":null,"surface_min":null,"surface_max":null,"nb_lots":null,"prix_min":null,"prix_max":null,"prix_type":null,"repartition":null,"dispositif":null,"tva_reduite":null,"taux_tva":null,"ptz":null,"lmnp":null,"pinel":null,"re2020":null,"garanties":null,"livraison":null,"etat_avancement":null,"date_document":null,"architecture":null,"configuration":null,"prestations":[],"domotique":null,"stationnement":null,"commerces_rdc":null,"transports":[],"commerces":[],"ecoles":[],"atouts_localisation":[],"arguments_promoteur":[],"baignoire":null,"hauteur_plafond":null,"orientation":null,"vue":null,"cuisine_equipee":null,"double_exposition":null,"ascenseur":null,"digicode":null,"interphone":null,"gardien":null,"piscine":null,"terrasse_confirmee":null,"balcon_confirme":null}
RÈGLES : Copie mot pour mot. Zéro invention. Si absent : null. Ne reformule jamais les arguments promoteur en promesses de valorisation ou de rendement.
- "dispositif" : copie la mention exacte du mode de vente ou du dispositif (nue-propriété, démembrement, LMNP, Pinel, TVA réduite, etc.) avec sa durée et ses conditions telles qu'écrites. Ne jamais le déduire.
- "repartition" : nombre de lots par typologie avec le prix tel qu'écrit, en conservant le qualificatif exact (prix moyen, à partir de, prix exact).
- "prix_type" : "minimum", "moyen" ou "exact" selon ce que le document dit de prix_min ; null si le document ne le précise pas.
- "garanties" : uniquement si le mot « garantie » est écrit dans le document, sinon null.
- "livraison" : copie la formulation et la date exactes du document, sans les convertir.
- "date_document" : date d'édition du document si elle y figure, sinon null.
- "architecture" et "configuration" : uniquement ce que le document écrit (style, matériaux, bâtiments, étages), sans qualificatif ajouté.
- "prestations" : liste exhaustive de TOUT ce qui est mentionné dans le document.
- "domotique" : note exactement le nom du système et s'il est offert ou non.
- "arguments_promoteur" : liste les angles marketing utilisés.
- "baignoire" : null sauf si le mot « baignoire » est explicitement écrit dans le document.
- "hauteur_plafond" : null sauf si une hauteur précise est indiquée.
- "orientation" : null sauf si une orientation cardinale (sud, nord, est, ouest) est explicitement indiquée.
- "vue" : null sauf si une vue est explicitement garantie dans le document.
- "cuisine_equipee" : null sauf si les équipements sont listés comme inclus (pas optionnels).
- "ascenseur" : null sauf si explicitement mentionné.
- "terrasse_confirmee" : copie exactement le terme utilisé (terrasse ou balcon).
- Zéro invention, zéro interprétation, zéro extrapolation.`;

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string;
  error?: { message?: string; type?: string };
  message?: string;
};

/** Parse tolérant : retire les backticks, prend du premier { au dernier }. */
export function parseExtractionJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

const USEFUL_KEYS = [
  "nom",
  "ville",
  "adresse",
  "types_biens",
  "prix_min",
  "prix_max",
  "dispositif",
  "repartition",
  "nb_lots",
] as const;

/** Une extraction est exploitable si au moins un champ d'identification est renseigné. */
export function isUsefulExtraction(data: Record<string, unknown> | null): boolean {
  if (!data) return false;
  return USEFUL_KEYS.some((key) => {
    const value = data[key];
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AttemptOutcome =
  | { kind: "ok"; text: string; truncated: boolean }
  | { kind: "retryable"; error: ExtractionError }
  | { kind: "fatal"; error: ExtractionError };

async function attemptExtraction(
  apiKey: string,
  pdfBase64: string,
  maxTokens: number,
): Promise<AttemptOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: EXTRACTION_MODEL,
        max_tokens: maxTokens,
        system: EXTRACTION_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              { type: "text", text: "Extrais toutes les informations. Retourne uniquement le JSON." },
            ],
          },
        ],
      }),
    });

    let json: AnthropicResponse = {};
    try {
      json = (await response.json()) as AnthropicResponse;
    } catch {
      // corps non JSON : traité via le statut HTTP ci-dessous
    }

    if (!response.ok) {
      const message = `${json.error?.message ?? ""} ${json.message ?? ""}`.toLowerCase();
      const overloaded =
        response.status === 529 || message.includes("overloaded") || json.error?.type === "overloaded_error";
      const retryable = overloaded || response.status === 429 || response.status >= 500;
      console.error("[extract-programme] Anthropic error", response.status, json.error?.message);

      const error = new ExtractionError(
        overloaded ? "EXTRACTION_OVERLOADED" : "EXTRACTION_UPSTREAM",
        overloaded
          ? "Le service est momentanément surchargé. Réessayez dans quelques secondes."
          : response.status === 400
            ? "Impossible d'analyser ce PDF. Vérifiez qu'il n'est pas protégé ou corrompu, ou utilisez un PDF plus léger."
            : "Impossible d'analyser la plaquette pour le moment. Réessayez.",
        overloaded ? 529 : response.status === 400 ? 422 : 502,
      );
      return retryable ? { kind: "retryable", error } : { kind: "fatal", error };
    }

    const text =
      json.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("")
        .trim() ?? "";

    return { kind: "ok", text, truncated: json.stop_reason === "max_tokens" };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error("[extract-programme] attempt failed:", aborted ? "timeout" : err);
    return {
      kind: "retryable",
      error: new ExtractionError(
        aborted ? "EXTRACTION_TIMEOUT" : "EXTRACTION_UPSTREAM",
        aborted
          ? "L'analyse de la plaquette a pris trop de temps. Réessayez ou utilisez un PDF plus léger."
          : "Impossible d'analyser la plaquette pour le moment. Réessayez.",
        aborted ? 504 : 502,
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extrait les données de la plaquette. Au plus 3 tentatives :
 * - erreurs temporaires (429, 5xx, 529, timeout) : nouvelle tentative après une pause ;
 * - réponse tronquée ou JSON invalide : nouvelle tentative avec plus de tokens.
 * Lève ExtractionError si aucune tentative ne produit de données exploitables.
 */
export async function extractProgrammeFromPdfBase64(
  apiKey: string,
  pdfBase64: string,
): Promise<Record<string, unknown>> {
  const maxAttempts = 1 + RETRY_DELAYS_MS.length;
  let lastError: ExtractionError | null = null;
  let maxTokens = FIRST_MAX_TOKENS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]);

    const outcome = await attemptExtraction(apiKey, pdfBase64, maxTokens);

    if (outcome.kind === "fatal") throw outcome.error;
    if (outcome.kind === "retryable") {
      lastError = outcome.error;
      continue;
    }

    const parsed = parseExtractionJson(outcome.text);
    if (parsed && isUsefulExtraction(parsed)) {
      console.log(
        "[extract-programme] ok, keys:",
        Object.keys(parsed).length,
        "nom:",
        parsed.nom,
        "ville:",
        parsed.ville,
      );
      return parsed;
    }

    console.error(
      "[extract-programme] unusable output (truncated:",
      outcome.truncated,
      ") raw:",
      outcome.text.slice(0, 300),
    );
    maxTokens = RETRY_MAX_TOKENS;
    lastError = new ExtractionError(
      outcome.truncated ? "EXTRACTION_TRUNCATED" : "EXTRACTION_EMPTY",
      "Impossible d'analyser la plaquette, réessayez ou utilisez un PDF plus léger.",
      422,
    );
  }

  throw (
    lastError ??
    new ExtractionError(
      "EXTRACTION_EMPTY",
      "Impossible d'analyser la plaquette, réessayez ou utilisez un PDF plus léger.",
      422,
    )
  );
}
