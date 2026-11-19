import { buildFactsContext, buildFactsPrompt, verifySentence } from "../lib/programme-facts";
import { collectSearchUrls, validateExternalFacts, normalizeUrl } from "../lib/web-enrichment";

let failures = 0;
function check(name: string, ok: boolean) {
  if (ok) console.log(`OK ${name}`);
  else {
    failures += 1;
    console.log(`FAIL ${name}`);
  }
}

const apiJson = {
  content: [
    {
      type: "web_search_tool_result",
      content: [
        { type: "web_search_result", url: "https://www.paris.fr/pages/parc-monceau-1234/", title: "Parc Monceau - Paris.fr" },
        { type: "web_search_result", url: "https://www.iledefrance-mobilites.fr/lignes", title: "Île-de-France Mobilités" },
      ],
    },
    {
      type: "text",
      text: "...",
      citations: [{ url: "https://marches.paris.fr/levis", title: "Marché de la rue de Lévis" }],
    },
  ],
};

const urls = collectSearchUrls(apiJson);
check("collecte les URLs des résultats et des citations", urls.size === 3);
check("normalisation www et slash final", normalizeUrl("https://www.paris.fr/pages/parc-monceau-1234/") === "paris.fr/pages/parc-monceau-1234");

const parsed = {
  faits: [
    { fait: "Le parc Monceau est un jardin public du 17e arrondissement ouvert au public.", source_nom: "Paris.fr", source_url: "https://paris.fr/pages/parc-monceau-1234" },
    { fait: "Le marché de la rue de Lévis a lieu tous les jours sauf le lundi.", source_nom: "Marchés de Paris", source_url: "https://marches.paris.fr/levis" },
    { fait: "Source inventée par le modèle.", source_nom: "Blog", source_url: "https://blog-inexistant.example/page" },
    { fait: "Le prix au m² dans le quartier dépasse 11 000 €.", source_nom: "Paris.fr", source_url: "https://paris.fr/pages/parc-monceau-1234" },
    { fait: "Le parc Monceau est un jardin public du 17e arrondissement ouvert au public.", source_nom: "Paris.fr", source_url: "https://paris.fr/pages/parc-monceau-1234" },
    { fait: "Le meilleur lycée de l'arrondissement est à proximité.", source_nom: "Paris.fr", source_url: "https://paris.fr/pages/parc-monceau-1234" },
  ],
};
const { kept, rejected } = validateExternalFacts(parsed, urls);
check("garde les 2 faits sourcés valides", kept.length === 2);
check("écarte source inconnue, prix au m², doublon, classement", rejected === 4);
check("l'URL conservée est celle réellement consultée", kept[0].sourceUrl === "https://www.paris.fr/pages/parc-monceau-1234/");

const ctx = buildFactsContext({
  extractedData: { nom: "Patio Villiers", ville: "Paris" },
  externalFacts: kept,
  now: new Date("2026-11-19T10:00:00Z"),
});
check("le prompt contient les faits externes et leur source", buildFactsPrompt(ctx, "{}").includes("FAITS EXTERNES VÉRIFIÉS") && buildFactsPrompt(ctx, "{}").includes("source : Paris.fr"));
check("un fait externe sourcé n'est pas signalé", verifySentence("Le marché de la rue de Lévis a lieu tous les jours sauf le lundi.", ctx).length === 0);
check("un fait non sourcé est toujours signalé", verifySentence("Le parc se trouve à 12 minutes à pied.", ctx).length > 0);

const ctxEmpty = buildFactsContext({ extractedData: { nom: "Patio Villiers" }, now: new Date("2026-11-19T10:00:00Z") });
check("sans faits externes, pas de bloc dans le prompt", !buildFactsPrompt(ctxEmpty, "{}").includes("issus de pages web consultées"));

if (failures) {
  console.log(`\n${failures} échec(s)`);
  process.exit(1);
}
console.log("\nTous les tests web-enrichment passent.");
