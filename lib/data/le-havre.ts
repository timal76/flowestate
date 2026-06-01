export const LEHAVRE_DATA = {
  marche_immobilier: {
    prix_m2_moyen_appartement: 1863,
    prix_m2_median: 2269,
    fourchette: "1 227€ à 2 665€/m²",
    evolution_5_ans: "+14,85%",
    evolution_2023_2024: "-8,84%",
    transactions_2024: 952,
    source: "DVF / MeilleursAgents / ParuVendu 2024",
    par_quartier: {
      centre_reconstruit: {
        prix_m2: 3000,
        description: "Quartier classé UNESCO, proximité commerces et culture",
      },
      sainte_adresse: {
        prix_m2: 3200,
        description: "Quartier résidentiel premium, vues mer, maisons de caractère",
      },
      arcole_brindeau: {
        prix_m2: 2400,
        fourchette: "1 407€ à 4 956€/m²",
        description: "Secteur en reconquête urbaine, entre port ancien et hypercentre",
        source: "L'Apporteur d'Immo décembre 2024",
      },
      sanvic: {
        prix_m2: 2200,
        description: "Quartier familial, calme, verdure",
      },
    },
  },
  marche_locatif: {
    loyer_median_m2: 12,
    evolution: "+4,5% vs année précédente",
    loyer_moyen_appartement: 535,
    source: "Observatoire Clameur / SeLoger janvier 2026",
    par_type: {
      T1: { loyer_median_m2: 14, surface_moyenne: 25 },
      T2: { loyer_median_m2: 13, surface_moyenne: 45 },
      T3: { loyer_median_m2: 12, surface_moyenne: 65 },
      T4: { loyer_median_m2: 11, surface_moyenne: 85 },
    },
  },
  tramway: {
    ligne_c: {
      statut: "Travaux en cours depuis février 2025",
      mise_en_service_prevue: "2027",
      details:
        "Troisième ligne de tramway déclarée d'utilité publique par le Préfet de Seine-Maritime en décembre 2024. Enquête publique tenue septembre-octobre 2024. Travaux préparatoires lancés février 2025.",
      source: "Le Havre Seine Métropole officiel / tramwaylehavremetro.fr",
    },
  },
  quartier_arcole_brindeau: {
    projets_officiels: [
      "Requalification des magasins généraux lancée en 2026 (source : lehavre.fr)",
      "Construction nouvelle école sur parking Ferrer, ouverture prévue rentrée 2028 (source : lehavre.fr)",
      "Arrivée tramway ligne C en 2027 (source : Le Havre Seine Métropole)",
      "Passerelle Daniel Colliard construite en 2023 pour traverser le bassin Paul Vatine",
    ],
    description:
      "Quartier Eure-Brindeau en reconquête urbaine depuis plusieurs années. Anciennes friches transformées en ensembles résidentiels et urbains. Animation croissante avec nouveaux commerces et bureaux.",
    source: "lehavre.fr/ma-ville/vie-des-quartiers/quartier-eure-brindeau",
  },
  bassin_emploi: {
    port: "Grand Port Maritime du Havre — premier port français pour le commerce extérieur",
    etudiants:
      "20 000 étudiants (Université Le Havre Normandie 8 097 étudiants + Sciences Po + EM Normandie)",
    secteurs:
      "Logistique maritime, pétrochimie, automobile (Renault Sandouville), commerce international, tertiaire en développement",
    source: "Université Le Havre Normandie / jobetudiant.net",
  },
  culture_patrimoine: {
    unesco:
      "Centre-ville reconstruit par Auguste Perret inscrit au Patrimoine mondial UNESCO en 2005",
    sites: [
      "MuMa — Musée d'Art Moderne André Malraux (collections impressionnistes)",
      "Église Saint-Joseph — tour-lanterne de 107 mètres, vitraux monumentaux",
      "Le Volcan — scène nationale conçue par Oscar Niemeyer",
      "Jardins Suspendus — ancien fort militaire, 18 000 espèces végétales, vue panoramique sur l'estuaire",
      "Docks Vauban — centre commercial et loisirs",
    ],
  },
  services_medicaux: {
    groupe_hospitalier_havre: {
      nom: "Groupe Hospitalier du Havre (GHH)",
      sites: [
        "Hôpital Jacques Monod — 29 avenue Pierre Mendès France, 76290 Montivilliers (urgences adultes et pédiatriques, chirurgie, maternité, 24h/24)",
        "Hôpital Flaubert — Le Havre (gériatrie, psychiatrie, soins longue durée)",
        "Hôpital Pierre Janet — Le Havre (psychiatrie)",
        "Clinique des Ormeaux — Le Havre (200 lits, urgences 24h/24, chirurgie, plateau technique complet)",
      ],
      source: "GHH ch-havre.fr / FHF 2024",
    },
    urgences:
      "Urgences adultes : Hôpital Jacques Monod (Montivilliers) ou Clinique des Ormeaux (Le Havre) — toutes deux 24h/24",
  },
  marches: {
    liste: [
      {
        nom: "Marché Thiers",
        lieu: "Place Thiers / Avenue René Coty",
        horaires: "Vendredi matin 7h30 à 13h30",
        type: "Alimentaire — poissons, volailles, produits laitiers, charcuterie, huîtres",
        source: "lehavre.fr",
      },
      {
        nom: "Halles Centrales du Havre",
        lieu: "14 Place des Halles Centrales",
        horaires: "Ouvert tous les jours de la semaine",
        type: "Marché couvert permanent — 22 commerçants, primeur, poisson, boucherie, fromagerie, boulangerie",
        source: "Pages Jaunes / lehavre.fr",
      },
      {
        nom: "Marché aux Poissons",
        lieu: "Quai de l'Île",
        horaires: "8h30 à 13h30 (sauf avis de tempête)",
        type: "Poissons et fruits de mer normands",
        source: "lehavre.fr",
      },
      {
        nom: "Marché de Graville",
        lieu: "Place de la Médaille Militaire",
        horaires: "7h30 à 13h30",
        type: "Alimentaire",
        source: "lehavre.fr",
      },
    ],
    note: "Gastronomie normande : huîtres, coquilles Saint-Jacques, soles, harengs, fromages, cidre disponibles sur les marchés",
  },
  gastronomie: {
    specialites: [
      "Huîtres",
      "Coquilles Saint-Jacques (saison automne-hiver)",
      "Soles",
      "Harengs fumés",
      "Fromages normands (Camembert, Livarot, Pont-l'Évêque)",
      "Cidre normand",
    ],
    cafe: "Le Havre est le premier port importateur de café en France (60% du trafic national)",
    source: "Office du tourisme Le Havre / Ville du Havre",
  },
  monet: {
    lien: "Claude Monet est né au Havre en 1840. Il a peint le port et la lumière havraise de nombreuses fois, dont l'œuvre fondatrice de l'impressionnisme 'Impression, soleil levant' (1872) représentant le port du Havre.",
    musee: "MuMa (Musée d'Art Moderne André Malraux) — une des plus grandes collections impressionnistes de France",
    source: "MuMa Le Havre / Ville du Havre",
  },
  transports: {
    train_paris: {
      trajet: "2h05 minimum (Intercités/TER Normandie)",
      frequence: "14 trains quotidiens Paris Saint-Lazare",
      premier_depart_havre: "05h14",
      dernier_retour_paris: "20h07",
      source: "SNCF Connect",
    },
    bus_ligne_3: {
      description: "Ligne 3 dessert les Docks Vauban depuis le quartier Arcole Brindeau",
      arrets: ["Marceau", "Gal Chanzy"],
      temps_docks_vauban: "15 minutes",
    },
  },
  chiffres_ville: {
    population: 172769,
    littoral: "65 km",
    espaces_verts: "7 820 hectares de forêts, parcs, jardins, squares",
    ecoles_publiques: 95,
    ecoles_privees: 10,
    associations: 2000,
    source: "Plaquette officielle ville du Havre",
  },
} as const;

