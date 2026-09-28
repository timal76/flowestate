/**
 * Vérifie qu'une saisie de prix n'est jamais tronquée / décrémentée.
 * Usage: npx tsx scripts/test-price-input.ts
 */
import { formatPriceEuros, sanitizePriceDigits } from "../lib/price-input";

const SAMPLES = ["1200000", "1500000", "2500000", "999999", "299000"];

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed++;
  } else {
    console.log(`OK: ${msg}`);
  }
}

// Simulation onChange: chaque frappe successive doit conserver les chiffres tapés
function simulateTyping(sequence: string): string {
  let value = "";
  for (const ch of sequence) {
    value = sanitizePriceDigits(value + ch);
  }
  return value;
}

assert(simulateTyping("1200000") === "1200000", 'saisie "1200000" reste "1200000"');
assert(simulateTyping("1200000") !== "1199999", 'saisie "1200000" ne devient pas "1199999"');

for (const sample of SAMPLES) {
  assert(sanitizePriceDigits(sample) === sample, `sanitize conserve ${sample}`);
  assert(
    sanitizePriceDigits(sample).length === sample.length,
    `aucune troncature de longueur pour ${sample}`,
  );
}

const formatted = formatPriceEuros("1200000");
assert(
  formatted === "1 200 000 €" || formatted === "1 200 000 €",
  `formatPriceEuros("1200000") → "1 200 000 €" (got ${JSON.stringify(formatted)})`,
);

assert(
  formatPriceEuros("299000") === "299 000 €" || formatPriceEuros("299000") === "299 000 €",
  `formatPriceEuros("299000") conserve le format existant (got ${JSON.stringify(formatPriceEuros("299000"))})`,
);

// Pas de clamp silencieux sur de très grands montants
assert(sanitizePriceDigits("99999999") === "99999999", "pas de plafond silencieux à 8 chiffres");
assert(sanitizePriceDigits("1 200 000 €") === "1200000", "nettoie espaces et symbole €");

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nAll price-input checks passed.");
