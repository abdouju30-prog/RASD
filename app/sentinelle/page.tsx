import Link from "next/link";
import { Radar, ArrowRight } from "lucide-react";
import { Aide } from "@/components/Aide";
import {
  A_ECARTER,
  A_SAISIR,
  A_VERIFIER,
  LIBELLE_ACCES,
  LIBELLE_FEU,
  NOUVELLES,
  STATS_SENTINELLE,
  type Candidate,
} from "@/lib/sentinelle";

export const dynamic = "force-dynamic";

/**
 * Page « Sentinelle » — la prise d'exclusivité.
 *
 * Tout le reste de l'outil défend le portefeuille contre les retraits. Cet
 * écran-ci cherche ce qu'on pourrait homologuer LE PREMIER au Maroc.
 *
 * ⚠️ IL DIT AUSSI CE QU'IL NE SAIT PAS, et ce n'est pas une précaution de
 * style : le brevet ne figure dans aucun registre ouvert. Une liste
 * d'occasions qui tairait ça enverrait acheter des molécules verrouillées.
 */

const TON_FEU: Record<string, string> = {
  vert: "var(--low)",
  orange: "var(--mod)",
  rouge: "var(--high)",
  inconnu: "var(--muted-2)",
};

function Ligne({ c }: { c: Candidate }) {
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>
        {c.iso ?? c.nomPt}
        {c.nouvelle && (
          <span
            className="pill"
            style={{
              fontSize: 9.5,
              marginLeft: 7,
              color: "var(--accent)",
              borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)",
              background: "var(--accent-fond)",
            }}
          >
            nouvelle
          </span>
        )}
        {c.iso && (
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted-2)" }}>
            {c.nomPt}
          </div>
        )}
      </td>
      <td style={{ fontSize: 12, color: "var(--muted)" }}>{c.groupeChimique ?? "—"}</td>
      <td
        className="mono"
        style={{ textAlign: "right", color: "var(--accent)", fontWeight: 600 }}
        title={`${LIBELLE_ACCES[c.acces]} · ${c.fabricants.length} fabricant(s) déclaré(s) au registre brésilien`}
      >
        {c.nbGeneriques}
      </td>
      <td style={{ fontSize: 12, color: "var(--muted)" }}>{c.paysGeneriques.join(" · ") || "—"}</td>
      <td className="mono" style={{ textAlign: "right", fontSize: 12 }}>
        {c.teneurMax ? `${c.teneurMax} g/kg` : "—"}
      </td>
      <td>
        <span
          className="pill"
          style={{
            fontSize: 10,
            whiteSpace: "nowrap",
            color: TON_FEU[c.feu],
            borderColor: `color-mix(in srgb, ${TON_FEU[c.feu]} 38%, transparent)`,
          }}
          title={LIBELLE_FEU[c.feu]}
        >
          {c.france
            ? `France · ${c.france.nbProduitsAutorises} produit(s)`
            : "France · inconnue"}
        </span>
      </td>
      <td className="mono" style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
        {c.nbHomologationsBr}
      </td>
    </tr>
  );
}

function Table({
  titre,
  lecture,
  liste,
  max = 20,
}: {
  titre: string;
  lecture: string;
  liste: Candidate[];
  max?: number;
}) {
  if (liste.length === 0) return null;
  return (
    <div className="card" style={{ padding: "18px 20px", marginBottom: 14 }}>
      <div className="h-title">
        {titre} — {liste.length}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 12px", lineHeight: 1.6, maxWidth: "92ch" }}>
        {lecture}
      </p>
      <table className="tbl">
        <thead>
          <tr>
            <th>Matière active</th>
            <th>Famille</th>
            <th style={{ textAlign: "right" }}>Usines gén.</th>
            <th>Pays</th>
            <th style={{ textAlign: "right" }}>Teneur max</th>
            <th>Statut France</th>
            <th style={{ textAlign: "right" }}>Hom. Brésil</th>
          </tr>
        </thead>
        <tbody>
          {liste.slice(0, max).map((c) => (
            <Ligne key={c.nomPt} c={c} />
          ))}
        </tbody>
      </table>
      {liste.length > max && (
        <p style={{ fontSize: 11.5, color: "var(--muted-2)", marginTop: 9 }}>
          {liste.length - max} autres au-delà des {max} premières.
        </p>
      )}
    </div>
  );
}

