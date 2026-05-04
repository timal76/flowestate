import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://flowestate.fr"),
  title: {
    default: "FlowEstate — Moins de tâches, plus de ventes",
    template: "%s | FlowEstate",
  },
  description:
    "SaaS d'automatisation pour agents immobiliers. Générez annonces, emails de relance et comptes-rendus de visite en quelques secondes.",
  openGraph: {
    siteName: "FlowEstate",
    url: "https://flowestate.fr",
    type: "website",
    locale: "fr_FR",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
