import Link from "next/link";
import { ORDRE_CUVE, type SchemaId } from "@/lib/procedures";

const TIRAGE = [
  ["T0", "E1", "R", "E2"],
  ["E2", "T0", "E1", "R"],
  ["R", "E2", "T0", "E1"],
  ["E1", "R", "E2", "T0"],
];

export function Schema({ id }: { id: SchemaId }) {
  return (
    <figure className="schema">
      {id === "question" && <Question />}
      {id === "dispositif" && <Dispositif />}
      {id === "application" && <Application />}
      {id === "notations" && <Notations />}
      {id === "cuve" && <Cuve />}
      {id === "bocal" && <Bocal />}
      {id === "doses" && <Doses />}
      {id === "feuille" && <Feuille />}
    </figure>
  );
}

function Question() {
  return (
    <>
      <div className="chaine" aria-hidden="true">
        <p>
          <strong>1. Culture</strong>
          <span>une seule</span>
        </p>
        <p>
          <strong>2. Cible</strong>
          <span>un bioagresseur</span>
        </p>
        <p>
          <strong>3. Question</strong>
          <span>efficacité</span>
          <span>sélectivité</span>
          <span>les deux</span>
        </p>
      </div>
      <figcaption>
        On fige la question avant de lire le spectre. Une deuxième question devient un autre essai.
      </figcaption>
    </>
  );
}

function Dispositif() {
  return (
    <>
      <div className="grille-blocs" aria-hidden="true">
        <div className="rangee-bloc">
          <span />
          <span className="etiquette">parcelle</span>
          <span className="etiquette">parcelle</span>
          <span className="etiquette">parcelle</span>
          <span className="etiquette">parcelle</span>
        </div>
        {TIRAGE.map((ligne, i) => (
          <div className="rangee-bloc" key={i}>
            <span className="etiquette">Bloc {i + 1}</span>
            {ligne.map((mod, j) => (
              <span key={j} className={`case-mod ${mod === "T0" ? "t0" : ""} ${mod === "R" ? "ref" : ""}`}>
                {mod}
              </span>
            ))}
          </div>
        ))}
      </div>
      <figcaption>
        Exemple de tirage à recopier sur la feuille, pas une randomisation officielle. T0 = témoin non
        traité. R = référence, seulement si un emploi existe déjà. E1 et E2 = modalités d&apos;essai. La
        notation se fait sur la parcelle utile ; les bordures ne sont pas notées. Écrire le numéro de
        parcelle dans chaque case.
      </figcaption>
    </>
  );
}

function Application() {
  return (
    <>
      <ol className="chaine" aria-hidden="true">
        <li>
          <strong>Dose</strong>
          <span>pesée ou mesurée</span>
        </li>
        <li>
          <strong>Volume</strong>
          <span>L/ha prévu</span>
        </li>
        <li>
          <strong>Buses</strong>
          <span>type et débit</span>
        </li>
        <li>
          <strong>Météo</strong>
          <span>heure, T°, vent</span>
        </li>
        <li>
          <strong>Écart</strong>
          <span>noté le jour même</span>
        </li>
      </ol>
      <figcaption>
        Chaque case se remplit sur la feuille de terrain. Un écart (volume, buse, heure) reste écrit :
        il ne se corrige pas après coup.
      </figcaption>
    </>
  );
}

function Notations() {
  return (
    <>
      <div className="frise" aria-hidden="true">
        <p>
          <strong>J0</strong>
          <span>état initial</span>
          <span>culture + cible</span>
        </p>
        <p>
          <strong>J+n</strong>
          <span>efficacité</span>
          <span>note brute</span>
        </p>
        <p>
          <strong>Récolte</strong>
          <span>sélectivité</span>
          <span>symptôme, photo</span>
        </p>
      </div>
      <figcaption>
        Deux lectures à chaque date : la cible et la culture. Aucun pourcentage n&apos;est calculé ici.
        La note brute et le symptôme observé suffisent sur le terrain.
      </figcaption>
    </>
  );
}

function Cuve() {
  const etages = [...ORDRE_CUVE].reverse();
  return (
    <>
      <div className="pile-cuve" aria-hidden="true">
        {etages.map((etage, i) => (
          <p key={etage} className="etage-cuve">
            <span>{ORDRE_CUVE.length - i}</span>
            {etage}
          </p>
        ))}
      </div>
      <figcaption>
        Le 1 est versé en premier : il est au fond de la cuve. Le 8 complète en eau, en haut. L&apos;agitation
        ne s&apos;arrête pas. Valider par l&apos;essai en bocal et par les étiquettes. Ce n&apos;est pas une règle
        ONSSA.
      </figcaption>
    </>
  );
}

function Bocal() {
  return (
    <>
      <div className="bocaux" aria-hidden="true">
        <div>
          <div className="bocal">
            <span className="niveau uni">bouillie homogène</span>
          </div>
          <p className="legende-bocal">Stable — agitation maintenue</p>
        </div>
        <div>
          <div className="bocal">
            <span className="niveau creme">crème</span>
            <span className="niveau floc">floculat</span>
            <span className="niveau fond">précipité</span>
          </div>
          <p className="legende-bocal">Instable — ne pas appliquer</p>
        </div>
      </div>
      <figcaption>
        Même eau que le site, mêmes proportions que la bouillie, au moins 15 minutes. Crémage, floculat,
        précipité, échauffement ou séparation : cette bouillie ne va pas sur l&apos;essai. Le bocal ne dit
        rien de la sélectivité ni des résidus.
      </figcaption>
    </>
  );
}

function Doses() {
  return (
    <>
      <div className="deux-col" aria-hidden="true">
        <div>
          <p className="etiquette">Index — précédent</p>
          <p className="case-mod">dose publiée</p>
          <p className="case-mod">DAR publié</p>
        </div>
        <div>
          <p className="etiquette">Terrain — à écrire</p>
          <p className="case-mod">dose appliquée</p>
          <p className="case-mod">récolte d&apos;essai ≠ récolte commerciale</p>
        </div>
      </div>
      <figcaption>
        La colonne de gauche se recopie depuis l&apos;extrait. La colonne de droite se remplit le jour de
        l&apos;application. Plusieurs doses d&apos;index restent toutes visibles : aucune n&apos;est choisie à la place
        d&apos;une autre.
      </figcaption>
    </>
  );
}

function Feuille() {
  return (
    <>
      <ol className="chaine" aria-hidden="true">
        <li>
          <strong>En-tête</strong>
          <span>lieu, date, opérateur</span>
        </li>
        <li>
          <strong>Modalités</strong>
          <span>n° de parcelle</span>
        </li>
        <li>
          <strong>Application</strong>
          <span>dose, météo, volume</span>
        </li>
        <li>
          <strong>Notes</strong>
          <span>brutes, puis signature</span>
        </li>
      </ol>
      <figcaption>
        La feuille se remplit au champ, puis s&apos;imprime ou s&apos;enregistre en PDF.{" "}
        <Link href="/rapport">Feuille vierge</Link>
        {" · "}
        <Link href="/essai">depuis la grille d&apos;essai</Link>, culture, cible et précédents de dose sont
        déjà inscrits.
      </figcaption>
    </>
  );
}
