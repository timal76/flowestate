import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/tarifs";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Offres Découverte, Essentiel, Pro et Expert FlowEstate : 5 générations gratuites par mois sans carte bancaire, puis plans payants avec facturation immédiate.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Tarifs | FlowEstate",
    description:
      "Offres Découverte, Essentiel, Pro et Expert FlowEstate : 5 générations gratuites par mois sans carte bancaire, puis plans payants avec facturation immédiate.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function TarifsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
