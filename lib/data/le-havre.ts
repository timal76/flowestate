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

export function getLeHavreDataForPrompt(quartier?: string): string {
  const data = LEHAVRE_DATA;

  const quartierData =
    quartier?.toLowerCase().includes("arcole") || quartier?.toLowerCase().includes("brindeau")
      ? data.quartier_arcole_brindeau
      : null;

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

RÈGLE D'UTILISATION : Ces données sont officielles et vérifiées. Tu peux les citer directement avec leur source entre parenthèses. Ne jamais inventer de données supplémentaires.
`.trim();
}
