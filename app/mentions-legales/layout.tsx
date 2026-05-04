import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/mentions-legales";

export const metadata: Metadata = {
  title: "Mentions légales",
  description:
    "Mentions légales FlowEstate : éditeur, hébergement Vercel, contact, hébergement des données Supabase (UE).",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Mentions légales | FlowEstate",
    description:
      "Mentions légales FlowEstate : éditeur, hébergement Vercel, contact, hébergement des données Supabase (UE).",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function MentionsLegalesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
