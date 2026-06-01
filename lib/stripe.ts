import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error stripe v22 : LatestApiVersion typé différemment de la chaîne projet.
  apiVersion: "2024-06-20",
});

export const ESSENTIEL_MONTHLY = "price_1TdVWPKNbVXHUT7x4WQnwopT";
export const ESSENTIEL_ANNUAL = "price_1TdVWPKNbVXHUT7xalTZ49ot";
export const PRO_MONTHLY = "price_1TdVXNKNbVXHUT7xOgpdGxfO";
export const PRO_ANNUAL = "price_1TdVXNKNbVXHUT7xt4fazE08";
export const EXPERT_MONTHLY = "price_1TdVYTKNbVXHUT7xZ804dBPm";
export const EXPERT_ANNUAL = "price_1TdVYTKNbVXHUT7xtm9XGQAz";

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
  }
  return null;
}
