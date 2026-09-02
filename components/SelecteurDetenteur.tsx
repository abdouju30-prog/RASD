"use client";

import { useRef, useTransition } from "react";
import { Building2 } from "lucide-react";
import type { Detenteur } from "@/lib/types";

/**
 * Sélecteur de détenteur.
 *
 * L'outil couvre les 75 sociétés de l'index ONSSA. Changer de détenteur
 * recalcule tout l'écran : portefeuille, alertes, cibles de prospection.
 * La soumission est automatique — un bouton « valider » serait un clic de trop
 * sur une bascule qu'on fait plusieurs fois par session.
 */
export function SelecteurDetenteur({
  detenteurs,
  courant,
  action,
}: {
  detenteurs: Detenteur[];
  courant: string;
  action: (formData: FormData) => void;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <form ref={ref} action={action} className="selecteur">
      <Building2 size={13} aria-hidden />
      <select
        // Remonter le composant à chaque changement de détenteur : sans cette
        // clé, defaultValue ne s'applique qu'au premier rendu et le libellé
        // affiché reste celui du détenteur précédent.
        key={courant}
        name="detenteur"
        defaultValue={courant}
        aria-label="Détenteur"
        disabled={enCours}
        onChange={() => demarrer(() => ref.current?.requestSubmit())}
      >
        {detenteurs.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nom} — {d.nbProduits} produits
          </option>
        ))}
      </select>
      {enCours && <span className="selecteur-attente">…</span>}
    </form>
  );
}
