import { buildJudgeInput, parseJudgeOutput } from "../lib/fact-judge";
import { stripFactIssues } from "../lib/programme-facts";

let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) console.log(`OK ${name}`);
  else {
    failed++;
    console.log(`FAIL ${name}`);
  }
}

const annonces = {
  seloger: {
    titre: "Nue-propriété Paris 17e",
    corps: "Vous achetez à 61 % de la valeur en pleine propriété.\n\nPendant 20 ans, vous êtes propriétaire du sol et des murs. Ascenseur et local à vélos.",
  },
  instagram: { titre: "Patrimoine parisien", corps: "Une répartition équilibrée des typologies." },
};

const { message, index } = buildJudgeInput("FAIT: nue-propriété 20 ans", annonces);
check("chaque phrase reçoit un identifiant", index.size === 6 && message.includes("[seloger.corps.2]") && message.includes("[instagram.titre]"));

const raw = `{"problemes":[{"id":"seloger.corps.2","raison":"rôle juridique inexact"},{"id":"instagram.corps.1","raison":"qualificatif"},{"id":"inconnu.corps.9","raison":"x"},{"id":"seloger.corps.2","raison":"doublon"}]}`;
const issues = parseJudgeOutput(raw, index);
check("ignore les identifiants inconnus et les doublons", issues.length === 2);
check("retrouve la phrase exacte", issues[0].sentence.startsWith("Pendant 20 ans"));

check("sortie invalide : aucun écart, pas d'exception", parseJudgeOutput("pas du json", index).length === 0);
check("sortie vide conforme", parseJudgeOutput('{"problemes":[]}', index).length === 0);

const stripped = stripFactIssues("seloger", annonces.seloger, issues);
check(
  "retrait de la phrase fautive en gardant le reste et les paragraphes",
  !stripped.corps.includes("propriétaire du sol") &&
    stripped.corps.includes("Ascenseur et local à vélos") &&
    stripped.corps.includes("61 %") &&
    stripped.corps.includes("\n\n"),
);

if (failed) {
  console.log(`\n${failed} échec(s)`);
  process.exit(1);
}
console.log("\nTous les tests fact-judge passent.");
