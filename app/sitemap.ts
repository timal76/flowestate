import type { MetadataRoute } from "next";

import { absoluteUrl, BASE_URL } from "@/lib/constants";

const ROUTES = [
  "",
  "/annonces",
  "/emails",
  "/comptes-rendus",
  "/tarifs",
  "/contact",
  "/cgu",
  "/mentions-legales",
  "/login",
  "/register",
  "/forgot-password",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((path) => ({
    url: path === "" ? BASE_URL : absoluteUrl(path),
    lastModified,
  }));
}
