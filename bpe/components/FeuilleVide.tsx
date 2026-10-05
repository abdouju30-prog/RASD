import Link from "next/link";
import { BoutonImprimer } from "@/components/BoutonImprimer";
import { ECHELLE_PLANTE } from "@/lib/notations";

const DELAIS = ["J0", "J+7", "J+10", "J+14", "J+21", "J+28", "Récolte"];
const CODES = ["T0", "E1", "E2", "R"];

export function FeuilleVide() {
  return (
    <div className="grid gap-4">
      <div className="no-print grid gap-2">
        <p className="text-sm">
          <Link href="/procedures">Retour au parcours</Link>
        </p>
        <BoutonImprimer />
        <p className="max-w-2xl text-sm text-[var(--muted)]">Feuille vierge. Imprimer, puis remplir à la main.</p>
      </div>

      <article className="feuille">
        <header className="feuille-entete">
          <p>BPE — feuille de terrain</p>
          <h1>Relevé d&apos;essai</h1>
        </header>

        <section>
          <h2>Identification</h2>
          <dl className="saisies">
            {["Lieu / parcelle", "Date", "Opérateur", "Culture", "Cible", "Stade", "Question", "Matière"].map((label) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="ligne-ecrire" />
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2>Dose et application</h2>
          <table className="table-feuille">
            <thead>
              <tr>
                <th>Matière</th>
                <th>Dose du jour</th>
                <th>Volume L/ha</th>
                <th>Buses</th>
                <th>Heure</th>
                <th>T°</th>
                <th>Vent</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1].map((i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <td key={j} className="ligne-ecrire" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="coche">Bocal : stable · instable, bouillie non appliquée</p>
        </section>

        <section>
          <h2>Dispositif — code et numéro de parcelle</h2>
          <div className="grille-blocs">
            {[1, 2, 3, 4].map((bloc) => (
              <div key={bloc} className="rangee-bloc">
                <span className="etiquette">Bloc {bloc}</span>
                {[1, 2, 3, 4].map((parcelle) => (
                  <span key={parcelle} className="case-mod ligne-ecrire" />
                ))}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Notations</h2>
          <p>Somme de 10 plantes. {ECHELLE_PLANTE.map((palier) => `${palier.note} ${palier.sens}`).join(" · ")}.</p>
          <table className="table-feuille">
            <thead>
              <tr>
                <th>Délai</th>
                <th>Date</th>
                <th>Stade</th>
                {CODES.map((code) => (
                  <th key={code}>{code}</th>
                ))}
                <th>Symptôme</th>
              </tr>
            </thead>
            <tbody>
              {DELAIS.map((delai) => (
                <tr key={delai}>
                  <td>{delai}</td>
                  {Array.from({ length: 6 }, (_, i) => (
                    <td key={i} className="ligne-ecrire" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="signatures">
          <p>Relevé par</p>
          <p>Date</p>
          <p>Visa</p>
        </section>
      </article>
    </div>
  );
}
