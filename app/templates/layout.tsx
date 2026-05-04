import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/templates";

export const metadata: Metadata = {
  title: "Mes templates",
  description:
    "Retrouvez tous vos templates FlowEstate pour réutiliser vos structures d'annonces, d'e-mails et de comptes-rendus.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Mes templates | FlowEstate",
    description:
      "Retrouvez tous vos templates FlowEstate pour réutiliser vos structures d'annonces, d'e-mails et de comptes-rendus.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function TemplatesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
