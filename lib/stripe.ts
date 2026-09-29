import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error stripe v22 : LatestApiVersion typé différemment de la chaîne projet.
  apiVersion: "2024-06-20",
});

/** Prix v2 (grille 49 / 99 / 199) — checkouts. */
export const ESSENTIEL_MONTHLY = "price_1UKy1jKNbVXHUT7xXc2KVKN3";
export const ESSENTIEL_ANNUAL = "price_1UKy1jKNbVXHUT7xUejrTspG";
export const PRO_MONTHLY = "price_1UKy2rKNbVXHUT7xzXoyNxnu";
export const PRO_ANNUAL = "price_1UKy3HKNbVXHUT7xGccP4UGs";
export const EXPERT_MONTHLY = "price_1UKy4VKNbVXHUT7xBwU4PKgK";
export const EXPERT_ANNUAL = "price_1UKy4VKNbVXHUT7xtqMktokc";

/**
 * Anciens Price IDs conservés pour grandfathering (webhook + abonnés existants).
 * - v1 : grille 74,99 / 149,99 / 299,99
 * - v2-temp : IDs créés par erreur sur un autre compte Stripe (test)
 */
const LEGACY_STRIPE_PRICE_IDS = {
  essentiel: [
    "price_1TdVWPKNbVXHUT7x4WQnwopT",
    "price_1TdVWPKNbVXHUT7xalTZ49ot",
    "price_1UKwWL3R1uaUiLfZCrQPR9H4",
    "price_1UKwWL3R1uaUiLfZPccnsVWC",
  ],
  pro: [
    "price_1TdVXNKNbVXHUT7xOgpdGxfO",
    "price_1TdVXNKNbVXHUT7xt4fazE08",
    "price_1UKwWL3R1uaUiLfZYHpHL5OL",
    "price_1UKwWM3R1uaUiLfZI3O3cqa5",
  ],
  expert: [
    "price_1TdVYTKNbVXHUT7xZ804dBPm",
    "price_1TdVYTKNbVXHUT7xtm9XGQAz",
    "price_1UKwWM3R1uaUiLfZ1WEzJCb7",
    "price_1UKwWM3R1uaUiLfZ3V4K89TW",
  ],
} as const;

export const STRIPE_PRICE_IDS = {
  essentiel: {
    monthly: ESSENTIEL_MONTHLY,
    annual: ESSENTIEL_ANNUAL,
  },
  pro: {
    monthly: PRO_MONTHLY,
    annual: PRO_ANNUAL,
  },
  expert: {
    monthly: EXPERT_MONTHLY,
    annual: EXPERT_ANNUAL,
  },
} as const;

export type StripePlanId = keyof typeof STRIPE_PRICE_IDS;

export function getStripePriceId(plan: StripePlanId, billing: "monthly" | "annual"): string {
  return STRIPE_PRICE_IDS[plan][billing];
}

export function planFromStripePriceId(priceId: string): StripePlanId | null {
  for (const plan of Object.keys(STRIPE_PRICE_IDS) as StripePlanId[]) {
    const ids = STRIPE_PRICE_IDS[plan];
    if (ids.monthly === priceId || ids.annual === priceId) {
      return plan;
    }
    if ((LEGACY_STRIPE_PRICE_IDS[plan] as readonly string[]).includes(priceId)) {
      return plan;
    }
  }
  return null;
}
