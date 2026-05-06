export interface ScoreDetail {
  critere: string;
  points: number;
  maxPoints: number;
  conseil?: string;
}

export interface ScoreResult {
  total: number;
  details: ScoreDetail[];
}

export function scoreAnnonce(content: string): ScoreResult {
  const details: ScoreDetail[] = [];
  const words = content.trim().split(/\s+/).length;

  let longueurPts = 0;
  let longueurConseil: string | undefined = undefined;
  if (words >= 80 && words <= 300) longueurPts = 2;
  else if (words >= 50 && words < 80) {
    longueurPts = 1;
    longueurConseil = "L'annonce est un peu courte, développez la description.";
  } else if (words > 300) {
    longueurPts = 1;
    longueurConseil = "L'annonce est trop longue, synthétisez.";
  } else {
    longueurPts = 0;
    longueurConseil = "L'annonce est trop courte pour être convaincante.";
  }
  details.push({ critere: "Longueur", points: longueurPts, maxPoints: 2, conseil: longueurConseil });

  const typesBiens = ["appartement", "maison", "studio", "villa", "loft", "duplex", "terrain", "local", "bureau", "commerce"];
  const hasType = typesBiens.some((t) => content.toLowerCase().includes(t));
  details.push({
    critere: "Type de bien",
    points: hasType ? 1 : 0,
    maxPoints: 1,
    conseil: hasType ? undefined : "Mentionnez le type de bien (appartement, maison...)",
  });

  const hasSurface = /\d+\s*m[²2]/.test(content);
  details.push({
    critere: "Surface",
    points: hasSurface ? 1 : 0,
    maxPoints: 1,
    conseil: hasSurface ? undefined : "Ajoutez la surface en m².",
  });

  const hasLocation = /\b(paris|lyon|marseille|bordeaux|lille|nantes|toulouse|nice|strasbourg|montpellier|rue|avenue|boulevard|quartier|arrondissement|ville|commune)\b/i.test(content);
  details.push({
    critere: "Localisation",
    points: hasLocation ? 1 : 0,
    maxPoints: 1,
    conseil: hasLocation ? undefined : "Précisez la ville ou le quartier.",
  });

  const hasPrice = /\d[\d\s]*[€$]|€[\d\s]*\d|\d+\s*euros?/i.test(content);
  details.push({
    critere: "Prix",
    points: hasPrice ? 1 : 0,
    maxPoints: 1,
    conseil: hasPrice ? undefined : "Indiquez le prix pour attirer les acheteurs qualifiés.",
  });

  const firstSentence = content.trim().split(/[.!?]/)[0] || "";
  const hasGoodHook = firstSentence.length >= 30 && firstSentence.length <= 150;
  details.push({
    critere: "Accroche",
    points: hasGoodHook ? 2 : 0,
    maxPoints: 2,
    conseil: hasGoodHook ? undefined : "La première phrase doit accrocher le lecteur (30-150 caractères).",
  });

  const hasCtaWords = /(contactez|appelez|visitez|n'hésitez|renseignez|découvrez|venez|réservez|planifiez)/i.test(content);
  details.push({
    critere: "Appel à l'action",
    points: hasCtaWords ? 2 : 0,
    maxPoints: 2,
    conseil: hasCtaWords ? undefined : 'Terminez par un appel à l\'action ("Contactez-nous", "Visitez dès maintenant"...)',
  });

  const total = Math.min(10, details.reduce((sum, d) => sum + d.points, 0));
  return { total, details };
}
