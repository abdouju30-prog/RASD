import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { META } from "@/lib/data";

export const metadata: Metadata = {
  title: "Homologa — Tour de contrôle réglementaire",
  description: "Radar réglementaire, prospection de matières actives et usine à dossiers ONSSA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app">
          <Sidebar detenteur={META.detenteur} source={META.source} />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
