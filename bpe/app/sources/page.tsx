import { CORPUS } from "@/lib/corpus";
import { PROCEDURES } from "@/lib/procedures";

export const metadata = { title: "Sources" };

export default function Page() {
  return (
    <article className="grid max-w-2xl gap-4 text-sm leading-6">
      <h1 className="text-3xl">Sources</h1>
      <p>
        Spectre, cultures et mélanges viennent de l&apos;index Homologa, en lecture seule.
        Généré le {CORPUS.meta.genereIndex ?? "—"}. Homologa n&apos;est pas modifié.
      </p>
      <p>
        Conservé : matière active, culture, cible, dose, DAR, association formulée.
        Non repris : noms commerciaux, détenteurs, fournisseurs, numéros d&apos;AMM.
      </p>
      <p>
        Ajouté ici : {PROCEDURES.length} procédures, dont l&apos;ordre d&apos;introduction en cuve
        et l&apos;essai en bocal. Ce sont des repères de travail, pas une décision ONSSA.
      </p>
    </article>
  );
}
