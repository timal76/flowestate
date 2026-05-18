import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/tarifs";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Offres Starter et Pro FlowEstate : essai 14 jours, générations automatisées pour annonces, emails et comptes-rendus. Paiement sécurisé Stripe.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Tarifs | FlowEstate",
    description:
      "Offres Starter et Pro FlowEstate : essai 14 jours, générations automatisées pour annonces, emails et comptes-rendus. Paiement sécurisé Stripe.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function TarifsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
