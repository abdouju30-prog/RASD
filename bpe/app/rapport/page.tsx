import Link from "next/link";
import { BoutonImprimer } from "@/components/BoutonImprimer";
import { PlanDispositif } from "@/components/PlanDispositif";
import { SchemaCuve } from "@/components/SchemaCuve";
import { Schema } from "@/components/Schema";
import { lireApplication } from "@/lib/application";
import { ECHELLE_PLANTE, afficherDate, joursDar, lectureEfficacite, lireNotations, lireTraitement, notationRemplie, rangMoment } from "@/lib/notations";
import { codesANoter } from "@/lib/dispositif";
import { CORPUS } from "@/lib/corpus";
import { parametresEssai, precedentsDe, preparerEssai } from "@/lib/essai";
import { enonceQuestion, questionParId } from "@/lib/procedures";

export const metadata = { title: "Feuille de terrain" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ culture?: string; cible?: string; m?: string | string[]; question?: string; plan?: string; da?: string | string[]; nt?: string | string[]; jt?: string | string[] }>;
}) {
  const sp = await searchParams;
  const essai = preparerEssai(sp);
  const question = questionParId(sp.question);
  const appliquees = Array.isArray(sp.da) ? sp.da : sp.da ? [sp.da] : [];
  const appli = lireApplication(sp);
  const notes = lireNotations(sp);
  const traitement = lireTraitement(sp);
  const modalites = codesANoter(sp.plan);
  const precedents = precedentsDe(essai).slice(0, 6);
  const darIndex = [...new Set(precedents.flatMap((p) => p.choixDar))];
  const darJours = joursDar(darIndex);
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
              <dd className="cases-question">
                {enonceQuestion({
                  question: question?.id,
                  culture: essai.culture?.nom,
                  cible: essai.cible,
                  matieres: essai.matieres.map((m) => m.nom),
                }) || question?.label || ""}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2>Dose d&apos;index et dose appliquée</h2>
          <p className="note-feuille">Index du {index || "—"}. La dose appliquée est celle du jour.</p>
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
                  <td className={appliquees[i] ? "" : "cellule-vide"}>{appliquees[i] ?? ""}</td>
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
          <h2>{essai.matieres.length >= 2 ? "Mélange en cuve" : "Préparation"}</h2>
          <SchemaCuve
            noms={essai.matieres.map((m) => m.nom)}
            melanges={essai.melanges.map((m) => m.composants.join(" + "))}
          />
          {essai.matieres.length >= 2 && <p className="coche">Bocal fait · Stable · Instable, bouillie non appliquée</p>}
        </section>

        <section>
          <h2>Dispositif — numéro de parcelle</h2>
          <PlanDispositif plan={sp.plan} />
        </section>

        <section>
          <h2>Application</h2>
          <dl className="saisies">
            <div>
              <dt>Dose du jour</dt>
              <dd>{appliquees.filter(Boolean).join(" · ")}</dd>
            </div>
            <div>
              <dt>Volume prévu L/ha</dt>
              <dd>{appli.volumePrevu}</dd>
            </div>
            <div>
              <dt>Volume réel L/ha</dt>
              <dd>{appli.volumeReel}</dd>
            </div>
            <div>
              <dt>Buses</dt>
              <dd>{appli.buses}</dd>
            </div>
            <div>
              <dt>Heure</dt>
              <dd>{appli.heure}</dd>
            </div>
            <div>
              <dt>Température</dt>
              <dd>{appli.temperature}</dd>
            </div>
            <div>
              <dt>Vent</dt>
              <dd>{appli.vent}</dd>
            </div>
            <div>
              <dt>Écart du jour</dt>
              <dd>{appli.ecart}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2>Notations</h2>
          <p>
            Traitement {afficherDate(traitement) || "……"}
            {darIndex.length ? ` · DAR ${darIndex.join(" · ")}` : ""}
            {darJours !== null ? ` · récolte à J+${darJours}` : ""}
          </p>
          <p>Somme de 10 plantes. {ECHELLE_PLANTE.map((palier) => `${palier.note} ${palier.sens}`).join(" · ")}.</p>
          <table className="table-feuille">
            <thead>
              <tr>
                <th>Délai</th>
                <th>Date</th>
                <th>Stade</th>
                {modalites.map((code) => (
                  <th key={code}>{code}</th>
                ))}
                <th>Symptôme</th>
                <th>Lecture</th>
              </tr>
            </thead>
            <tbody>
              {[...notes].sort((a, b) => rangMoment(a.moment) - rangMoment(b.moment)).map((n) => {
                const faite = notationRemplie(n);
                return (
                  <tr key={n.moment}>
                    <td>{n.moment}</td>
                    <td className={n.date ? "" : "cellule-vide"}>{n.date ? afficherDate(n.date) : ""}</td>
                    <td className={n.stade ? "" : "cellule-vide"}>{n.stade}</td>
                    {modalites.map((code) => (
                      <td key={code} className={n.notes[code] ? "" : "cellule-vide"}>
                        {n.notes[code] ?? ""}
                      </td>
                    ))}
                    <td className={n.selectivite ? "" : "cellule-vide"}>{n.selectivite}</td>
                    <td>{faite ? lectureEfficacite(n.notes, essai.cible) : "À noter"}</td>
                  </tr>
                );
              })}
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
