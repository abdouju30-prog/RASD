import Link from "next/link";
import { Database, PenLine, FileCheck2, Globe, ShieldAlert } from "lucide-react";
import { Figure, Aide } from "@/components/Aide";
import { SchemaSources, SchemaChaine, SchemaDossier, SchemaSourcing } from "@/components/Schemas";
import { META, MATIERES, FOURNISSEURS, PRODUITS, DETENTEURS } from "@/lib/data";
import { COUVERTURE } from "@/lib/reglementaire";
import { STATS_EPHY, fraicheurEphy } from "@/lib/ephy";
import { STATS_APVMA, fraicheurApvma } from "@/lib/apvma";
import { STATS_PISTES } from "@/lib/pistes";
import { RefreshCw } from "lucide-react";
import { STATS_CHECKLIST } from "@/lib/checklist-onssa";
import { FOURNISSEURS_RENSEIGNES } from "@/lib/packs-fournisseur";
import { fmtDate } from "@/lib/logic";

export const dynamic = "force-dynamic";

/**
 * Page « Compartiments ».
 *
 * Elle répond à une seule question : d'où vient chaque chiffre, et jusqu'où on
 * peut s'y fier. Les avertissements de méthode vivent ici plutôt que d'occuper
 * chaque écran de travail.
 */

type Fiabilite = "source" | "saisie" | "deduit";

const TON: Record<Fiabilite, { libelle: string; couleur: string }> = {
  source: { libelle: "source officielle", couleur: "var(--low)" },
  saisie: { libelle: "saisie manuelle", couleur: "var(--mod)" },
  deduit: { libelle: "déduit", couleur: "var(--high)" },
};

function Compartiment({
  icone,
  nom,
  role,
  contenu,
  origine,
  fiabilite,
  maj,
  reserve,
}: {
  icone: React.ReactNode;
  nom: string;
  role: string;
  contenu: string;
  origine: string;
  fiabilite: Fiabilite;
  maj?: string | null;
  reserve?: string;
}) {
  const t = TON[fiabilite];
  return (
    <div className="bloc">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        {icone}
        <span style={{ fontFamily: "var(--tete)", fontSize: 14, fontWeight: 600 }}>{nom}</span>
        <span
          className="pill"
          style={{
            marginLeft: "auto",
            fontSize: 9.5,
            color: t.couleur,
            borderColor: `color-mix(in srgb, ${t.couleur} 40%, transparent)`,
            background: `color-mix(in srgb, ${t.couleur} 9%, transparent)`,
          }}
        >
          {t.libelle}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>{role}</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.55 }}>{contenu}</div>
      <div
        style={{
          fontSize: 11,
          color: "var(--muted-2)",
          marginTop: 9,
          paddingTop: 8,
          borderTop: "1px solid var(--border)",
          lineHeight: 1.5,
        }}
      >
        <span className="mono">{origine}</span>
        {maj && <> · {maj}</>}
      </div>
      {reserve && (
        <div style={{ fontSize: 11.5, color: "var(--high)", marginTop: 7, lineHeight: 1.5 }}>{reserve}</div>
      )}
    </div>
  );
}

