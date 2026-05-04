import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/login";

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à FlowEstate pour accéder aux outils : annonces, emails de relance et comptes-rendus de visite.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Connexion | FlowEstate",
    description:
      "Connectez-vous à FlowEstate pour accéder aux outils : annonces, emails de relance et comptes-rendus de visite.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
