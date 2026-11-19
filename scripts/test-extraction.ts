/**
 * Non-régression : l'extraction ne renvoie jamais un objet vide et gère les erreurs temporaires.
 * L'API Anthropic est simulée (fetch mocké). Usage: npx tsx scripts/test-extraction.ts
 */
import {
  ExtractionError,
  extractProgrammeFromPdfBase64,
  isUsefulExtraction,
  parseExtractionJson,
} from "../lib/programme-extraction";

let failed = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`OK ${name}`);
  } else {
    console.error(`FAIL ${name}`, detail ?? "");
    failed++;
  }
}

const VALID = JSON.stringify({ nom: "Patio Villiers", ville: "Paris", prestations: [], dispositif: "nue-propriété" });
// Réponse coupée par max_tokens : un tableau interne se ferme mais pas l'objet
const TRUNCATED = '{"nom":"Patio Villiers","ville":"Paris","prestations":["a","b"],"transports":["metro 3';

// 1) Parsing
check("parse: JSON complet", parseExtractionJson(VALID)?.nom === "Patio Villiers");
check("parse: réponse tronquée => null", parseExtractionJson(TRUNCATED) === null);
check("parse: backticks tolérés", parseExtractionJson("```json\n" + VALID + "\n```")?.ville === "Paris");
check("useful: {} => false", !isUsefulExtraction({}));
check("useful: uniquement des null => false", !isUsefulExtraction({ nom: null, ville: null, prestations: [] }));
check("useful: nom renseigné => true", isUsefulExtraction({ nom: "X" }));

// 2) Scénarios API simulés
type Reply = { status: number; body: unknown };
function mockFetch(replies: Reply[]) {
  const calls: Array<{ max_tokens?: number }> = [];
  globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
    const reply = replies[Math.min(calls.length, replies.length - 1)];
    calls.push({ max_tokens: init?.body ? JSON.parse(init.body).max_tokens : undefined });
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return calls;
}
const ok = (text: string, stop_reason = "end_turn"): Reply => ({
  status: 200,
  body: { content: [{ type: "text", text }], stop_reason },
});

async function main() {
  {
    const calls = mockFetch([ok(VALID)]);
    const data = await extractProgrammeFromPdfBase64("k", "AAAA");
    check("extraction OK du premier coup", data.nom === "Patio Villiers" && calls.length === 1);
    check("max_tokens initial >= 4096 (plus 800)", (calls[0].max_tokens ?? 0) >= 4096, calls[0]);
  }
  {
    const calls = mockFetch([ok(TRUNCATED, "max_tokens"), ok(VALID)]);
    const data = await extractProgrammeFromPdfBase64("k", "AAAA");
    check(
      "réponse tronquée => nouvelle tentative avec plus de tokens",
      data.nom === "Patio Villiers" && calls.length === 2 && (calls[1].max_tokens ?? 0) > (calls[0].max_tokens ?? 0),
      calls,
    );
  }
  {
    const calls = mockFetch([{ status: 529, body: { error: { type: "overloaded_error", message: "Overloaded" } } }, ok(VALID)]);
    const data = await extractProgrammeFromPdfBase64("k", "AAAA");
    check("529 puis succès => retry", data.nom === "Patio Villiers" && calls.length === 2);
  }
  {
    const calls = mockFetch([ok(TRUNCATED, "max_tokens")]);
    let error: unknown;
    try {
      await extractProgrammeFromPdfBase64("k", "AAAA");
    } catch (e) {
      error = e;
    }
    check(
      "toujours tronqué => erreur explicite, jamais {}",
      error instanceof ExtractionError && error.status === 422 && calls.length === 3,
      error,
    );
  }
  {
    const calls = mockFetch([ok("{}")]);
    let error: unknown;
    try {
      await extractProgrammeFromPdfBase64("k", "AAAA");
    } catch (e) {
      error = e;
    }
    check("objet vide => erreur, pas de 200 vide", error instanceof ExtractionError && calls.length === 3, error);
  }
  {
    const calls = mockFetch([{ status: 400, body: { error: { message: "invalid pdf" } } }]);
    let error: unknown;
    try {
      await extractProgrammeFromPdfBase64("k", "AAAA");
    } catch (e) {
      error = e;
    }
    check("400 => erreur immédiate sans retry", error instanceof ExtractionError && calls.length === 1, error);
  }

  if (failed > 0) {
    console.error(`\n${failed} échec(s)`);
    process.exit(1);
  }
  console.log("\nTous les tests extraction passent.");
}

void main();
