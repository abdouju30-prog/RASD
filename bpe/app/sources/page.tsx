import { CORPUS } from "@/lib/corpus";
import { ETAPES } from "@/lib/procedures";

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
        Ajouté ici : un parcours de {ETAPES.length} étapes, jusqu&apos;au bilan imprimable.
      </p>
    </article>
  );
}
