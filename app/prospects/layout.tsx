import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/prospects";

export const metadata: Metadata = {
  title: "Prospects | FlowEstate",
  description: "Gérez vos prospects immobiliers",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Prospects | FlowEstate",
    description: "Gérez vos prospects immobiliers",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function ProspectsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
