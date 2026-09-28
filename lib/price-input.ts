/**
 * Saisie et affichage des montants (€) — sans troncature silencieuse.
 * Les champs prix utilisent type="text" + inputMode="numeric" (pas type="number")
 * pour éviter flèches / molette qui altèrent la valeur (ex: 1200000 → 1199999).
 */

/** Ne conserve que les chiffres. Aucune limite de longueur, aucun Math.min. */
export function sanitizePriceDigits(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/**
 * Formate un montant saisi (chiffres ou texte libre) en "1 200 000 €".
 * Réutilise toLocaleString("fr-FR") — même rendu que l'affichage existant.
 */
export function formatPriceEuros(raw: string): string {
  const digits = sanitizePriceDigits(raw);
  if (!digits) return "";
  const n = Number(digits);
  if (!Number.isFinite(n)) return `${digits} €`;
  return `${n.toLocaleString("fr-FR")} €`;
}
