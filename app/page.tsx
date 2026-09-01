import type { Metadata } from "next";

import VisitorModal from "@/components/onboarding/VisitorModal";

import HomePage from "./home-client";

export const metadata: Metadata = {
  /** absolute évite « … | FlowEstate » alors que ce titre inclut déjà la marque. */
  title: {
    absolute: "FlowEstate — Moins de tâches, plus de ventes",
  },
  description:
    "Automatisez vos annonces immobilières, emails de relance et comptes-rendus de visite. 5 générations gratuites par mois, sans carte bancaire.",
  openGraph: {
    title: "FlowEstate — Moins de tâches, plus de ventes",
    description:
      "Automatisez vos annonces immobilières, emails de relance et comptes-rendus de visite. 5 générations gratuites par mois, sans carte bancaire.",
    url: "https://flowestate.fr",
  },
};

export default function Page() {
  return (
    <>
      <HomePage />
      <VisitorModal />
    </>
  );
}
