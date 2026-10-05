import { ORDRE_CUVE } from "@/lib/procedures";

export function SchemaCuve({ noms, melanges }: { noms: string[]; melanges: string[] }) {
  if (noms.length < 2) {
    const produit = noms[0] || "le produit";
    const etages = ["Compléter en eau sous agitation", produit, "Eau, aux trois quarts du volume prévu"];
    return (
      <figure className="schema">
        <p className="etiquette">{noms.length === 0 ? "Aucune matière choisie" : "Un seul produit"}</p>
        <div className="pile-cuve">
          {etages.map((etage, i) => (
            <p key={etage} className="etage-cuve">
              <span>{etages.length - i}</span>
              {etage}
            </p>
          ))}
        </div>
        <figcaption>
          {noms.length === 0
            ? "Choisir au moins une matière à l'étape Question."
            : "Pas de mélange, pas d'essai en bocal. 1 au fond, 3 complète en eau."}
        </figcaption>
      </figure>
    );
  }

  const etages = [...ORDRE_CUVE].reverse();
  return (
    <div className="grid gap-3">
      {melanges.length > 0 && (
        <p>Déjà formulé à l&apos;index : {melanges.join(" ; ")}. La cuve est un autre geste.</p>
      )}
      <figure className="schema">
        <p className="etiquette">Produits de ce cas : {noms.join(" + ")}</p>
        <div className="pile-cuve">
          {etages.map((etage, i) => (
            <p key={etage} className="etage-cuve">
              <span>{ORDRE_CUVE.length - i}</span>
              {etage}
            </p>
          ))}
        </div>
        <figcaption>1 au fond, versé en premier. 8 complète en eau. L&apos;étiquette prime sur cet ordre.</figcaption>
      </figure>
      <figure className="schema">
        <div className="bocaux">
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
        <figcaption>Eau du site, mêmes proportions, 15 min. Instable : ne pas appliquer.</figcaption>
      </figure>
    </div>
  );
}
