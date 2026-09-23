import Link from "next/link";
import { BoutonImprimer } from "@/components/BoutonImprimer";
import { Schema } from "@/components/Schema";
import { CORPUS } from "@/lib/corpus";
import { parametresEssai, precedentsDe, preparerEssai } from "@/lib/essai";
import { questionParId } from "@/lib/procedures";

export const metadata = { title: "Feuille de terrain" };

const MODALITES = ["T0 témoin", "R référence", "E1", "E2"];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ culture?: string; cible?: string; m?: string | string[]; question?: string }>;
}) {
  const sp = await searchParams;
  const essai = preparerEssai(sp);
  const question = questionParId(sp.question);
  const precedents = precedentsDe(essai).slice(0, 6);
  const q = parametresEssai(essai.culture?.id ?? "", essai.cible, essai.matieres.map((m) => m.id));
  const index = (CORPUS.meta.genereIndex ?? "").slice(0, 10);

  return (
    <div className="grid gap-4">
      <div className="no-print grid gap-2">
        <p className="text-sm">
          <Link href={`/procedures?etape=notations${q ? `&${q}` : ""}${question ? `&question=${question.id}` : ""}`}>
            Reprendre le parcours
          </Link>
        </p>
        <BoutonImprimer />
        <p className="max-w-2xl text-sm text-[var(--muted)]">Enregistrer au format PDF, ou imprimer.</p>
      </div>

      <article className="feuille">
        <header className="feuille-entete">
          <p>BPE — feuille de terrain</p>
          <h1>Relevé d&apos;essai</h1>
        </header>

        <section>
          <h2>Identification</h2>
          <dl className="saisies">
            <div>
              <dt>Lieu / parcelle</dt>
              <dd />
            </div>
            <div>
              <dt>Date</dt>
              <dd />
            </div>
            <div>
              <dt>Opérateur</dt>
              <dd />
            </div>
            <div>
              <dt>Culture</dt>
              <dd>{essai.culture?.nom ?? ""}</dd>
            </div>
            <div>
              <dt>Cible</dt>
              <dd>{essai.cible}</dd>
            </div>
            <div>
              <dt>Stade BBCH</dt>
              <dd />
            </div>
            <div>
              <dt>Question</dt>
              <dd className="cases-question">{question?.label ?? "efficacité · sélectivité · les deux"}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2>Précédents d&apos;index et dose appliquée</h2>
          <Schema id="doses" />
          <p className="note-feuille">
            Colonne « index » : extrait du {index || "—"}. Ce n&apos;est pas la dose à appliquer. Écrire la
            dose réellement épandue à droite.
          </p>
          <table className="table-feuille">
            <thead>
              <tr>
                <th>Matière</th>
                <th>Dose index</th>
                <th>DAR index</th>
                <th>Dose appliquée</th>
                <th>Lot</th>
              </tr>
            </thead>
            <tbody>
              {precedents.map((p, i) => (
                <tr key={`${p.matiere}-${i}`}>
                  <td>{p.matiere}</td>
                  <td>{p.doses}</td>
                  <td>{p.dar}</td>
                  <td className="cellule-vide" />
                  <td className="cellule-vide" />
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 3 - precedents.length) }, (_, i) => (
                <tr key={`vide-${i}`}>
                  <td className="cellule-vide" />
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Mélange en cuve</h2>
          {essai.melanges.length > 0 && (
            <p className="note-feuille">Déjà formulé : {essai.melanges.map((m) => m.composants.join(" + ")).join(" ; ")}.</p>
          )}
          <Schema id="cuve" />
          <Schema id="bocal" />
          <p className="coche">Bocal fait · Stable · Instable, bouillie non appliquée</p>
        </section>

        <section>
          <h2>Dispositif — numéro de parcelle</h2>
          <Schema id="dispositif" />
          <table className="table-feuille">
            <thead>
              <tr>
                <th>Modalité</th>
                <th>R1</th>
                <th>R2</th>
                <th>R3</th>
                <th>R4</th>
              </tr>
            </thead>
            <tbody>
              {MODALITES.map((mod) => (
                <tr key={mod}>
                  <td>{mod}</td>
                  <td className="cellule-vide" />
                  <td className="cellule-vide" />
                  <td className="cellule-vide" />
                  <td className="cellule-vide" />
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Application</h2>
          <Schema id="application" />
          <dl className="saisies">
            <div>
              <dt>Volume prévu L/ha</dt>
              <dd />
            </div>
            <div>
              <dt>Volume réel L/ha</dt>
              <dd />
            </div>
            <div>
              <dt>Matériel / buses</dt>
              <dd />
            </div>
            <div>
              <dt>Heure</dt>
              <dd />
            </div>
            <div>
              <dt>Température</dt>
              <dd />
            </div>
            <div>
              <dt>Vent</dt>
              <dd />
            </div>
            <div>
              <dt>Écart du jour</dt>
              <dd />
            </div>
          </dl>
        </section>

        <section>
          <h2>Notations brutes</h2>
          <Schema id="notations" />
          <table className="table-feuille">
            <thead>
              <tr>
                <th>Date</th>
                <th>Stade</th>
                <th>Efficacité</th>
                <th>Sélectivité</th>
              </tr>
            </thead>
            <tbody>
              {["J0", "J+n", "Récolte"].map((j) => (
                <tr key={j}>
                  <td>
                    {j}
                    <span className="cellule-vide bloc-vide" />
                  </td>
                  <td className="cellule-vide" />
                  <td className="cellule-vide" />
                  <td className="cellule-vide" />
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
        <p className="note-feuille">
          Doses et DAR d&apos;index sont des précédents, pas une autorisation. Homologa n&apos;est pas modifié.
        </p>
      </article>
    </div>
  );
}
