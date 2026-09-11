import { Pill } from "./Pill";

const COLORS: Record<string, string> = {
  // AMM
  valide: "var(--low)",
  en_renouvellement: "var(--mod)",
  expirée: "var(--crit)",
  // UE / Maroc
  approuvée: "var(--low)",
  homologuée: "var(--low)",
  en_réexamen: "var(--mod)",
  en_cours: "var(--mod)",
  non_renouvelée: "var(--high)",
  non_homologuée: "var(--muted)",
  retirée: "var(--crit)",
  // Voisins
  autorisée: "var(--low)",
  restreinte: "var(--mod)",
  interdite: "var(--crit)",
  // Dossiers
  brouillon: "var(--muted)",
  en_constitution: "var(--mod)",
  déposé: "var(--info)",
  en_instruction: "var(--info)",
  accordé: "var(--low)",
  refusé: "var(--crit)",
  // Pièces
  manquante: "var(--crit)",
  présente: "var(--info)",
  validée: "var(--low)",
};

export function StatusPill({ value }: { value: string }) {
  const color = COLORS[value] ?? "var(--muted)";
  const label = value.replace(/_/g, " ");
  return <Pill color={color} label={label} borderPct={38} bgPct={11} />;
}
