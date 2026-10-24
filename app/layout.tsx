import type { Metadata } from "next";
import "./globals.css";
import { ChaineNav, type Station } from "@/components/ChaineNav";
import { NavAlternative } from "@/components/NavAlternative";
import { NavPortefeuille } from "@/components/NavPortefeuille";
import { FraicheurEphy } from "@/components/FraicheurEphy";
import { InstallerApp } from "@/components/InstallerApp";
import { SelecteurDetenteur } from "@/components/SelecteurDetenteur";
import { choisirDetenteur } from "./actions";
import { DETENTEURS, META, matieresDuPortefeuille, produitsDe } from "@/lib/data";
import { META_ESERVICE } from "@/lib/onssa-eservice";
import { detenteurActuel } from "@/lib/detenteur";
import { statsAlertes } from "@/lib/alertes";
import { fmtDate } from "@/lib/logic";
import { candidats, statsSourcing } from "@/lib/sourcing";
import { NB_LIGNES_CHECKLIST } from "@/lib/dossier";
import { STATS_SENTINELLE } from "@/lib/sentinelle";
import { gamme } from "@/lib/gamme";
import { STATS_MELANGES } from "@/lib/melanges";

export const metadata: Metadata = {
  title: "Rasd — veille réglementaire phytosanitaire",
  description: "Radar réglementaire, prospection de matières actives et usine à dossiers ONSSA",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Tout le ruban est calculé pour le détenteur courant : changer de société
  // recalcule les compteurs, pas seulement le contenu de la page.
  const d = await detenteurActuel();
  const st = statsAlertes(d.id);
  const so = statsSourcing();
  const nbCibles = candidats({ detenteurId: d.id }).length;
  const gm = gamme(d.id);

  const stations: Station[] = [
    {
      href: "/",
      nom: "Portefeuille",
      compteur: `${st.groupes} alertes`,
      alerte: st.groupesCritiques,
      aliases: ["/veille", "/matieres", "/produits", "/usages"],
    },
    {
      href: "/sourcing",
      nom: "Alternative",
      compteur: `${nbCibles} cibles`,
      aliases: ["/pistes", "/gamme", "/melanges", "/sentinelle", "/importation"],
    },
    {
      href: "/fournisseurs",
      nom: "Fournisseur",
      compteur: `${so.nbGeneriques} génér. · ${so.parPays.length} pays`,
      aliases: ["/constituants", "/annuaire"],
    },
    {
      href: "/dossiers",
      nom: "Dossier",
      compteur: `${NB_LIGNES_CHECKLIST} lignes · 3-B`,
    },
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
        {/* Application installable (16/10/2026). Site derrière la connexion Vercel : le manifeste est
            lu avec la session (use-credentials), sinon Brave ou Chrome ne crée qu'un raccourci.
            Next.js ne met use-credentials qu'en préproduction, d'où ce lien écrit à la main. */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#0d5c73" />
      </head>
      <body>
        <ChaineNav
          contexte={`index ONSSA ${fmtDate(META.genere.slice(0, 10))} · e-service ${fmtDate(META_ESERVICE.genere.slice(0, 10))}`}
          stations={stations}
          jauges={[]}
          selecteur={
            <SelecteurDetenteur
              detenteurs={DETENTEURS}
              courant={d.id}
              action={choisirDetenteur}
            />
          }
          fraicheur={<FraicheurEphy compact />}
        />
        <main className="main">
          <NavPortefeuille
            detections={st.groupes}
            matieres={matieresDuPortefeuille(d.id).length}
            produits={produitsDe(d.id).length}
          />
          <NavAlternative
            cibles={nbCibles}
            pistes={gm.manques.length + STATS_MELANGES.nbPretes + STATS_SENTINELLE.nbASaisir}
          />
          {children}
        </main>
        <InstallerApp />
      </body>
    </html>
  );
}
