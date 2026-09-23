export function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function contient(valeur: string, requete: string): boolean {
  const q = norm(requete.trim());
  if (!q) return true;
  return norm(valeur).includes(q);
}

export function joindre(valeurs: string[], vide = "—"): string {
  const xs = valeurs.map((v) => v.trim()).filter(Boolean);
  return xs.length ? xs.join(" · ") : vide;
}
