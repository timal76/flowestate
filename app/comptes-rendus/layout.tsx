import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/comptes-rendus";

export const metadata: Metadata = {
  title: "Compte-rendu de visite",
  description:
    "Générez des comptes-rendus de visite professionnels, avec logo et signature, export PDF, via FlowEstate.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Compte-rendu de visite | FlowEstate",
    description:
      "Générez des comptes-rendus de visite professionnels, avec logo et signature, export PDF, via FlowEstate.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function ComptesRendusLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