export function getLeHavreDataForPrompt(quartier?: string, prospectProfile?: string): string {
  const data = LEHAVRE_DATA;

  const quartierData =
    quartier?.toLowerCase().includes("arcole") || quartier?.toLowerCase().includes("brindeau")
      ? data.quartier_arcole_brindeau
      : null;

  const isRetraite =
    prospectProfile?.toLowerCase().includes("retrait") ||
    prospectProfile?.toLowerCase().includes("senior") ||
    prospectProfile?.toLowerCase().includes("résidence secondaire");

  const isInvestisseur =
    prospectProfile?.toLowerCase().includes("invest") ||
    prospectProfile?.toLowerCase().includes("locatif") ||
    prospectProfile?.toLowerCase().includes("rendement");

  return `
DONNÉES OFFICIELLES VÉRIFIÉES — LE HAVRE (à utiliser directement dans les annonces) :

MARCHÉ IMMOBILIER (source: DVF/MeilleursAgents 2024) :
- Prix médian appartement : ${data.marche_immobilier.prix_m2_median}€/m² (fourchette : ${data.marche_immobilier.fourchette})
- Évolution sur 5 ans : ${data.marche_immobilier.evolution_5_ans}
- Quartier Arcole Brindeau : environ ${data.marche_immobilier.par_quartier.arcole_brindeau.prix_m2}€/m² (source : ${data.marche_immobilier.par_quartier.arcole_brindeau.source})
- Centre reconstruit UNESCO : environ ${data.marche_immobilier.par_quartier.centre_reconstruit.prix_m2}€/m²
- Sainte-Adresse : environ ${data.marche_immobilier.par_quartier.sainte_adresse.prix_m2}€/m²

MARCHÉ LOCATIF (source: Observatoire Clameur / SeLoger 2026) :
- Loyer médian : ${data.marche_locatif.loyer_median_m2}€/m² (${data.marche_locatif.evolution})
- T3 : ${data.marche_locatif.par_type.T3.loyer_median_m2}€/m² soit environ ${Math.round(data.marche_locatif.par_type.T3.loyer_median_m2 * data.marche_locatif.par_type.T3.surface_moyenne)}€/mois pour un T3 de ${data.marche_locatif.par_type.T3.surface_moyenne}m²

PROJET TRAMWAY LIGNE C (source officielle : Le Havre Seine Métropole) :
- Statut : ${data.tramway.ligne_c.statut}
- Mise en service prévue : ${data.tramway.ligne_c.mise_en_service_prevue}
- Déclaré d'utilité publique par le Préfet de Seine-Maritime en décembre 2024

${
  quartierData
    ? `QUARTIER ARCOLE BRINDEAU — PROJETS OFFICIELS (source : lehavre.fr) :
${quartierData.projets_officiels.map((p) => `- ${p}`).join("\n")}
`
    : ""
}

TRANSPORTS (source : SNCF Connect) :
- Train Paris Saint-Lazare : ${data.transports.train_paris.trajet}, ${data.transports.train_paris.frequence}
- Premier départ Le Havre : ${data.transports.train_paris.premier_depart_havre}
- Dernier retour Paris : ${data.transports.train_paris.dernier_retour_paris}
- Bus ligne 3 → Docks Vauban en ${data.transports.bus_ligne_3.temps_docks_vauban} (arrêts ${data.transports.bus_ligne_3.arrets.join(" ou ")})

BASSIN D'EMPLOI :
- ${data.bassin_emploi.port}
- ${data.bassin_emploi.etudiants}
- Secteurs : ${data.bassin_emploi.secteurs}

CHIFFRES OFFICIELS (source : Ville du Havre) :
- Population : ${data.chiffres_ville.population.toLocaleString("fr-FR")} habitants
- ${data.chiffres_ville.littoral} de littoral
- ${data.chiffres_ville.espaces_verts}
- ${data.chiffres_ville.ecoles_publiques} écoles publiques, ${data.chiffres_ville.ecoles_privees} écoles privées

${
  isRetraite
    ? `
SERVICES MÉDICAUX (source : GHH ch-havre.fr) :
- Groupe Hospitalier du Havre (GHH) : urgences adultes 24h/24 à l'Hôpital Jacques Monod (Montivilliers) et Clinique des Ormeaux (Le Havre)
- Services disponibles : cardiologie, gériatrie, chirurgie, maternité, oncologie, imagerie

MARCHÉS ET VIE LOCALE (source : lehavre.fr) :
- Halles Centrales : 14 Place des Halles Centrales, ouvertes tous les jours, 22 commerçants permanents
- Marché Thiers : Place Thiers, vendredi matin 7h30-13h30, spécialité poissons et huîtres
- Marché aux Poissons : Quai de l'Île, 8h30-13h30
- Gastronomie normande : huîtres, coquilles Saint-Jacques, fromages, cidre

CULTURE ET PATRIMOINE :
- Claude Monet né au Havre en 1840 — "Impression, soleil levant" (1872) peint depuis le port du Havre, œuvre fondatrice de l'impressionnisme
- MuMa : une des plus grandes collections impressionnistes de France
- Le Havre premier port importateur de café en France (60% du trafic national)
`
    : ""
}

${
  isInvestisseur
    ? `
DONNÉES INVESTISSEMENT (sources officielles) :
- Loyer médian T3 : ${data.marche_locatif.par_type.T3.loyer_median_m2}€/m² soit environ ${Math.round(data.marche_locatif.par_type.T3.loyer_median_m2 * data.marche_locatif.par_type.T3.surface_moyenne)}€/mois (source : Observatoire Clameur / SeLoger 2026)
- Evolution loyers : ${data.marche_locatif.evolution}
- 20 000 étudiants sur l'agglomération = demande locative étudiante structurelle
- Port autonome = salariés en mobilité, demande locative stable toute l'année
`
    : ""
}

RÈGLE D'UTILISATION : Ces données sont officielles et vérifiées. Tu peux les citer directement avec leur source entre parenthèses. Ne jamais inventer de données supplémentaires.
`.trim();
}
