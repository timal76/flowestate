import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/forgot-password";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description:
    "Réinitialisez votre mot de passe FlowEstate pour retrouver l’accès à votre espace agent immobilier.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Mot de passe oublié | FlowEstate",
    description:
      "Réinitialisez votre mot de passe FlowEstate pour retrouver l’accès à votre espace agent immobilier.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function ForgotPasswordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
