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
      <figcaption>Une seule.</figcaption>
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
      <figcaption>T0 témoin. R référence. E1 et E2 modalités. Numéro de parcelle dans la case.</figcaption>
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
      <figcaption>À écrire sur la feuille, le jour même.</figcaption>
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
      <figcaption>Note brute. Pas de pourcentage.</figcaption>
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
      <figcaption>1 au fond, versé en premier. 8 complète en eau.</figcaption>
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
      <figcaption>Eau du site, 15 min. Instable : ne pas appliquer.</figcaption>
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
      <figcaption>Gauche : index. Droite : dose écrite au champ.</figcaption>
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
      <figcaption>Lieu, parcelles, application, notes, signature.</figcaption>
    </>
  );
}
