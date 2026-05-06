import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/relances";

export const metadata: Metadata = {
  title: "Relances | FlowEstate",
  description: "Gérez vos relances programmées",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Relances | FlowEstate",
    description: "Gérez vos relances programmées",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function RelancesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
