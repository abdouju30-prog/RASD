"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { LIBELLE_TYPE, type Resultat } from "@/lib/recherche";

/**
 * Recherche transverse, dans la barre haute.
 *
 * Sept registres cohabitent : il faut pouvoir retrouver une société ou une
 * molécule sans savoir d'avance lequel la contient.
 *
 * Trois choix de conception :
 *
 *  • L'index reste au serveur. La saisie part en requête, douze suggestions
 *    reviennent — plutôt que d'expédier dix mille entrées au navigateur pour
 *    une fonction qu'on n'utilise pas à chaque page.
 *
 *  • Le TYPE de chaque résultat est toujours affiché. Une société peut être à
 *    la fois fournisseur de l'index et usine au registre EPA : ce sont deux
 *    lignes, et l'utilisateur doit voir laquelle il ouvre.
 *
 *  • Les réponses hors délai sont ignorées. Sans cela, une requête lente
 *    partie sur « abam » écrase l'affichage de « abamectine » tapé depuis.
 */
export function Recherche() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Resultat[]>([]);
  const [correction, setCorrection] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const [charge, setCharge] = useState(false);

  const boite = useRef<HTMLDivElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const dernier = useRef(0);

  // ── Interrogation, retardée le temps que la frappe se stabilise ──────────
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setRes([]);
      setCorrection(null);
      setCharge(false);
      return;
    }
    setCharge(true);
    const jeton = ++dernier.current;
    const minuteur = setTimeout(async () => {
      try {
        const r = await fetch(`/api/recherche?q=${encodeURIComponent(t)}`);
        const d = await r.json();
        // Une réponse arrivée après une saisie plus récente est périmée.
        if (jeton !== dernier.current) return;
        setRes(d.resultats ?? []);
        setCorrection(d.correction ?? null);
        setActif(0);
      } catch {
        if (jeton === dernier.current) {
          setRes([]);
          setCorrection(null);
        }
      } finally {
        if (jeton === dernier.current) setCharge(false);
      }
    }, 130);
    return () => clearTimeout(minuteur);
  }, [q]);

  // ── Fermeture au clic extérieur ─────────────────────────────────────────
  useEffect(() => {
    const clic = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", clic);
    return () => document.removeEventListener("mousedown", clic);
  }, []);

  // ── Raccourci clavier : « / » ouvre la recherche ─────────────────────────
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      const dansUnChamp =
        cible &&
        (cible.tagName === "INPUT" ||
          cible.tagName === "TEXTAREA" ||
          cible.tagName === "SELECT" ||
          cible.isContentEditable);
      if (e.key === "/" && !dansUnChamp && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        champ.current?.focus();
      }
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, []);

  const aller = useCallback(
    (r: Resultat) => {
      setOuvert(false);
      setQ("");
      champ.current?.blur();
      if (r.href) router.push(r.href);
    },
    [router]
  );

  const clavier = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOuvert(false);
      champ.current?.blur();
      return;
    }
    if (!ouvert || res.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActif((i) => (i + 1) % res.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActif((i) => (i - 1 + res.length) % res.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = res[actif];
      if (r) aller(r);
    }
  };

  const listeVisible = ouvert && q.trim().length >= 2;

  return (
    <div className="rech" ref={boite}>
      <Search size={13} className="rech-icone" aria-hidden />
      <input
        ref={champ}
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onKeyDown={clavier}
        placeholder="Matière, produit, société"
        aria-label="Rechercher une matière active, un produit, une société"
        aria-expanded={listeVisible}
        aria-controls="rech-liste"
        aria-autocomplete="list"
        role="combobox"
        spellCheck={false}
        autoComplete="off"
      />
      {q && (
        <button
          type="button"
          className="rech-vider"
          onClick={() => {
            setQ("");
            champ.current?.focus();
          }}
          aria-label="Effacer la recherche"
        >
          <X size={12} />
        </button>
      )}

      {listeVisible && (
        <div className="rech-liste" id="rech-liste" role="listbox">
          {res.length === 0 && !correction ? (
            <div className="rech-vide">
              {charge ? "Recherche…" : `Aucun résultat pour « ${q.trim()} »`}
            </div>
          ) : (
            <>
              {correction && (
                <button
                  type="button"
                  className="rech-corrige"
                  aria-label={`Rechercher ${correction}`}
                  onClick={() => {
                    setQ(correction);
                    setActif(0);
                    champ.current?.focus();
                  }}
                >
                  {charge ? "Recherche…" : (
                    <>
                      Vouliez-vous dire <strong>{correction}</strong> ?
                    </>
                  )}
                </button>
              )}
              {res.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  role="option"
                  aria-selected={i === actif}
                  className={`rech-item${i === actif ? " on" : ""}${r.href ? "" : " inerte"}`}
                  onMouseEnter={() => setActif(i)}
                  onClick={() => aller(r)}
                >
                  <span className="rech-lib">{r.libelle}</span>
                  <span className="rech-type">{LIBELLE_TYPE[r.type]}</span>
                  <span className="rech-det">{r.detail}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
