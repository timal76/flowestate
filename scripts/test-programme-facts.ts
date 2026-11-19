/**
 * Non-régression : vérification des annonces Programmes neufs par rapport aux faits.
 * Fixture : Patio Villiers (Paris 17e, vente 100 % en nue-propriété).
 * Les phrases « MUST_FLAG » sont des erreurs réellement produites par le générateur.
 * Usage: npx tsx scripts/test-programme-facts.ts
 */
import {
  buildFactsContext,
  buildFactsPrompt,
  collectFactIssues,
  parseDeliveryEnd,
  sanitizeHashtags,
  stripFactIssues,
  verifySentence,
} from "../lib/programme-facts";

const NOW = new Date("2026-11-18T12:00:00Z");

const EXTRACTED = {
  nom: "Patio Villiers",
  ville: "Paris",
  quartier: "17e arrondissement, Plaine-Monceau",
  adresse: "13 rue Lebouteux, 75017 Paris",
  types_biens: ["Studio", "2 pièces", "4 pièces"],
  nb_lots: 41,
  prix_min: 326500,
  prix_max: 743600,
  dispositif:
    "Vente exclusivement en nue-propriété, démembrement de 20 ans, usufruit locatif social confié à un gestionnaire, pleine propriété récupérée à l'issue, acquisition à 61 % de la valeur en pleine propriété, revente possible à tout moment",
  repartition:
    "36 studios (prix moyen 326 500 €), 4 deux-pièces (prix moyen 360 000 €), 1 quatre-pièces (743 600 €)",
  configuration: "Le quatre-pièces dispose d'une terrasse de 35 m²",
  livraison: "Début de l'usufruit au 3e trimestre 2026",
};

const ctx = buildFactsContext({
  extractedData: EXTRACTED,
  additionalInfo: "Métro Villiers à 5 minutes, parc Monceau à proximité. Chauffage : pompe à chaleur individuelle pour les studios du R+6, chauffage individuel électrique pour les autres logements.",
  priceFrom: "326 500 € (prix moyen d'un studio en nue-propriété)",
  now: NOW,
});

const MUST_FLAG: Array<[string, string]> = [
  ["Garantie décennale du constructeur incluse.", "garantie"],
  ["Un gestionnaire agréé s'occupe de tout.", "agréé"],
  ["Une façade haussmannienne au cœur de la Plaine-Monceau.", "haussmann"],
  ["Aucun appel de fonds imprévisible.", "appels de fonds"],
  ["Un bien qui sort de l'assiette de l'ISF.", "ISF"],
  ["Pourquoi maintenant ? Un programme rare.", "formule"],
  ["Vous acquérez la pleine propriété du bien.", "nue-propriété"],
  ["Livraison début 2026.", "date de livraison"],
  ["Des studios à partir de 326 500 €.", "prix moyen"],
  ["À 40 ans, vous préparez l'avenir.", "40 ans"],
  ["Une terrasse de 40 m² pour le quatre-pièces.", "40 m"],
  ["Des appartements à 420 000 €.", "420000"],
  ["Un rendement attractif pour votre patrimoine.", "rendement"],
  ["Vous pourrez y habiter dès la livraison.", "occupation"],
  ["En 2046 vous retrouvez la pleine propriété.", "2046"],
  ["Programme livré en 2024.", "année passée"],
  ["Usufruit débute au 3e trimestre 2026.", "date de livraison"],
  ["Parquet, chauffage écologique, ascenseur et accès sécurisé dans chaque unité.", "chaque logement"],
  ["Chaque logement : parquet contrecollé, kitchenette, pompe à chaleur.", "chaque logement"],
  ["Une opportunité unique en démembrement.", "rareté"],
  ["Les meilleurs lycées parisiens à proximité.", "qualificatif"],
  ["Une architecture raffinée et intemporelle.", "qualificatif"],
  ["Eau chaude collective optimisée.", "qualificatif"],
  ["Un patio privé au cœur de l'îlot.", "qualificatif"],
  ["Vous êtes un investisseur fortement imposé en quête de patrimoine.", "profil"],
  ["Une approche novatrice du patrimoine.", "qualificatif"],
  ["Nue-propriété Paris 17e, 61% moins cher, 20 ans.", "décote"],
  ["Vous achetez la nue-propriété à un prix réduit de 61% par rapport à la pleine propriété.", "décote"],
  ["Une décote substantielle (61 %) sur la pleine propriété.", "décote"],
  ["Cette structure reflète une réduction d'environ 61% par rapport à la pleine propriété.", "décote"],
  ["Un ascenseur desservant tous les étages.", "desserte"],
  ["Chauffage pompe à chaleur, eau chaude collective, ascenseur.", "pompe à chaleur"],
  ["Un gestionnaire spécialisé gère l'usufruit.", "qualificatif"],
  ["Un quartier établi où les familles s'ancrent durablement.", "qualificatif"],
  ["Vous restituez la pleine propriété à l'issue du démembrement.", "restitu"],
  ["Studios, 2 pièces et 4 pièces avec kitchenette pour les studios, chauffage par pompe à chaleur, eau chaude collective.", "pompe à chaleur"],
  ["Une résidence pensée pour les investisseurs patrimoniaux.", "profil"],
  ["Occultation par stores motorisés (manuels ou électriques).", "manœuvre"],
  ["Accès rapide aux aéroports régionaux.", "formule"],
  ["Aucun appel de charge surprise.", "formule"],
  ["Prestations soignées et de qualité.", "qualificatif"],
  ["L'usufruit est confié à un gestionnaire spécialisé.", "qualificatif"],
  ["Pendant 20 ans, vous êtes propriétaire du sol et des murs.", "rôle juridique"],
  ["Vous devenez propriétaire à 61 % de la valeur en pleine propriété.", "rôle juridique"],
  ["Répartition équilibrée des typologies.", "qualificatif"],
  ["Une exposition au marché parisien encadré et transparent.", "qualificatif"],
  ["C'est un vrai levier pour investir plus à Paris.", "qualificatif"],
  ["Écoles et lycées partout.", "qualificatif"],
  ["20 ans de sérénité.", "qualificatif"],
  ["Parquet contrecollé, prestations soignées, ascenseur.", "qualificatif"],
  ["Un gestionnaire spécialisé assume l'exploitation.", "qualificatif"],
  ["Un vrai placement patrimonial sans les tracas.", "qualificatif"],
  ["Contactez-nous pour visiter les modèles disponibles.", "offre"],
  ["Une situation stratégique dans le quartier.", "qualificatif"],
  ["L'immeuble conjugue matériaux authentiques et performance énergétique.", "qualificatif"],
  ["Les coursives intérieures créent une circulation fluide entre les logements.", "qualificatif"],
  ["Ce dispositif élimine les contraintes administratives et fiscales.", "qualificatif"],
  ["Une architecture de caractère.", "qualificatif"],
  ["Un investissement pensé pour durer, sans les complications.", "qualificatif"],
  ["Local à vélos sécurisé et ascenseur facilitent la vie.", "qualificatif"],
];

