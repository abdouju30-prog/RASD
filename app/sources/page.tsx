import Link from "next/link";
import { Database, PenLine, FileCheck2, Factory, Globe, ShieldAlert, RefreshCw, Scale } from "lucide-react";
import { META, MATIERES, FOURNISSEURS, PRODUITS, DETENTEURS } from "@/lib/data";
import { META_ESERVICE } from "@/lib/onssa-eservice";
import { COUVERTURE } from "@/lib/reglementaire";
import { STATS_EPHY, fraicheurEphy } from "@/lib/ephy";
import { STATS_APVMA, fraicheurApvma } from "@/lib/apvma";
import { STATS_PISTES } from "@/lib/pistes";
import { STATS_ICAMA } from "@/lib/icama";
import { STATS_EPA } from "@/lib/epa";
import { STATS_BKU } from "@/lib/bku";
import { FOURNISSEURS_RENSEIGNES } from "@/lib/packs-fournisseur";
import { fmtDate } from "@/lib/logic";
import { LIBELLE_ETAT, REGISTRES, STATS_OCDE, type EtatRegistre } from "@/lib/ocde";
import { META_REGISTRES_OUVERTS, REGISTRES_OUVERTS } from "@/lib/registres-ouverts";
import { STATS_COREE } from "@/lib/coree";
import { STATS_ONSSA_TEXTES } from "@/lib/onssa-reglementation";
import { Aide, Figure } from "@/components/Aide";
import { SchemaChaine, SchemaDossier, SchemaSourcing } from "@/components/Schemas";
import { STATS_CHECKLIST } from "@/lib/checklist-onssa";

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
    <tr>
      <td style={{ whiteSpace: "nowrap", verticalAlign: "top" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600 }}>
          {icone}
          {nom}
        </span>
      </td>
      <td style={{ verticalAlign: "top" }}>
        <div style={{ fontSize: 12.5 }}>{role}</div>
        <Aide titre="Détail">
          <p style={{ marginTop: 0 }}>{contenu}</p>
          <p className="mono" style={{ fontSize: 11 }}>{origine}</p>
          {reserve && <p style={{ color: "var(--high)" }}>{reserve}</p>}
        </Aide>
      </td>
      <td className="mono" style={{ fontSize: 11.5, color: "var(--muted)", verticalAlign: "top" }}>
        {maj ?? "—"}
      </td>
      <td style={{ verticalAlign: "top" }}>
        <span
          className="pill"
          style={{
            fontSize: 9.5,
            whiteSpace: "nowrap",
            color: t.couleur,
            borderColor: `color-mix(in srgb, ${t.couleur} 40%, transparent)`,
            background: `color-mix(in srgb, ${t.couleur} 9%, transparent)`,
          }}
        >
          {t.libelle}
        </span>
      </td>
    </tr>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// LA CARTE DES REGISTRES
//
// L'OCDE n'ouvre aucun annuaire d'usines. Sa liste sert d'autre chose : elle
// désigne les administrations qui ont l'habitude de publier. Et un registre
// ouvert nomme des sociétés du monde entier — c'est ainsi que 327 sociétés
// indiennes sont entrées dans l'outil alors que l'Inde ne publie rien.
//
// « Répond » veut dire 200 à la date du relevé. Pas « exploitable ».
// ────────────────────────────────────────────────────────────────────────────

const TON_ETAT: Record<EtatRegistre, string> = {
  integre: "var(--low)",
  atteignable: "var(--info)",
  ferme: "var(--high)",
  inexplore: "var(--mod)",
};

function CarteRegistres() {
  return (
    <Aide titre={`Registres nationaux — ${STATS_OCDE.nbIntegres} intégrés, ${STATS_OCDE.nbAtteignables} à ouvrir`}>
      <div>

        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "9px 0 4px", lineHeight: 1.6, maxWidth: "88ch" }}>
          L&apos;OCDE compte {STATS_OCDE.nbMembres} membres et {STATS_OCDE.nbAdherents} pays non
          membres adhérant à l&apos;Acceptation Mutuelle des Données — dont l&apos;Inde et le Brésil.
          Cette liste sert ici de <strong>carte de prospection</strong> : ce sont les administrations
          qui publient. Aucune ne délivre d&apos;annuaire de fournisseurs ; toutes nomment des
          sociétés, et pas seulement les leurs.
        </p>

        <table className="tbl" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Pays</th>
              <th>Autorité</th>
              <th>État</th>
              <th>Ce qu&apos;il nomme</th>
              <th>Constat</th>
            </tr>
          </thead>
          <tbody>
            {REGISTRES.map((r) => (
              <tr key={`${r.pays}-${r.autorite}`}>
                <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{r.pays}</td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="link-accent">
                    {r.autorite}
                  </a>
                </td>
                <td>
                  <span
                    className="pill"
                    style={{
                      fontSize: 10,
                      whiteSpace: "nowrap",
                      color: TON_ETAT[r.etat],
                      borderColor: `color-mix(in srgb, ${TON_ETAT[r.etat]} 38%, transparent)`,
                    }}
                  >
                    {LIBELLE_ETAT[r.etat]}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 240 }}>{r.nomme}</td>
                <td style={{ fontSize: 11.5, color: "var(--muted-2)", maxWidth: 380, lineHeight: 1.5 }}>
                  {r.constat}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: 11.5, color: "var(--high)", marginTop: 12, lineHeight: 1.55, maxWidth: "88ch" }}>
          L&apos;AMD lie les pays qui y adhèrent. <strong>Le Maroc n&apos;en est pas.</strong> Une
          étude BPL faite en Inde ou au Brésil est donc un argument solide devant l&apos;ONSSA, pas
          un droit opposable — au même titre que le recoupement australien.
        </p>
      </div>
    </Aide>
  );
}

