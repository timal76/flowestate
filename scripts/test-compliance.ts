/**
 * Script de vérification findViolations (Programmes neufs).
 * Usage: npx tsx scripts/test-compliance.ts
 */
import {
  findViolations,
} from "../lib/compliance";

const MUST_DETECT = [
  "valorisation patrimoniale assurée",
  "Un placement sûr en cœur de capitale avec forte demande",
  "garantissant une valorisation long terme et une forte demande locative",
  "stabilité rare",
  "demande locative reste soutenue toute l'année",
];

const MUST_PASS = [
  "Un programme de 41 logements pensé pour attirer des profils locataires variés",
  "Situé à 5 minutes à pied du métro Villiers",
  "Les dispositifs fiscaux applicables méritent d'être étudiés avec votre conseiller",
  "Bien couvert par la garantie décennale du constructeur",
];

let failed = 0;

for (const phrase of MUST_DETECT) {
  const hits = findViolations(phrase);
  if (hits.length === 0) {
    console.error(`FAIL detect: ${JSON.stringify(phrase)}`);
    failed++;
  } else {
    console.log(`OK detect (${hits.length}): ${JSON.stringify(phrase)}`);
  }
}

for (const phrase of MUST_PASS) {
  const hits = findViolations(phrase);
  if (hits.length > 0) {
    console.error(`FAIL pass: ${JSON.stringify(phrase)} → ${JSON.stringify(hits)}`);
    failed++;
  } else {
    console.log(`OK pass: ${JSON.stringify(phrase)}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\nAll compliance checks passed.");
