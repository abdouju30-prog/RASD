import { CORPUS, CULTURES } from "@/lib/corpus";

export const metadata = { title: "Sources" };

export default function Page() {
  const parOrigine = {
    homologa: CULTURES.filter((c) => c.originePerimetres === "homologa").length,
    ajout: CULTURES.filter((c) => c.originePerimetres === "ajout-bpe").length,
    aucune: CULTURES.filter((c) => c.originePerimetres === "non-rattache").length,
  };
  return (
    <article className="grid max-w-2xl gap-4 text-sm leading-6">
      <h1 className="text-3xl">Sources</h1>
      <p>{CORPUS.meta.avertissement}</p>
      <h2 className="text-xl">Repris, sans réécriture</h2>
      <ul className="list-disc pl-5">
        <li>{CORPUS.meta.sourceIndex}. Généré le {CORPUS.meta.genereIndex ?? "—"}.</li>
        <li>
          {CORPUS.meta.sourceBpe}. {CORPUS.meta.attributionBpe}. Mise à jour {CORPUS.meta.majBpe ?? "—"}.
        </li>
      </ul>
      <p>
        Non repris : noms commerciaux, détenteurs, fournisseurs, numéros d&apos;AMM. Le spectre
        garde culture, cible, dose et DAR.
      </p>
      <h2 className="text-xl">Ajouté par BPE</h2>
      <ul className="list-disc pl-5">
        <li>Six procédures : cadrage, protocole, mélange, doses, traçabilité, choix de l&apos;organisme.</li>
        <li>Ordre d&apos;introduction en cuve et essai en bocal.</li>
        <li>
          Rattachement de cultures absentes du mot-clé Homologa : {parOrigine.ajout} cultures.
          Mot-clé Homologa : {parOrigine.homologa}. Non rattachées (adjuvants, « toutes cultures ») :{" "}
          {parOrigine.aucune}.
        </li>
        <li>Statut d&apos;échéance de l&apos;agrément : expiré, moins d&apos;un an, ou couvert.</li>
      </ul>
      <p>
        Régénérer l&apos;extrait, depuis le dossier <code>bpe</code>, après une mise à jour des JSON
        Homologa : <code>npm run extraire</code>. Le script ne réécrit pas ces JSON.
      </p>
    </article>
  );
}
