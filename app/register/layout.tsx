import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/register";

export const metadata: Metadata = {
  title: "Créer un compte",
  description:
    "Inscrivez-vous à FlowEstate : essai gratuit 14 jours, génération d’annonces, emails et comptes-rendus pour agents immobiliers.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Créer un compte | FlowEstate",
    description:
      "Inscrivez-vous à FlowEstate : essai gratuit 14 jours, génération d’annonces, emails et comptes-rendus pour agents immobiliers.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
