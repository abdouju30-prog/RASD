import type { StatutAmm } from "@/lib/usages";

export function RequeteHomologation({
  molecule = "",
  culture = "",
  cible = "",
  societe = "",
  statut = "tous",
  cultures = [],
  cibles = [],
  molecules = [],
  societes = [],
}: {
  molecule?: string;
  culture?: string;
  cible?: string;
  societe?: string;
  statut?: StatutAmm;
  cultures?: string[];
  cibles?: string[];
  molecules?: string[];
  societes?: string[];
}) {
  const aide = cultures.length > 0;
  return (
    <form className="requete" action="/usages" method="get">
      <label>
        Substance active
        <input
          name="molecule"
          defaultValue={molecule}
          placeholder="glyphosate"
          list={aide ? "req-molecules" : undefined}
          autoComplete="off"
        />
      </label>
      <label>
        Culture
        <input
          name="culture"
          defaultValue={culture}
          placeholder="tomate"
          list={aide ? "req-cultures" : undefined}
          autoComplete="off"
        />
      </label>
      <label>
        Ravageur
        <input
          name="cible"
          defaultValue={cible}
          placeholder="mildiou"
          list={aide ? "req-cibles" : undefined}
          autoComplete="off"
        />
      </label>
      <label>
        Société
        <input
          name="societe"
          defaultValue={societe}
          placeholder="Syngenta"
          list={aide ? "req-societes" : undefined}
          autoComplete="off"
        />
      </label>
      <label>
        Statut AMM
        <select name="statut" defaultValue={statut}>
          <option value="tous">Tous</option>
          <option value="vigueur">En vigueur</option>
          <option value="expire">Expirées</option>
        </select>
      </label>
      <div className="requete-actions">
        <button type="submit">Rechercher</button>
      </div>
      {aide && (
        <>
          <datalist id="req-molecules">
            {molecules.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <datalist id="req-cultures">
            {cultures.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <datalist id="req-cibles">
            {cibles.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <datalist id="req-societes">
            {societes.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </>
      )}
    </form>
  );
}
