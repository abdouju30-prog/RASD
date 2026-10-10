// CSV pour Excel en français : point-virgule, BOM UTF-8, fins de ligne CRLF.
// Excel l'ouvre tel quel, accents compris, sans assistant d'import.

type Cellule = string | number | boolean | null | undefined;

function cellule(v: Cellule): string {
  const t = v === null || v === undefined ? "" : String(v);
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export function reponseCsv(nomFichier: string, entete: string[], lignes: Cellule[][]): Response {
  const corps = [entete, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
  return new Response("﻿" + corps + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
