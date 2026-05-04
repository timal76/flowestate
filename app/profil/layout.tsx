import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/profil";

export const metadata: Metadata = {
  title: "Profil",
  description:
    "Gérez votre profil FlowEstate : identité, agence, logo, signature, abonnement Stripe et statistiques de génération.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Profil | FlowEstate",
    description:
      "Gérez votre profil FlowEstate : identité, agence, logo, signature, abonnement Stripe et statistiques de génération.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function ProfilLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
