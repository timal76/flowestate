import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/prospects";
const PAGE_TITLE = "Prospects | FlowEstate";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: "Gérez vos prospects immobiliers",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: "Gérez vos prospects immobiliers",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function ProspectsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
