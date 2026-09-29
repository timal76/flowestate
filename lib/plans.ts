/** Source de vérité des quotas et limites par plan. */

export const FREE_CLASSIC_GIFTED_LIMIT = 5;
export const FREE_PROGRAMMES_NEUFS_GIFTED_LIMIT = 1;

export const ESSENTIEL_MONTHLY_LIMIT = 40;
export const PRO_MONTHLY_LIMIT = 150;
export const PRO_PROGRAMMES_NEUFS_MONTHLY_LIMIT = 5;

export const ESSENTIEL_ACTIVE_PROSPECTS_LIMIT = 50;

/** Types de générations « classiques » (hors Programmes neufs). */
export const CLASSIC_GENERATION_TYPES = ["annonce", "email", "compte-rendu"] as const;
export type ClassicGenerationType = (typeof CLASSIC_GENERATION_TYPES)[number];

export type PlanId = "free" | "essentiel" | "pro" | "expert";
export type PaidPlanId = "essentiel" | "pro" | "expert";
export type QuotaType = "classic" | "programmes-neufs" | "crm-prospects";

/** Compat : anciens noms exportés. */
export const FREE_MONTHLY_LIMIT = FREE_CLASSIC_GIFTED_LIMIT;

/**
 * Montants affichés (centimes EUR).
 * Annuel : 499€ / 999€ / 1999€ → −15% Essentiel, −16% Pro/Expert.
 */
export const PLAN_AMOUNTS_CENTS = {
  essentiel: { monthly: 4900, annual: 49900 },
  pro: { monthly: 9900, annual: 99900 },
  expert: { monthly: 19900, annual: 199900 },
} as const;

export function annualDiscountPercent(plan: PaidPlanId): number {
  const { monthly, annual } = PLAN_AMOUNTS_CENTS[plan];
  const fullYear = monthly * 12;
  if (fullYear <= 0) return 0;
  return Math.round(((fullYear - annual) / fullYear) * 100);
}

