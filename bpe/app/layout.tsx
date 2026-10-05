import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f4d32",
};

export const metadata: Metadata = {
  title: { default: "BPE", template: "%s — BPE" },
  description:
    "Procédures d'expérimentation, spectre cultures et matières actives, mélanges. Lecture seule de l'extrait Homologa.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
