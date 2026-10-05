"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface Choix {
  value: string;
  label: string;
}

function plier(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function RechercheListe({
  name,
  choix,
  value,
  placeholder,
  onChoisir,
}: {
  name: string;
  choix: Choix[];
  value: string;
  placeholder: string;
  onChoisir: (value: string) => void;
}) {
  const listeId = useId();
  const libelle = choix.find((c) => c.value === value)?.label ?? "";
  const [texte, setTexte] = useState(libelle);
  const [ouvert, setOuvert] = useState(false);
  const bloc = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTexte(libelle);
  }, [libelle]);

  useEffect(() => {
    function dehors(e: MouseEvent) {
      if (!bloc.current?.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, []);

  const visibles = useMemo(() => {
    const q = plier(texte.trim());
    const base = q ? choix.filter((c) => plier(c.label).includes(q)) : choix;
    return base.slice(0, 40);
  }, [choix, texte]);

  function choisir(suivant: string) {
    const label = choix.find((c) => c.value === suivant)?.label ?? "";
    setTexte(label);
    setOuvert(false);
    if (suivant !== value) onChoisir(suivant);
  }

  return (
    <div ref={bloc} className="relative">
      <input type="hidden" name={name} value={value} />
      <input
        type="text"
        role="combobox"
        aria-expanded={ouvert}
        aria-controls={listeId}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        value={texte}
        className="w-full rounded border border-[var(--line)] bg-[var(--bg)] px-3 py-2"
        onFocus={() => {
          setOuvert(true);
          setTexte("");
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOuvert(false);
            setTexte(libelle);
          }, 150);
        }}
        onChange={(e) => {
          setTexte(e.target.value);
          setOuvert(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setTexte(libelle);
            setOuvert(false);
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const q = plier(texte.trim());
            if (!q) {
              choisir("");
              return;
            }
            if (visibles[0]) choisir(visibles[0].value);
          }
        }}
      />
      {ouvert && (
        <ul
          id={listeId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded border border-[var(--line)] bg-[var(--surface)] shadow"
        >
          <li>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[var(--muted)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choisir("")}
            >
              Effacer
            </button>
          </li>
          {visibles.length === 0 && (
            <li className="px-3 py-2 text-[var(--muted)]">Aucun résultat</li>
          )}
          {visibles.map((c) => (
            <li key={c.value}>
              <button
                type="button"
                role="option"
                aria-selected={c.value === value}
                className={`block w-full px-3 py-2 text-left ${c.value === value ? "bg-[var(--fond)]" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisir(c.value)}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
