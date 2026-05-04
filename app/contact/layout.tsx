import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/contact";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Une question sur FlowEstate ? Contactez l’équipe : support, facturation ou suggestions. Réponse sous 24h les jours ouvrés.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Contact | FlowEstate",
    description:
      "Une question sur FlowEstate ? Contactez l’équipe : support, facturation ou suggestions. Réponse sous 24h les jours ouvrés.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function ContactLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
