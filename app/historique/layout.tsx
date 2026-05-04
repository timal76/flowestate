import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/historique";

export const metadata: Metadata = {
  title: "Historique",
  description:
    "Consultez l’historique de vos générations FlowEstate : annonces, emails et comptes-rendus, avec filtres et recherche.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Historique | FlowEstate",
    description:
      "Consultez l’historique de vos générations FlowEstate : annonces, emails et comptes-rendus, avec filtres et recherche.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function HistoriqueLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
