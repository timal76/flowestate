import type { Metadata } from "next";

import { absoluteUrl } from "@/lib/constants";

const CANONICAL_PATH = "/emails";

export const metadata: Metadata = {
  title: "Emails de relance",
  description:
    "Rédigez des emails de relance personnalisés pour vos prospects immobiliers avec FlowEstate et votre signature dynamique.",
  alternates: { canonical: CANONICAL_PATH },
  openGraph: {
    title: "Emails de relance | FlowEstate",
    description:
      "Rédigez des emails de relance personnalisés pour vos prospects immobiliers avec FlowEstate et votre signature dynamique.",
    url: absoluteUrl(CANONICAL_PATH),
  },
};

export default function EmailsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