export default function SourcesPage() {
  const f = fraicheurEphy();
  const a = fraicheurApvma();
  const aRafraichir = f.etat !== "à jour" || a.etat !== "à jour";

  return (
    <>
      <div className="fil">Compartiments</div>
      <h1>D&apos;où vient chaque chiffre</h1>
      <p className="chapeau">
        Cinq compartiments de données, trois niveaux de fiabilité. Les réserves de méthode sont ici
        plutôt que sur les écrans de travail.
      </p>

      <Figure
        titre="Hiérarchie des sources"
        legende="une seule source gouverne la décision marocaine"
      >
        <SchemaSources />
      </Figure>

      <div
        className="card"
        style={{
          padding: "13px 17px",
          marginTop: 16,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          borderColor: aRafraichir
            ? "color-mix(in srgb, var(--mod) 40%, transparent)"
            : "color-mix(in srgb, var(--low) 32%, transparent)",
        }}
      >
        <RefreshCw
          size={16}
          color={aRafraichir ? "var(--mod)" : "var(--low)"}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 7 }}>
            <span>
              <strong style={{ color: "var(--fg)" }}>E-Phy</strong>{" "}
              <span style={{ color: f.etat === "à jour" ? "var(--low)" : "var(--mod)" }}>
                {f.etat}
              </span>
              {f.jours !== null && <span className="mono"> · {f.jours} j</span>}
            </span>
            <span>
              <strong style={{ color: "var(--fg)" }}>APVMA</strong>{" "}
              <span style={{ color: a.etat === "à jour" ? "var(--low)" : "var(--mod)" }}>
                {a.etat}
              </span>
              {a.jours !== null && <span className="mono"> · {a.jours} j</span>}
            </span>
            <span>
              <strong style={{ color: "var(--fg)" }}>Index ONSSA</strong>{" "}
              <span className="mono">{fmtDate(META.genere.slice(0, 10))}</span>
            </span>
          </div>
          {aRafraichir ? (
            <>
              Une source a pris du retard. Rafraîchir les deux catalogues, commiter ce qui a changé et
              déployer, en une commande : <span className="mono">npm run maj</span>
            </>
          ) : (
            <>
              Les deux catalogues publics sont à jour. Pour les rafraîchir manuellement :{" "}
              <span className="mono">npm run maj</span>
            </>
          )}
          <div style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 7 }}>
            La mise à jour ne peut pas se déclencher depuis l&apos;application déployée : le système
            de fichiers y est en lecture seule, et l&apos;archive APVMA fait 23 Mo. Elle se fait sur
            un poste, ou par le workflow GitHub du jeudi.
          </div>
        </div>
      </div>

      <div className="section">
        <span className="h-title">Les cinq compartiments</span>
        <div className="grille" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          <Compartiment
            icone={<Database size={15} color="var(--accent)" />}
            nom="Index ONSSA"
            role="Le socle — tout le reste s'y rattache"
            contenu={`${META.nbLignesIndex.toLocaleString("fr")} lignes, ${META.nbProduitsIndex} produits, ${META.nbDetenteurs} détenteurs, ${MATIERES.length} matières actives, ${FOURNISSEURS.length} fournisseurs. ${DETENTEURS.length} détenteurs couverts, ${PRODUITS.length} produits avec AMM, dates, usages, doses et DAR.`}
            origine={META.source}
            maj={`importé le ${fmtDate(META.genere.slice(0, 10))}`}
            fiabilite="source"
          />

          <Compartiment
            icone={<ShieldAlert size={15} color="var(--crit)" />}
            nom="ANSES · E-Phy"
            role="Gouverne l'ONSSA — signal de tête"
            contenu={`${STATS_EPHY.nbSubstances} substances françaises : inscription au règlement, produits autorisés et retirés. Un retrait en France annonce le retrait marocain.`}
            origine={STATS_EPHY.attribution}
            maj={f.maj ? `${f.etat}, ${f.jours} j` : undefined}
            fiabilite="source"
          />

          <Compartiment
            icone={<Globe size={15} color="var(--info)" />}
            nom="APVMA · Australie"
            role="Recoupe un statut, et nomme des fabricants"
            contenu={`${STATS_APVMA.nbConstituants} constituants, dont ${STATS_APVMA.nbAutorisees} autorisés en agriculture. Deux usages : contester ou confirmer une décision européenne hors du référentiel européen, et lire les ${STATS_PISTES.nbSocietes} sociétés détentrices — dont ${STATS_PISTES.nbNouvelles} génériqueurs absents de l'index marocain. N'entre pas dans le score de risque.`}
            origine={STATS_APVMA.attribution}
            maj={STATS_APVMA.licence}
            fiabilite="source"
            reserve="Registre de l'état courant, sans historique : « absente » peut vouloir dire « jamais homologuée ». Et une homologation australienne n'ouvre aucun droit devant l'ONSSA."
          />

          <Compartiment
            icone={<PenLine size={15} color="var(--mod)" />}
            nom="Fiches réglementaires UE"
            role="Statut d'approbation et drapeaux de danger"
            contenu={`${COUVERTURE.nbFiches} fiches saisies, ${COUVERTURE.nbVerifiees} vérifiées sur source citable. Portent les échéances UE et les signaux CMR, perturbateur endocrinien, toxicité abeilles.`}
            origine={COUVERTURE.source}
            maj={`consultée le ${fmtDate(COUVERTURE.date)}`}
            fiabilite="saisie"
            reserve="Échéance dépassée = à recouper d'urgence, pas « substance interdite » : la Commission prolonge fréquemment par règlement d'exécution."
          />

          <Compartiment
            icone={<FileCheck2 size={15} color="var(--accent)" />}
            nom="Agréments fournisseurs"
            role="Qui peut porter le dossier"
            contenu={`${FOURNISSEURS_RENSEIGNES} fournisseur(s) renseigné(s) sur ${FOURNISSEURS.length}. Paquets d'études déclarés : BPL, toxicité aiguë, physico-chimie, écotoxicologie, analyse de lots.`}
            origine="data/fournisseurs-packs.json"
            maj="saisie sur brochures et consultations"
            fiabilite="deduit"
            reserve="Déclaratif : ce que le fournisseur affirme détenir. Les études doivent être réclamées et lues avant engagement."
          />
        </div>
      </div>

      <div className="section">
        <span className="h-title">Ce que l&apos;outil n&apos;invente jamais</span>
        <div className="grille" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {[
            ["Le chiffre d'affaires", "Absent de l'index. Optionnel dans data/ca.json. Sans lui, l'exposition se mesure en produits et usages."],
            ["Les prix fournisseurs", "Absents de l'index. Le classement mesure l'accessibilité — le nombre de génériques en concurrence."],
            ["Un score sans fiche", "Une molécule sans statut vérifié affiche « risque non évalué », jamais une estimation."],
            ["Un fournisseur « nouveau »", "Le rattachement à l'index se fait sur le nom : « absente » veut dire absente sous ce nom-là. Une parenté probable est signalée « groupe probable », jamais tranchée."],
          ].map(([t, d]) => (
            <div key={t} className="bloc">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5 }}>{t}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <Figure titre="La boucle de décision" legende="ce que le ruban de navigation matérialise">
          <SchemaChaine />
        </Figure>
      </div>

      <div className="section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Figure titre="Structure du dossier ONSSA" legende={`Annexe 3-B · ${STATS_CHECKLIST.nbItems} lignes`}>
          <SchemaDossier />
        </Figure>
        <Figure titre="Conditions d'une cible de prospection" legende="la troisième est décisive">
          <SchemaSourcing />
        </Figure>
      </div>

      <div className="section" style={{ display: "grid", gap: 8, maxWidth: "92ch" }}>
        <Aide titre="Pourquoi l'ANSES et pas l'Union européenne">
          <p>
            L&apos;ONSSA s&apos;aligne sur l&apos;ANSES : le retrait d&apos;une matière active en
            France annonce son retrait au Maroc. Le statut UE est <strong>en amont et plus lent</strong> —
            il décrit l&apos;approbation de la substance, pas la disponibilité réelle des produits.
          </p>
          <p>
            Une substance peut rester approuvée en UE alors qu&apos;aucun produit français n&apos;est
            plus autorisé : c&apos;est un retrait commercial. Il pèse moins qu&apos;un retrait
            réglementaire, l&apos;ONSSA ne le suivant pas mécaniquement.
          </p>
        </Aide>

        <Aide titre="Ce que l'usine à dossiers produit — et ce qu'elle ne produit pas">
          <p>
            Elle produit la structure des {STATS_CHECKLIST.nbItems} lignes du formulaire, le détenteur
            de chaque donnée, l&apos;exigence BPL, la part allégeable par référence, et les usages
            revendicables avec leur précédent.
          </p>
          <p>
            Elle ne produit <strong>pas</strong> les études : toxicologie, écotoxicologie, résidus et
            méthodes d&apos;analyse appartiennent au fournisseur ou relèvent d&apos;un laboratoire
            accrédité. Le dossier est prêt à être <em>constitué</em>, pas à être déposé.
          </p>
        </Aide>

        <Aide titre="Mise à jour des sources">
          <p>
            L&apos;Anses republie E-Phy chaque nuit de mardi à mercredi, l&apos;APVMA chaque semaine.
            Le workflow <span className="mono">maj-ephy</span> les récupère le jeudi et ne commite que
            si un statut a changé — l&apos;historique git devient le journal de veille.
          </p>
          <p>
            À la main : <span className="mono">npm run import:ephy</span>,{" "}
            <span className="mono">npm run import:apvma</span>,{" "}
            <span className="mono">npm run import</span> pour l&apos;index ONSSA.
          </p>
        </Aide>
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 20 }}>
        <Link href="/" className="link-accent">Retour au radar</Link>
      </p>
    </>
  );
}
