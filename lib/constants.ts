/** URL canonique du site (metadata, SEO, liens absolus côté rendu). */
export const BASE_URL = "https://flowestate.fr" as const;

/** URL absolue pour une route (ex: `/tarifs` → `https://flowestate.fr/tarifs`). */
export function absoluteUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return path === "/" ? BASE_URL : `${BASE_URL}${path}`;
}
