import type { ProspectCategorie, ProspectInput } from "@/components/prospects/ProspectModal";

export type ProspectEmailContext = ProspectInput & {
  id: string;
};

type EmailHistoryItem = {
  description?: string | null;
  content?: string | null;
  created_at?: string;
};

function mapTemperatureToFeedback(temperature: ProspectInput["temperature"]) {
  if (temperature === "chaud") return "Très intéressé";
  if (temperature === "froid") return "Sans nouvelles depuis la visite";
  return "Hésitant";
}

function mapCategorieToSituation(categorie: ProspectCategorie) {
  return categorie === "vendeur" ? "Vendeur en cours de mandat" : "Premier achat";
}

function mapStatutToSearchDelay(statut: ProspectInput["statut"]) {
  if (statut === "Offre faite" || statut === "Signé") return "Urgent (moins d'1 mois)";
  if (statut === "Visite planifiée" || statut === "Contacté") return "Court terme (1-3 mois)";
  if (statut === "Perdu") return "Flexible";
  return "Moyen terme (3-6 mois)";
}

function buildPersonalInfo(
  prospect: ProspectEmailContext,
  emailHistory: EmailHistoryItem[],
): string {
  const lines: string[] = [
    `Profil CRM : ${prospect.categorie === "vendeur" ? "Vendeur" : "Acheteur"}`,
    `Température : ${prospect.temperature}`,
    `Statut pipeline : ${prospect.statut}`,
  ];

  if (prospect.notes?.trim()) {
    lines.push(`Notes agent : ${prospect.notes.trim()}`);
  }

  const recentEmails = emailHistory.slice(0, 3);
  if (recentEmails.length > 0) {
    lines.push("Historique récent des échanges :");
    for (const item of recentEmails) {
      const excerpt = (item.content || item.description || "").replace(/\s+/g, " ").trim().slice(0, 160);
      if (excerpt) lines.push(`- ${excerpt}`);
    }
  }

  return lines.join("\n");
}

export function buildProspectEmailPayload(
  prospect: ProspectEmailContext,
  agent: {
    agentName: string;
    agencyName: string;
    agentPhone: string;
    agentEmail: string;
  },
  options?: {
    tone?: "Professionnel" | "Chaleureux" | "Urgent";
    emailHistory?: EmailHistoryItem[];
  },
) {
  const isVendeur = prospect.categorie === "vendeur";
  const propertyType =
    prospect.type_bien?.trim() && prospect.type_bien.length > 2
      ? prospect.type_bien
      : "Appartement";

  return {
    ...agent,
    prospectName: prospect.nom,
    prospectEmail: prospect.email,
    prospectBudget: prospect.budget?.replace(/\D/g, "") || "",
    prospectSituation: mapCategorieToSituation(prospect.categorie),
    propertyType,
    propertyLocation: isVendeur ? prospect.adresse || "" : prospect.type_bien || "",
    propertyPrice: isVendeur ? prospect.budget?.replace(/\D/g, "") || "" : prospect.budget?.replace(/\D/g, "") || "",
    visitFeedback: mapTemperatureToFeedback(prospect.temperature),
    searchDelay: mapStatutToSearchDelay(prospect.statut),
    objections: "",
    personalInfo: buildPersonalInfo(prospect, options?.emailHistory ?? []),
    tone: options?.tone ?? "Professionnel",
    length: "Standard (10-15 lignes)" as const,
    prospectId: prospect.id,
  };
}
