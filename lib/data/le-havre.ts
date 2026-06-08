export const LEHAVRE_DATA = {
  // ═══════════════════════════════════════════════════════
  // MARCHÉ IMMOBILIER
  // ═══════════════════════════════════════════════════════
  marche_immobilier: {
    prix_m2_median_appartement: 2269,
    prix_m2_moyen_appartement: 1863,
    fourchette: "1 227€ à 2 665€/m²",
    evolution_5_ans: "+14,85%",
    evolution_2023_2024: "-8,84%",
    transactions_2024: 952,
    repartition: "70% appartements, 30% maisons",
    source: "DVF / MeilleursAgents / ParuVendu 2024",
    par_quartier: {
      centre_reconstruit_unesco: {
        prix_m2: 3000,
        description:
          "Cœur historique classé UNESCO, Auguste Perret, proximité toutes commodités, commerces, culture",
      },
      sainte_adresse: {
        prix_m2: 3200,
        description:
          "Quartier résidentiel premium en hauteur, vues mer panoramiques, maisons de caractère, calme",
      },
      arcole_brindeau: {
        prix_m2: 2400,
        fourchette: "1 407€ à 4 956€/m²",
        description:
          "Secteur en reconquête urbaine entre port ancien et hypercentre, forte dynamique de revalorisation",
        source: "L'Apporteur d'Immo décembre 2024",
        avantage:
          "Environ 15% sous le centre UNESCO et 25% sous Sainte-Adresse — fort potentiel de valorisation",
      },
      saint_vincent: {
        prix_m2: 2600,
        description: "Proche littoral et centre-ville, réseau de transport efficace, commerces et services",
      },
      sainte_marie_saint_leon: {
        prix_m2: 2300,
        description: "Quartier universitaire, logements essentiellement neufs, demande locative étudiante forte",
      },
      sanvic: {
        prix_m2: 2200,
        description: "Quartier familial calme, verdure, plus abordable, idéal résidence principale",
      },
      quartiers_nord: {
        prix_m2: 1400,
        description: "Mont-Gaillard, Caucriauville — prix bas, bon rendement locatif potentiel",
      },
    },
  },

  // ═══════════════════════════════════════════════════════
  // MARCHÉ LOCATIF
  // ═══════════════════════════════════════════════════════
  marche_locatif: {
    loyer_median_m2: 12,
    loyer_moyen_m2: 13,
    evolution: "+4,5% vs année précédente",
    source: "Observatoire Clameur / SeLoger janvier 2026",
    par_type: {
      T1: { loyer_median_m2: 14, surface_moyenne: 25, loyer_mensuel_estime: 350 },
      T2: { loyer_median_m2: 13, surface_moyenne: 45, loyer_mensuel_estime: 585 },
      T3: { loyer_median_m2: 12, surface_moyenne: 65, loyer_mensuel_estime: 780 },
      T4: { loyer_median_m2: 11, surface_moyenne: 85, loyer_mensuel_estime: 935 },
    },
    demande_locative:
      "Forte demande structurelle : 20 000 étudiants + salariés portuaires en mobilité + personnels hospitaliers GHH",
    location_saisonniere: {
      prix_nuit_moyen: "À partir de 146€/nuit (source : Airbnb Le Havre 2026)",
      taux_occupation: "Forte affluence touristique croissante liée au label UNESCO et aux croisières",
      avantage: "Potentiel location courte durée en complément d'usage personnel",
    },
  },

  // ═══════════════════════════════════════════════════════
  // TRAMWAY ET TRANSPORTS URBAINS
  // ═══════════════════════════════════════════════════════
  tramway: {
    lignes_existantes: "2 lignes de tramway A et B opérationnelles depuis décembre 2012, 99% de ponctualité",
    ligne_c: {
      statut: "Travaux en cours depuis février 2025",
      mise_en_service_prevue: "2027",
      investissement: "Plus de 300 millions d'euros",
      impact: "50 000 personnes supplémentaires desservies à proximité d'un arrêt de tramway",
      trace: "Le Havre — Harfleur — Montivilliers",
      benefices: "Hôpital Jacques Monod directement connecté, quartiers sud mieux reliés au centre",
      declaration: "Déclaré d'utilité publique par le Préfet de Seine-Maritime en décembre 2024",
      travaux_attribution: "Marché attribué au groupement mené par TSO (filiale NGE) en octobre 2025",
      source: "Le Havre Seine Métropole officiel / tramwaylehavremetro.fr / Le Rail octobre 2025",
    },
  },

  reseau_lia: {
    description: "Réseau LiA exploité par Transdev Le Havre — 25 millions de voyages/an",
    chronolia: "8 lignes ChronoLiA (C1 à C8) — passages toutes les 10 à 15 minutes de 5h à 22h30 (00h30 pour C1 C2 C3 C4)",
    lignes_periurbaines: "13 lignes périurbaines numérotées 9 à 21",
    transport_a_demande: [
      "FiLBus — transport à la demande lundi-samedi, arrêt à arrêt, tarifié réseau LiA",
      "FlexiLiA — desserte zone industrialo-portuaire",
      "LiAdeNuit — service de nuit à la demande toute l'année",
      "MobiFil — transport à mobilité réduite",
    ],
    velos: "LiAvélos — location vélos standard, pliants et électriques + 12 parcs à vélos P+V",
    funiculaire: "Funiculaire intégré au réseau — liaison ville basse / ville haute",
    evolution: "Réseau 100% vélo compatible d'ici 2027 — premier réseau urbain de France avec cette ambition",
    source: "Le Havre Seine Métropole / lehavreseinemetropole.fr juillet 2024",
  },

  // ═══════════════════════════════════════════════════════
  // TRAIN PARIS
  // ═══════════════════════════════════════════════════════
  transports_paris: {
    trajet: "2h05 minimum en Intercités ou TER Normandie",
    frequence: "14 trains quotidiens Paris Saint-Lazare",
    premier_depart_havre: "05h14",
    dernier_retour_paris: "20h07",
    type_train: "Intercités et TER Normandie (jamais TGV — ligne non TGV)",
    previsions:
      "Amélioration prévue des liaisons Normandie dans le cadre du plan de développement ferroviaire",
    source: "SNCF Connect",
  },

  // ═══════════════════════════════════════════════════════
  // QUARTIER ARCOLE BRINDEAU — DÉTAIL COMPLET
  // ═══════════════════════════════════════════════════════
  quartier_arcole_brindeau: {
    description:
      "Quartier Eure-Brindeau en reconquête urbaine depuis plusieurs années. Anciennes friches industrielles transformées en ensembles résidentiels et urbains modernes. Animation croissante, nouveaux commerces et services.",
    projets_officiels: [
      "Requalification des magasins généraux lancée en 2026 — préservation patrimoine industriel portuaire (source : lehavre.fr)",
      "Construction nouvelle école sur parking Ferrer, ouverture prévue rentrée 2028 — salles lumineuses, cours végétalisées (source : lehavre.fr)",
      "Arrivée tramway ligne C en 2027 — 50 000 personnes supplémentaires desservies (source : Le Havre Seine Métropole)",
      "Passerelle Daniel Colliard construite en 2023 — traverse le bassin Paul Vatine à pied",
    ],
    position: "Entre port ancien et hypercentre UNESCO — 11 min du centre UNESCO, 14 min des plages",
    commerces_proximite:
      "Auchan, pharmacie, boulangerie, centre commercial, cinéma Pathé Docks Vauban à 15 min bus ligne 3",
    valorisation:
      "Prix actuel 2 400€/m² soit 15% sous le centre UNESCO (3 000€/m²) et 25% sous Sainte-Adresse (3 200€/m²). Potentiel de revalorisation à moyen terme sans spéculation.",
    source: "lehavre.fr/ma-ville/vie-des-quartiers/quartier-eure-brindeau",
  },

  // ═══════════════════════════════════════════════════════
  // SERVICES MÉDICAUX
  // ═══════════════════════════════════════════════════════
  services_medicaux: {
    groupe_hospitalier_havre: {
      nom: "Groupe Hospitalier du Havre (GHH)",
      statut: "Établissement public — Président du Conseil de Surveillance : Édouard Philippe",
      sites: [
        "Hôpital Jacques Monod — 29 avenue Pierre Mendès France, 76290 Montivilliers — urgences adultes et pédiatriques 24h/24, chirurgie (117 lits), maternité (55 lits), médecine (436 lits), oncologie, cardiologie, réanimation — tél. 02 32 73 32 32",
        "Hôpital Flaubert — Le Havre — gériatrie (SSR), psychiatrie (115 lits), soins longue durée (154 lits), médecine physique et réadaptation",
        "Hôpital Pierre Janet — Le Havre — psychiatrie adulte et pédopsychiatrie — tél. 02 32 73 39 20",
        "Clinique des Ormeaux — Le Havre — 200 lits, urgences 24h/24, chirurgie toutes spécialités, plateau technique complet, parking gratuit",
      ],
      specialites:
        "Cardiologie, pneumologie, gastro-entérologie, néphrologie, chirurgie orthopédique, gynécologie-obstétrique, oncologie, radiologie, hémodialyse, néonatalogie",
      source: "GHH ch-havre.fr / FHF 2024",
    },
    urgences_resume:
      "Deux centres d'urgences 24h/24 : Hôpital Jacques Monod (Montivilliers) et Clinique des Ormeaux (Le Havre centre)",
    medecins_generalistes:
      "Ville bien dotée en médecins généralistes et spécialistes — réseau de soins complet",
  },

  // ═══════════════════════════════════════════════════════
  // MARCHÉS ET VIE QUOTIDIENNE
  // ═══════════════════════════════════════════════════════
  marches: {
    liste: [
      {
        nom: "Halles Centrales du Havre",
        lieu: "14 Place des Halles Centrales, Le Havre",
        horaires: "Tous les jours de la semaine",
        type: "Marché couvert permanent depuis plus de 55 ans — 22 commerçants : primeur, poisson, boucherie, fromagerie, boulangerie, traiteur",
        source: "Pages Jaunes / lehavre.fr",
      },
      {
        nom: "Marché Thiers",
        lieu: "Place Thiers / Avenue René Coty, Le Havre",
        horaires: "Vendredi matin 7h30 à 13h30",
        type: "Spécialité : poissons, volailles, produits laitiers, charcuterie, huîtres normandes",
        source: "lehavre.fr",
      },
      {
        nom: "Marché aux Poissons",
        lieu: "Quai de l'Île, Le Havre",
        horaires: "8h30 à 13h30 (sauf avis de tempête)",
        type: "Poissons et fruits de mer normands frais pêchés",
        source: "lehavre.fr",
      },
      {
        nom: "Marché de Graville",
        lieu: "Place de la Médaille Militaire, Le Havre",
        horaires: "7h30 à 13h30",
        type: "Marché alimentaire",
        source: "lehavre.fr",
      },
      {
        nom: "Marché de la Mare-au-Clerc",
        lieu: "Place de la Mare-au-Clerc, Le Havre",
        horaires: "7h30 à 13h30",
        type: "Marché alimentaire et confection",
        source: "lehavre.fr",
      },
      {
        nom: "Marché de Sainte-Cécile",
        lieu: "Place de la Liberté, Le Havre",
        horaires: "7h30 à 13h30",
        type: "Marché alimentaire et divers",
        source: "lehavre.fr",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════
  // GASTRONOMIE ET ART DE VIVRE
  // ═══════════════════════════════════════════════════════
  gastronomie: {
    specialites_normandes: [
      "Huîtres — disponibles toute l'année sur les marchés havrais",
      "Coquilles Saint-Jacques — saison octobre à mai, emblème de la Normandie",
      "Soles normandes — pêche locale Manche",
      "Harengs fumés — tradition havraise",
      "Homard breton et normand",
      "Fromages AOP : Camembert, Livarot, Pont-l'Évêque, Neufchâtel",
      "Cidre et Calvados normands",
      "Crème et beurre de Normandie",
    ],
    cafe: "Le Havre est le premier port importateur de café en France — 60% du trafic national — tradition du café torréfié en ville",
    restaurants:
      "Quartier Saint-François et front de mer — concentration de restaurants de poissons et fruits de mer, brasseries, bars à huîtres",
    source: "Office du tourisme Le Havre / Ville du Havre",
  },

  // ═══════════════════════════════════════════════════════
  // CULTURE, PATRIMOINE ET TOURISME
  // ═══════════════════════════════════════════════════════
  culture_patrimoine: {
    unesco: {
      label: "Centre-ville reconstruit par Auguste Perret inscrit au Patrimoine mondial UNESCO en 2005",
      architecte: "Auguste Perret — pionnier du béton armé, reconstruction post-WWII unique au monde",
      importance:
        "Seul exemple mondial de reconstruction urbaine cohérente de l'après-guerre classé UNESCO",
    },
    monet: {
      naissance: "Claude Monet né au Havre le 14 novembre 1840",
      oeuvre_fondatrice:
        "'Impression, soleil levant' (1872) peint depuis le port du Havre — œuvre qui donna son nom au mouvement impressionniste",
      musee:
        "MuMa (Musée d'Art Moderne André Malraux) — 14 esplanade Albert 1er — une des plus grandes collections impressionnistes de France (Monet, Boudin, Dufy, Sisley)",
      source: "MuMa Le Havre / Ville du Havre",
    },
    sites_incontournables: [
      "MuMa — Musée d'Art Moderne André Malraux — collections impressionnistes exceptionnelles",
      "Église Saint-Joseph — tour-lanterne de 107 mètres, 12 700 alvéoles de verres colorés, monument emblématique d'Auguste Perret",
      "Le Volcan — scène nationale conçue par Oscar Niemeyer — architecture iconique",
      "Jardins Suspendus de Sainte-Adresse — ancien fort militaire du XIXe siècle reconverti — 18 000 espèces végétales, vue panoramique sur l'estuaire de la Seine",
      "Docks Vauban — reconversion d'entrepôts portuaires — centre commercial, restaurants, cinéma Pathé",
      "Les Bains des Docks — piscine conçue par Jean Nouvel — architecture contemporaine",
      "Abbaye de Graville — patrimoine médiéval",
      "Maison de l'Armateur — maison bourgeoise du XVIIIe siècle",
      "Front de mer et plage — 2 km de plage de galets en ville",
      "Forêt de Montgeon — poumon vert de 350 hectares en pleine ville",
    ],
    tourisme: {
      croisières:
        "Le Havre est un port d'escale et d'embarquement croisières — flux touristique international",
      cotealbatre: "Porte d'entrée de la Côte d'Albâtre — Étretat à 30 km, falaises emblématiques",
      honfleur: "Honfleur à 25 km par le pont de Normandie",
      deauville: "Deauville et Trouville à 40 km",
      rouen: "Rouen à 1h, Caen à 1h, plages du Débarquement à 1h30",
    },
  },

  // ═══════════════════════════════════════════════════════
  // BASSIN D'EMPLOI ET ÉCONOMIE
  // ═══════════════════════════════════════════════════════
  bassin_emploi: {
    port: {
      statut:
        "2ème port de France (après Marseille) — 1er port à conteneurs français — 1er port de commerce extérieur",
      emplois: "Environ 32 000 emplois directs et indirects dans le complexe industrialo-portuaire",
      trafic: "3 millions de conteneurs traités en 2022",
      cafe: "Premier port importateur de café de France (60% du trafic national)",
    },
    industrie: {
      renault_sandouville: {
        salaries: "2 600 salariés",
        production:
          "130 000 utilitaires produits en 2024 — Renault Trafic et nouveau FlexEvan 100% électrique",
        recrutements:
          "540 recrutements en CDI et CDD annoncés 2024-2028 (source : France Bleu mars 2024)",
        investissement: "330 millions d'euros investis pour la production du FlexEvan électrique",
        source: "France Bleu Normandie 2024",
      },
      total_petrochimie: {
        salaries:
          "Environ 4 000 emplois (raffinage + pétrochimie sur site Gonfreville-l'Orcher)",
        source: "INSEE flash Normandie",
      },
      safran_nacelles: {
        salaries:
          "Environ 1 700 emplois — fabrication de nacelles pour moteurs d'avions à Gonfreville-l'Orcher",
        source: "INSEE flash Normandie",
      },
      agroalimentaire: "Filière café, céréales, industries agroalimentaires liées au port",
    },
    enseignement_superieur: {
      total_etudiants: "20 000 étudiants sur l'agglomération",
      etablissements: [
        "Université Le Havre Normandie — 8 097 étudiants — 12 laboratoires dont 2 associés au CNRS",
        "Sciences Po Le Havre",
        "EM Normandie (école de management)",
      ],
      source: "Université Le Havre Normandie / jobetudiant.net",
    },
    secteurs_porteurs:
      "Logistique maritime, commerce international, pétrochimie, industrie automobile, aéronautique, tertiaire en développement",
  },

  // ═══════════════════════════════════════════════════════
  // CHIFFRES OFFICIELS DE LA VILLE
  // ═══════════════════════════════════════════════════════
  chiffres_ville: {
    population: 172769,
    rang: "Ville la plus peuplée de Normandie",
    littoral: "65 km de littoral",
    espaces_verts: "7 820 hectares de forêts, parcs, jardins, squares",
    foret_montgeon: "350 hectares de forêt urbaine en plein cœur de ville",
    ecoles_publiques: 95,
    ecoles_privees: 10,
    associations: "Plus de 2 000 associations actives",
    fondation: "Fondée en 1517 par François 1er",
    source: "Plaquette officielle Ville du Havre",
  },
} as const;

// ═══════════════════════════════════════════════════════
// FONCTION D'INJECTION DANS LES PROMPTS
// Adapte les données selon le profil prospect et le quartier
// ═══════════════════════════════════════════════════════
export function getLeHavreDataForPrompt(quartier?: string, prospectProfile?: string): string {
  const d = LEHAVRE_DATA;

  const isArcole =
    quartier?.toLowerCase().includes("arcole") ||
    quartier?.toLowerCase().includes("brindeau") ||
    quartier?.toLowerCase().includes("eure");

  const isRetraite =
    prospectProfile?.toLowerCase().includes("retrait") ||
    prospectProfile?.toLowerCase().includes("senior") ||
    prospectProfile?.toLowerCase().includes("résidence secondaire") ||
    prospectProfile?.toLowerCase().includes("residence secondaire") ||
    prospectProfile?.toLowerCase().includes("pied-à-terre") ||
    prospectProfile?.toLowerCase().includes("pied a terre");

  const isInvestisseur =
    prospectProfile?.toLowerCase().includes("invest") ||
    prospectProfile?.toLowerCase().includes("locatif") ||
    prospectProfile?.toLowerCase().includes("rendement") ||
    prospectProfile?.toLowerCase().includes("rentabil") ||
    prospectProfile?.toLowerCase().includes("patrimoine");

  const isJeuneActif =
    prospectProfile?.toLowerCase().includes("jeune") ||
    prospectProfile?.toLowerCase().includes("actif") ||
    prospectProfile?.toLowerCase().includes("primo") ||
    prospectProfile?.toLowerCase().includes("étudiant") ||
    prospectProfile?.toLowerCase().includes("etudiant");

  const isFamille =
    prospectProfile?.toLowerCase().includes("famille") ||
    prospectProfile?.toLowerCase().includes("enfant") ||
    prospectProfile?.toLowerCase().includes("scolaire");

  const cleanProjet = (text: string) =>
    text
      .replace(/\s*\(source\s*:\s*[^)]+\)/gi, "")
      .replace(/\s*\(source\s+[^)]+\)/gi, "")
      .replace(/\s+en 2023\b/g, "")
      .trim();

  const declarationTramway = d.tramway.ligne_c.declaration.replace(/\s+en décembre 2024\b/i, "");
  const statutTramway = d.tramway.ligne_c.statut.replace(/\s+depuis février 2025\b/i, "");

  return `
DONNÉES OFFICIELLES VÉRIFIÉES — LE HAVRE
(Données de connaissance de fond — NE PAS INVENTER d'autres données)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MARCHÉ IMMOBILIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Prix médian appartement Le Havre : ${d.marche_immobilier.prix_m2_median_appartement}€/m² (fourchette : ${d.marche_immobilier.fourchette})
- Évolution sur 5 ans : ${d.marche_immobilier.evolution_5_ans}
- Quartier Arcole Brindeau : ~${d.marche_immobilier.par_quartier.arcole_brindeau.prix_m2}€/m²
- Centre reconstruit UNESCO : ~${d.marche_immobilier.par_quartier.centre_reconstruit_unesco.prix_m2}€/m²
- Sainte-Adresse : ~${d.marche_immobilier.par_quartier.sainte_adresse.prix_m2}€/m²
- ${d.marche_immobilier.par_quartier.arcole_brindeau.avantage}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MARCHÉ LOCATIF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Loyer médian : ${d.marche_locatif.loyer_median_m2}€/m² (${d.marche_locatif.evolution})
- T2 (45m²) : ~${d.marche_locatif.par_type.T2.loyer_mensuel_estime}€/mois
- T3 (65m²) : ~${d.marche_locatif.par_type.T3.loyer_mensuel_estime}€/mois
- T4 (85m²) : ~${d.marche_locatif.par_type.T4.loyer_mensuel_estime}€/mois
- ${d.marche_locatif.demande_locative}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRAMWAY LIGNE C
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Statut : ${statutTramway}
- Mise en service prévue : ${d.tramway.ligne_c.mise_en_service_prevue}
- Investissement : ${d.tramway.ligne_c.investissement}
- Impact : ${d.tramway.ligne_c.impact}
- ${declarationTramway}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÉSEAU LiA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 8 lignes ChronoLiA C1 à C8 : toutes les 10-15 min de 5h à 22h30 (00h30 pour C1 C2 C3 C4)
- 13 lignes périurbaines
- Services TAD : FiLBus, FlexiLiA, LiAdeNuit, MobiFil
- Location vélos LiAvélos (standard, pliant, électrique) + 12 parcs P+V
- Funiculaire ville basse / ville haute

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRAIN PARIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Trajet : ${d.transports_paris.trajet}
- Fréquence : ${d.transports_paris.frequence}
- Premier départ Le Havre : ${d.transports_paris.premier_depart_havre}
- Dernier retour Paris : ${d.transports_paris.dernier_retour_paris}
- Type : ${d.transports_paris.type_train}

${
  isArcole
    ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUARTIER ARCOLE BRINDEAU — PROJETS OFFICIELS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${d.quartier_arcole_brindeau.projets_officiels.map((p) => `- ${cleanProjet(p)}`).join("\n")}
- Position : ${d.quartier_arcole_brindeau.position}
- Commerces : ${d.quartier_arcole_brindeau.commerces_proximite}
- Valorisation : ${d.quartier_arcole_brindeau.valorisation}
`
    : ""
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CULTURE ET PATRIMOINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ${d.culture_patrimoine.unesco.label}
- Claude Monet né au Havre en 1840 — 'Impression, soleil levant' (1872) peint depuis le port du Havre — œuvre fondatrice de l'impressionnisme
- MuMa : une des plus grandes collections impressionnistes de France (Monet, Boudin, Dufy, Sisley)
- Église Saint-Joseph : tour-lanterne 107m, 12 700 alvéoles de verre coloré
- Jardins Suspendus : 18 000 espèces végétales, vue panoramique estuaire
- Le Volcan : scène nationale Oscar Niemeyer
- Docks Vauban, Forêt de Montgeon (350 ha en ville), front de mer 2 km
- Porte d'entrée Côte d'Albâtre : Étretat 30 km, Honfleur 25 km, Deauville 40 km

${
  isRetraite
    ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DONNÉES SPÉCIFIQUES RETRAITÉS / RÉSIDENCE SECONDAIRE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SERVICES MÉDICAUX :
- Hôpital Jacques Monod (Montivilliers) : urgences adultes 24h/24, cardiologie, chirurgie, oncologie — tél. 02 32 73 32 32
- Hôpital Flaubert : gériatrie, soins de suite et réadaptation
- Clinique des Ormeaux : urgences 24h/24, 200 lits, plateau technique complet, parking gratuit
- Réseau de médecins spécialistes dense

MARCHÉS ET VIE LOCALE :
- Halles Centrales : 14 Place des Halles Centrales, ouvertes TOUS LES JOURS, 22 commerçants
- Marché Thiers : vendredi matin 7h30-13h30, huîtres et poissons frais
- Marché aux Poissons : Quai de l'Île, 8h30-13h30
- Gastronomie normande : huîtres, Saint-Jacques, soles, fromages AOP, cidre, calvados

ACCESSIBILITÉ ET CONFORT :
- Funiculaire intégré au réseau LiA — liaison ville basse/haute sans effort
- MobiFil : transport à mobilité réduite
- Nombreuses associations seniors (plus de 2 000 associations en ville)
- 7 820 hectares d'espaces verts — promenades et balades accessibles

USAGE RÉSIDENCE SECONDAIRE :
- Location courte durée possible : à partir de 146€/nuit
- 14 trains quotidiens Paris Saint-Lazare — liberté totale week-ends et vacances
- Pas de contrainte de gestion si domotique pilotée à distance
`
    : ""
}

${
  isInvestisseur
    ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DONNÉES SPÉCIFIQUES INVESTISSEMENT LOCATIF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RENDEMENT POTENTIEL :
- Loyer médian T3 (65m²) : ~780€/mois
- Loyer médian T2 (45m²) : ~585€/mois
- Evolution loyers : +4,5% sur un an
- Potentiel location courte durée : à partir de 146€/nuit

DEMANDE LOCATIVE STRUCTURELLE :
- 20 000 étudiants sur l'agglomération (Université + Sciences Po + EM Normandie)
- 32 000 emplois complexe industrialo-portuaire — salariés en mobilité toute l'année
- Renault Sandouville : 540 recrutements prévus — afflux de nouveaux salariés
- GHH : milliers de personnels hospitaliers à loger

VALORISATION PATRIMONIALE :
- Arcole Brindeau : +15% potentiel vs prix actuel quand tramway ligne C opérationnel (2027)
- Evolution 5 ans : +14,85% sur l'ensemble de la ville
- Ville la plus peuplée de Normandie — marché profond et liquide
- Frais de notaire réduits sur neuf (~2-3% contre 7-8% dans l'ancien)
`
    : ""
}

${
  isFamille
    ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DONNÉES SPÉCIFIQUES FAMILLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÉCOLES ET ENSEIGNEMENT :
- 95 écoles publiques et 10 écoles privées
- Nouvelle école en construction Arcole Brindeau, ouverture rentrée 2028
- Université Le Havre Normandie pour les enfants en âge d'étudier
- 20 000 étudiants sur l'agglomération

VIE DE QUARTIER :
- Forêt de Montgeon : 350 hectares de forêt urbaine en pleine ville — vélos, promenades, pique-niques
- 7 820 hectares d'espaces verts totaux
- Plages à 14 min de voiture
- Plus de 2 000 associations sportives et culturelles
- Cinéma Pathé Docks Vauban, salles de spectacle, Le Volcan scène nationale
`
    : ""
}

${
  isJeuneActif
    ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DONNÉES SPÉCIFIQUES JEUNES ACTIFS / PRIMO-ACCÉDANTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BASSIN D'EMPLOI DYNAMIQUE :
- Renault Sandouville : 540 recrutements CDI/CDD prévus
- Grand Port Maritime : 32 000 emplois directs/indirects, secteurs logistique et maritime
- Safran Nacelles : ~1 700 emplois aéronautique
- Tertiaire en développement, commerce international, startups logistique
- Salaires attractifs secteur maritime : 13-18€/h pour profils logistique/documentaires

QUALITÉ DE VIE :
- Loyer médian 12€/m² — bien plus accessible que Paris (30€+), Rouen ou Caen
- LiAvélos pour se déplacer à moindre coût
- Front de mer, plages, sports nautiques accessibles
- Vie culturelle dynamique : Le Volcan, festivals, scènes musicales
- À 2h05 de Paris pour les week-ends et opportunités professionnelles
`
    : ""
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHIFFRES OFFICIELS VILLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ${d.chiffres_ville.population.toLocaleString("fr-FR")} habitants — ville la plus peuplée de Normandie
- ${d.chiffres_ville.littoral} de littoral
- ${d.chiffres_ville.espaces_verts}
- ${d.chiffres_ville.ecoles_publiques} écoles publiques, ${d.chiffres_ville.ecoles_privees} écoles privées
- Plus de 2 000 associations
- Le Havre premier port importateur de café en France (60% du trafic national)

RÈGLE ABSOLUE : Ces données sont officielles et vérifiées. Utiliser comme connaissance de fond uniquement — ne jamais citer de sources ni d'années de marché dans les annonces. NE JAMAIS inventer de données supplémentaires. Si une information n'est pas dans cette base, ne pas la mentionner.
`.trim();
}
