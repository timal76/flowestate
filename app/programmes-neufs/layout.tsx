import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/programmes-neufs";

export const metadata: Metadata = {
  title: "Programmes neufs",
  description:
    "Générez 3 annonces différenciantes (Leboncoin, SeLoger, site propre) à partir d'une plaquette promoteur, via FlowEstate.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Programmes neufs | FlowEstate",
    description:
      "Générez 3 annonces différenciantes (Leboncoin, SeLoger, site propre) à partir d'une plaquette promoteur, via FlowEstate.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function ProgrammesNeufsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