const MUST_PASS = [
  "Studios en nue-propriété, prix moyen 326 500 €.",
  "41 logements neufs au cœur de la Plaine-Monceau.",
  "Vous achetez à 61 % de la valeur en pleine propriété, sans gestion locative pendant 20 ans.",
  "Le quatre-pièces à 743 600 € dispose d'une terrasse de 35 m².",
  "À l'issue du démembrement, vous retrouvez la pleine propriété.",
  "Les deux-pièces affichent un prix moyen de 360 000 €.",
  "Métro Villiers à 5 minutes.",
  "Revente possible à tout moment.",
  "L'immeuble dispose d'un ascenseur, d'un local à vélos et de contrôles d'accès.",
  "Les studios du dernier étage sont chauffés par une pompe à chaleur individuelle.",
  "Façade greige, ossature bois et toitures végétalisées.",
  "Vous achetez à 61 % de la valeur en pleine propriété.",
  "Chauffage individuel électrique, eau chaude collective par pompe à chaleur.",
  "Les studios du R+6 sont chauffés par une pompe à chaleur individuelle.",
];

let failed = 0;

for (const [sentence, expected] of MUST_FLAG) {
  const reasons = verifySentence(sentence, ctx);
  const hit = reasons.some((r) => r.toLowerCase().includes(expected.toLowerCase()));
  if (!hit) {
    console.error(`FAIL flag: ${JSON.stringify(sentence)} -> ${JSON.stringify(reasons)}`);
    failed++;
  } else {
    console.log(`OK flag: ${JSON.stringify(sentence)}`);
  }
}

for (const sentence of MUST_PASS) {
  const reasons = verifySentence(sentence, ctx);
  if (reasons.length > 0) {
    console.error(`FAIL pass: ${JSON.stringify(sentence)} -> ${JSON.stringify(reasons)}`);
    failed++;
  } else {
    console.log(`OK pass: ${JSON.stringify(sentence)}`);
  }
}

// Livraison : détection dépassée / future
const pastCheck = parseDeliveryEnd("Début de l'usufruit au 3e trimestre 2026");
if (!ctx.deliveryPast || pastCheck?.year !== "2026") {
  console.error("FAIL: T3 2026 doit être dépassé au 18/11/2026");
  failed++;
}
const futureCtx = buildFactsContext({
  extractedData: { ...EXTRACTED, livraison: "4e trimestre 2027" },
  now: NOW,
});
if (futureCtx.deliveryPast) {
  console.error("FAIL: T4 2027 ne doit pas être dépassé");
  failed++;
}
if (verifySentence("Livraison au 4e trimestre 2027.", futureCtx).length > 0) {
  console.error("FAIL: une date de livraison future présente dans les faits doit passer");
  failed++;
}