export default function SourcesPage() {
  const f = fraicheurEphy();
  const a = fraicheurApvma();

  return (
    <>
      <h1>Sources</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "4px 0 14px" }}>
        <RefreshCw size={12} style={{ display: "inline", verticalAlign: -1 }} /> E-Phy{" "}
        <span style={{ color: f.etat === "à jour" ? "var(--low)" : "var(--mod)" }}>{f.etat}</span>
        {f.jours !== null && ` (${f.jours} j)`} · APVMA{" "}
        <span style={{ color: a.etat === "à jour" ? "var(--low)" : "var(--mod)" }}>{a.etat}</span>
        {a.jours !== null && ` (${a.jours} j)`} · index ONSSA {fmtDate(META.genere.slice(0, 10))} ·
        mise à jour automatique
      </p>

      <div className="card" style={{ padding: "6px 16px" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Source</th>
              <th>Ce qu&apos;elle apporte</th>
              <th>Mise à jour</th>
              <th>Fiabilité</th>
            </tr>
          </thead>
          <tbody>
          <Compartiment
            icone={<Database size={15} color="var(--accent)" />}
            nom="Index ONSSA"
            role="Le socle — tout le reste s'y rattache"
            contenu={`${META.nbLignesIndex.toLocaleString("fr")} lignes, ${META.nbProduitsIndex} produits, ${META.nbDetenteurs} détenteurs, ${MATIERES.length} matières actives, ${FOURNISSEURS.length} fournisseurs. ${DETENTEURS.length} détenteurs couverts, ${PRODUITS.length} produits avec AMM, dates, usages, doses et DAR.`}
            origine={META.source}
            maj={`IndPesticide ${fmtDate(META.genere.slice(0, 10))} · registres ${fmtDate(META_ESERVICE.genere.slice(0, 10))}`}
            fiabilite="source"
          />

          <Compartiment
            icone={<Scale size={15} color="var(--accent)" />}
            nom="Textes ONSSA"
            role="Ce que l'Office publie la semaine où ça sort"
            contenu={`${STATS_ONSSA_TEXTES.nbTextes} textes (avis, listes, lois, décrets, arrêtés) relevés sur eservice.onssa.gov.ma/Reglementation_N.aspx. ${STATS_ONSSA_TEXTES.nbRecents} des trois dernières semaines. Ce n'est pas l'index des AMM.`}
            origine={STATS_ONSSA_TEXTES.attribution}
            maj={`relevé le ${STATS_ONSSA_TEXTES.releveFmt} · cron jeudi`}
            fiabilite="source"
            reserve="Seuls les textes du Bulletin Officiel font foi. L'index phytosanitaire (IndPesticide.aspx) reste la source des matières actives et des AMM."
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
            icone={<Factory size={15} color="var(--info)" />}
            nom="ICAMA · Chine"
            role="Qui fabrique la matière active"
            contenu={`${STATS_ICAMA.nbMatieres} matières actives relevées, ${STATS_ICAMA.nbSocietes} sociétés détenant une homologation chinoise de matière active technique (原药), dont ${STATS_ICAMA.nbFabricants} avec licence de production — les usines. Croisement de deux registres publics : homologation TC et licence de production.`}
            origine={STATS_ICAMA.attribution}
            maj={`${STATS_ICAMA.nbLicences} licences de production`}
            fiabilite="source"
            reserve="Aucune valeur réglementaire au Maroc : ni voie me-too, ni étude en moins. Une licence n'est pas un audit — ni prix, ni capacité, ni qualité."
          />

          <Compartiment
            icone={<Factory size={15} color="var(--info)" />}
            nom="PSIS · Corée du Sud"
            role="Quand une molécule arrive — le seul registre daté"
            contenu={`${STATS_COREE.nbHomologations.toLocaleString("fr")} homologations coréennes, ${STATS_COREE.nbSocietes} sociétés dont ${STATS_COREE.nbFiliales} filiales de groupes étrangers, sur ${STATS_COREE.nbMatieresIndex} matières actives de l'index marocain. Chaque homologation porte sa date au jour et l'export est régénéré quotidiennement : c'est le seul compartiment où l'on voit ENTRER une molécule. Membre de l'OCDE et pays de production générique — la combinaison est rare.`}
            origine={STATS_COREE.attribution}
            maj={`dernière homologation ${STATS_COREE.derniereHomologation ?? "—"}`}
            fiabilite="source"
            reserve="« 제조 » désigne un produit fabriqué en Corée, pas une matière active synthétisée : ce registre nomme le titulaire de l'homologation, pas l'usine de synthèse. Les raisons sociales sont romanisées — une poignée pour chercher, pas une identité contractuelle."
          />

          <Compartiment
            icone={<Factory size={15} color="var(--info)" />}
            nom="BKÜ · Turquie"
            role="Qui fabrique sur place"
            contenu={`${STATS_BKU.nbProduits.toLocaleString("fr")} homologations turques, ${STATS_BKU.nbImal.toLocaleString("fr")} fabriquées en Turquie (İMAL) contre ${STATS_BKU.nbIthal.toLocaleString("fr")} importées (İTHAL). ${STATS_BKU.nbFabricants} sociétés fabriquent sur place, sur ${STATS_BKU.nbMatieresMaroc} matières actives de l'index marocain.`}
            origine={STATS_BKU.attribution}
            maj={`${STATS_BKU.nbSocietes} sociétés`}
            fiabilite="source"
            reserve="İMAL désigne une fabrication en Turquie, pas nécessairement la synthèse de la matière active : une formulation locale à partir d'un technique importé porte la même mention."
          />

          <Compartiment
            icone={<Factory size={15} color="var(--info)" />}
            nom="EPA · établissements"
            role="Où sont les usines"
            contenu={`${STATS_EPA.nbEtrangers.toLocaleString("fr")} sites de production hors États-Unis, dans ${STATS_EPA.nbPays} pays, avec adresse et ville. ${STATS_EPA.nbFournisseursAvecUsine} fournisseurs de l'index y sont retrouvés : un titulaire devient un producteur situé. Seule voie vers l'Inde et la Turquie.`}
            origine={STATS_EPA.attribution}
            maj="domaine public"
            fiabilite="source"
            reserve="Dit qui produit et où, jamais quoi : aucune matière active. Couvre aussi les « devices » — emballages, cosmétiques, désinfectants — sans colonne pour les distinguer."
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
          </tbody>
        </table>
      </div>

      <div className="section" style={{ display: "grid", gap: 8, maxWidth: "92ch" }}>

        <Aide titre="Ce que l'outil n'invente jamais">
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
        </Aide>

        <Aide titre="Schémas : boucle de décision, dossier 3-B, cibles de prospection">
          <Figure titre="La boucle de décision" legende="ce que le ruban de navigation matérialise">
            <SchemaChaine />
          </Figure>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
            <Figure titre="Structure du dossier ONSSA" legende={`Annexe 3-B · ${STATS_CHECKLIST.nbItems} lignes`}>
              <SchemaDossier />
            </Figure>
            <Figure titre="Conditions d'une cible de prospection" legende="la troisième est décisive">
              <SchemaSourcing />
            </Figure>
          </div>
        </Aide>

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
            Tout est automatique, par les tâches GitHub : chaque jour pour la France (E-Phy),
            l&apos;Australie, le Brésil et la Corée ; le jeudi pour les textes, les listes et
            l&apos;index ONSSA ; le 1er et le 16 du mois pour la Chine, la Turquie, les États-Unis, la
            Russie et les registres ouverts. Une tâche ne commite que si une donnée a changé :
            l&apos;historique git est le journal de veille, et chaque commit met le site à jour.
          </p>
          <p>
            À la main si besoin : <span className="mono">npm run veille</span>,{" "}
            <span className="mono">npm run import</span> pour l&apos;index ONSSA.
          </p>
        </Aide>

        <Aide titre={`Registres ajoutés — relevé du ${META_REGISTRES_OUVERTS.releve}`}>
        <div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 12px", lineHeight: 1.55, maxWidth: "88ch" }}>
            {META_REGISTRES_OUVERTS.avertissement}
          </p>
          <div className="grille" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {REGISTRES_OUVERTS.map((r) => (
              <div key={r.id} id={`reg-${r.id}`} className="bloc">
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontFamily: "var(--tete)", fontWeight: 600 }}>{r.pays}</span>
                  <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted-2)" }}>
                    {r.nbSocietes} sociétés
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>{r.autorite}</div>
                <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5, margin: "8px 0" }}>{r.nomme}</p>
                <a href={r.url} target="_blank" rel="noreferrer" className="link-accent" style={{ fontSize: 12 }}>
                  Ouvrir la source
                </a>
                <p style={{ fontSize: 11.5, color: "var(--high)", marginTop: 8, lineHeight: 1.45 }}>{r.avertissement}</p>
              </div>
            ))}
          </div>
        </div>
        </Aide>
        <CarteRegistres />
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 20 }}>
        <Link href="/" className="link-accent">Retour au radar</Link>
      </p>
    </>
  );
}
