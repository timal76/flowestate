import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/annonces";

export const metadata: Metadata = {
  title: "Générateur d'annonces",
  description:
    "Créez des annonces immobilières percutantes en quelques secondes avec l’automatisation FlowEstate : photos, ton, formats sur mesure.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Générateur d'annonces | FlowEstate",
    description:
      "Créez des annonces immobilières percutantes en quelques secondes avec l’automatisation FlowEstate : photos, ton, formats sur mesure.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function AnnoncesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