// Nettoyage : une phrase fautive est retirée, le reste est conservé
const annonces = {
  facebook: {
    titre: "Nue-propriété à Paris 17e",
    corps:
      "Vous achetez à 61 % de la valeur en pleine propriété. Garantie décennale du constructeur. Revente possible à tout moment.",
  },
};
const issues = collectFactIssues(annonces, ctx);
const cleaned = stripFactIssues("facebook", annonces.facebook, issues);
if (
  cleaned.corps.includes("décennale") ||
  !cleaned.corps.includes("61 %") ||
  !cleaned.corps.includes("Revente possible")
) {
  console.error(`FAIL strip: ${JSON.stringify(cleaned.corps)}`);
  failed++;
} else {
  console.log("OK strip: phrase fautive retirée, le reste conservé");
}

// Le bloc de faits injecté ne nomme aucun terme interdit et porte la règle du dispositif
const prompt = buildFactsPrompt(ctx, JSON.stringify(EXTRACTED));
const mustContain = ["FAITS AUTORISÉS", "NUE-PROPRIÉTÉ", "DÉPASSÉE", "18 novembre 2026", "Décris, ne qualifie pas"];
for (const needle of mustContain) {
  if (!prompt.includes(needle)) {
    console.error(`FAIL prompt: manque ${JSON.stringify(needle)}`);
    failed++;
  }
}
for (const forbidden of ["haussmann", "agréé", "décennale", "appels de fonds"]) {
  if (prompt.toLowerCase().includes(forbidden)) {
    console.error(`FAIL prompt: ne doit pas nommer ${JSON.stringify(forbidden)}`);
    failed++;
  }
}

// Strip sur un corps multi-paragraphes (cas réel : les phrases fautives restaient en production)
{
  const corps = "Parquet contrecollé dans les séjours.\n\nCarrelage de qualité dans les salles de bains. Ascenseur et local à vélos.\n\nPrix moyen studio : 326 500 €.";
  const issues = collectFactIssues({ seloger: { titre: "Studio", corps } }, ctx);
  const stripped = stripFactIssues("seloger", { titre: "Studio", corps }, issues);
  const ok =
    !stripped.corps.includes("de qualité") &&
    stripped.corps.includes("Parquet contrecollé") &&
    stripped.corps.includes("Ascenseur et local à vélos") &&
    stripped.corps.includes("\n\n");
  if (ok) console.log("OK strip multi-paragraphes");
  else {
    console.error("FAIL strip multi-paragraphes: " + JSON.stringify(stripped.corps));
    failed++;
  }
}

// Hashtags : on garde les génériques, la ville et ce qui figure dans les faits ; on retire fautes et lieux inventés
{
  const hashCtx = buildFactsContext({
    extractedData: { nom: "Patio Villiers", ville: "Paris", quartier: "17e arrondissement, Plaine-Monceau" },
    now: NOW,
  });
  const out = sanitizeHashtags(
    "Texte. #immobilierneuf #nueproprieté #paris17 #PlaineMonceau #planemonceau #villiersstation #patrimoine #Paris",
    hashCtx,
  );
  const ok =
    out.includes("#immobilierneuf") &&
    out.includes("#nueproprieté") &&
    out.includes("#paris17") &&
    out.includes("#PlaineMonceau") &&
    out.includes("#patrimoine") &&
    out.includes("#Paris") &&
    !out.includes("#planemonceau") &&
    !out.includes("#villiersstation");
  if (ok) console.log("OK hashtags");
  else {
    console.error("FAIL hashtags: " + out);
    failed++;
  }
}

// Régression : un terme présent dans les faits ne doit pas excuser les autres termes de la même liste
{
  const withDurable = buildFactsContext({
    extractedData: { nom: "Patio", ville: "Paris", architecture: "Isolant durable, façade greige" },
    now: NOW,
  });
  const okDurable = verifySentence("Isolant durable et façade greige.", withDurable).length === 0;
  const stillFlagged =
    verifySentence("Prestations soignées et gestionnaire spécialisé.", withDurable).length > 0 &&
    verifySentence("Un vrai placement sans tracas.", withDurable).length > 0;
  if (okDurable && stillFlagged) console.log("OK terme sourcé n'excuse pas les autres");
  else {
    console.error(`FAIL terme sourcé: durable=${okDurable} autres signalés=${stillFlagged}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} échec(s)`);
  process.exit(1);
}
console.log("\nTous les tests facts passent.");
