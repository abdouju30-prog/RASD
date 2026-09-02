import type { Metadata } from "next";
import "./globals.css";
import { ChaineNav, type Jauge, type Station } from "@/components/ChaineNav";
import { FraicheurEphy } from "@/components/FraicheurEphy";
import { META, MATIERES_PORTEFEUILLE, PORTEFEUILLE } from "@/lib/data";
import { statsAlertes } from "@/lib/alertes";
import { fmtDate, usagesTotal } from "@/lib/logic";
import { candidats, statsSourcing } from "@/lib/sourcing";
import { NB_LIGNES_CHECKLIST } from "@/lib/dossier";

export const metadata: Metadata = {
  title: "Homologa — Tour de contrôle réglementaire",
  description: "Radar réglementaire, prospection de matières actives et usine à dossiers ONSSA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Les compteurs du ruban sont calculés ici, une fois, et restent visibles
  // sur tous les écrans : la chaîne dit en permanence où il y a du travail.
  const st = statsAlertes();
  const so = statsSourcing();
  const nbCibles = candidats().length;

  const stations: Station[] = [
    { href: "/", nom: "Radar", compteur: `${st.total} détections` },
    {
      href: "/veille",
      etape: "Étape 1",
      nom: "Signal",
      compteur: `${st.total} détections`,
      alerte: st.critiques,
    },
    {
      href: "/matieres",
      etape: "Étape 2",
      nom: "Matière active",
      compteur: `${MATIERES_PORTEFEUILLE.length} au portefeuille`,
    },
    {
      href: "/produits",
      etape: "Étape 3",
      nom: "Produits touchés",
      compteur: `${st.produitsTouches} / ${PORTEFEUILLE.length} · ${usagesTotal()} usages`,
    },
    {
      href: "/sourcing",
      etape: "Étape 4",
      nom: "Alternative",
      compteur: `${nbCibles} cibles`,
    },
    {
      href: "/fournisseurs",
      etape: "Étape 5",
      nom: "Fournisseur",
      compteur: `${so.nbGeneriques} génér. · ${so.parPays.length} pays`,
    },
    {
      href: "/dossiers",
      etape: "Étape 6",
      nom: "Dossier",
      compteur: `${NB_LIGNES_CHECKLIST} lignes · 3-B`,
    },
  ];

  const jauges: Jauge[] = [
    { libelle: "CRITIQUES", valeur: String(st.critiques), ton: "crit" },
    { libelle: "ÉLEVÉES", valeur: String(st.eleves), ton: "high" },
    { libelle: "DÉTECTIONS", valeur: String(st.total) },
  ];

  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=Roboto+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ChaineNav
          detenteur={META.detenteur}
          contexte={`index ONSSA ${fmtDate(META.genere.slice(0, 10))}`}
          stations={stations}
          jauges={jauges}
          fraicheur={<FraicheurEphy compact />}
        />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