export default function SentinellePage() {
  const s = STATS_SENTINELLE;

  return (
    <>
      <div className="fil">Hors chaîne — prise d&apos;exclusivité</div>
      <h1 style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <Radar size={19} /> Sentinelle
      </h1>
      <p className="chapeau" style={{ maxWidth: "88ch" }}>
        Les matières actives homologuées à l&apos;étranger et absentes de l&apos;index marocain.
        La première homologation au Maroc <em>est</em> l&apos;exclusivité : le suivant devra
        constituer son propre dossier complet, faute de lettre d&apos;accès.
      </p>

      <div className="strip" style={{ marginBottom: 14 }}>
        <div>
          <span className="eyebrow">À saisir</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--accent)" }}>
            {s.nbASaisir}
          </strong>
        </div>
        <div>
          <span className="eyebrow">À vérifier</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--mod)" }}>
            {s.nbAVerifier}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Pièges écartés</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600, color: "var(--high)" }}>
            {s.nbAEcarter}
          </strong>
        </div>
        <div>
          <span className="eyebrow">Candidates suivies</span>
          <strong className="mono" style={{ fontSize: 17, fontWeight: 600 }}>{s.nbCandidates}</strong>
        </div>
        <div>
          <span className="eyebrow">Nouvelles au dernier relevé</span>
          <strong
            className="mono"
            style={{ fontSize: 17, fontWeight: 600, color: s.nbNouvelles ? "var(--accent)" : "var(--muted-2)" }}
          >
            {s.premierReleve ? "—" : s.nbNouvelles}
          </strong>
        </div>
      </div>

      {s.premierReleve && (
        <div className="card" style={{ padding: "13px 16px", marginBottom: 14 }}>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: "var(--fg)" }}>Premier relevé.</strong> Le journal des
            apparitions vient d&apos;être initialisé : rien n&apos;est signalé comme nouveau, sans
            quoi les {s.nbCandidates} candidates se présenteraient comme autant de nouveautés. Le
            prochain <span className="mono">npm run sentinelle</span> ne montrera que ce qui aura
            réellement bougé.
          </p>
        </div>
      )}

      <Table
        titre="À saisir"
        lecture="Une usine au moins en fabrique le technique dans un pays de sourcing générique, et la France autorise encore des produits. C'est le seul groupe où il y a à la fois quelque chose à acheter et une trajectoire réglementaire sûre."
        liste={A_SAISIR}
        max={30}
      />

      <Table
        titre="À vérifier"
        lecture="Sourçables, mais sans produit autorisé en France — ou inconnues d'E-Phy. L'ONSSA s'alignant sur l'ANSES, l'absence de trajectoire française est une inconnue, pas un feu vert. À instruire avant d'engager un dossier."
        liste={A_VERIFIER}
        max={20}
      />

      <Table
        titre="Le piège — retirées en France"
        lecture="Sourçables, et pourtant à écarter : la France les a retirées. Homologuer au Maroc ce que l'ANSES vient de retirer, c'est payer un dossier qui sera rattrapé. Elles figurent ici pour être reconnues, pas pour être suivies."
        liste={A_ECARTER}
        max={12}
      />

      {NOUVELLES.length > 0 && (
        <Table
          titre="Apparues au dernier relevé"
          lecture={`Absentes du journal jusqu'au ${s.dernierReleve}. C'est la notification : elle ne demande aucun serveur, seulement de relancer le relevé.`}
          liste={NOUVELLES}
          max={20}
        />
      )}

      <div className="section" style={{ display: "grid", gap: 8, maxWidth: "92ch" }}>
        <Aide titre="Pourquoi guetter les lancements des majors ne donne pas de fournisseur">
          <p>
            Une molécule que Syngenta, Bayer, BASF ou Corteva vient de lancer est protégée par
            brevet <strong>et</strong> par la protection des données. Personne ne la fabrique pour
            un tiers, et son inventeur l&apos;homologue lui-même au Maroc. Recevoir l&apos;alerte de
            son lancement ne mène donc à aucun fournisseur : c&apos;est du renseignement de
            concurrence — utile, et à ne pas confondre avec une piste d&apos;achat.
          </p>
          <p>
            Le signal qui compte est l&apos;inverse dans le temps :{" "}
            <strong>quelqu&apos;un d&apos;autre que l&apos;inventeur en fabrique le technique et
            l&apos;a déclaré à un régulateur</strong>. Le registre brésilien publie précisément
            cela, usine par usine et pays par pays. Une usine chinoise ou indienne déclarée sur une
            molécule prouve, par les faits, que sa fabrication générique existe.
          </p>
        </Aide>

        <Aide titre="Ce que cet écran ne sait pas">
          <p>
            <strong>Le brevet.</strong> Aucun registre sanitaire ne le publie. Une molécule
            fabriquée par dix usines chinoises peut rester couverte au Maroc : la liberté
            d&apos;exploitation se vérifie auprès d&apos;un conseil en propriété industrielle.
          </p>
          <p>
            <strong>L&apos;absence à l&apos;index.</strong> Elle est établie par la clé chimique de
            l&apos;outil — {s.nbEcartees} molécules ont ainsi été écartées parce qu&apos;elles sont
            déjà homologuées au Maroc. Une graphie portugaise que la réduction ne ramènerait pas au
            nom marocain resterait un faux positif : vérifier avant d&apos;agir.
          </p>
          <p>
            <strong>Le marché.</strong> Ni prix, ni volume, ni usage revendicable au Maroc. Une
            molécule sans culture porteuse au Maroc est une exclusivité sans client.
          </p>
        </Aide>

        <Aide titre="Comment relever">
          <p>
            <span className="mono">npm run sentinelle</span> recroise le registre brésilien,
            l&apos;index ONSSA, E-Phy et PUBCRIS, et met à jour{" "}
            <span className="mono">data/sentinelle-vu.json</span>, le journal des premières
            apparitions. Ce qui n&apos;y figure pas encore ressort en « nouvelle » — et
            l&apos;historique git tient le registre des relevés, comme pour la veille ANSES.
          </p>
          <p style={{ color: "var(--muted-2)" }}>{s.source} · relevé du {s.dernierReleve}</p>
        </Aide>
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-2)", marginTop: 18 }}>
        <Link href="/sourcing" className="link-accent" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          Prospection des matières du portefeuille <ArrowRight size={12} />
        </Link>
      </p>
    </>
  );
}
