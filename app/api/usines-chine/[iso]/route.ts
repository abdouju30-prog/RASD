import { MATIERES_ICAMA, anglaisDe, licenceLisible } from "@/lib/icama";
import { contactIcama } from "@/lib/contacts-icama";

/**
 * Usines chinoises d'une matière active, en tableur pour une demande de prix.
 *
 * CSV au point-virgule avec BOM UTF-8 : Excel en français l'ouvre tel quel,
 * accents compris. Les usines (licence de production) d'abord, puis les
 * titulaires sans usine connue. Le nom chinois reste en dernière colonne :
 * c'est lui qui fait foi au registre.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ iso: string }> }) {
  const { iso } = await params;
  const cherche = decodeURIComponent(iso).toLowerCase();
  const m = MATIERES_ICAMA.find((x) => x.iso.toLowerCase() === cherche);
  if (!m) {
    return new Response("Matière active absente du relevé chinois (ICAMA).", { status: 404 });
  }

  const lignes = [...m.societes].sort(
    (a, b) =>
      Number(Boolean(b.licenceProduction)) - Number(Boolean(a.licenceProduction)) ||
      (anglaisDe(b.nom)?.registres.length ?? 0) - (anglaisDe(a.nom)?.registres.length ?? 0) ||
      b.nbHomologations - a.nbHomologations
  );

  const entete = [
    "Société",
    "Nom anglais (niveau)",
    "Transcription latine",
    "Province",
    "Usine (licence de production)",
    "Licence",
    "Homologations TC",
    "Teneur max",
    "Validité homologation",
    "Exporte déjà vers",
    "Site web",
    "E-mail",
    "Téléphone",
    "Nom officiel (registre chinois)",
  ];
  const cellule = (v: string | number | null | undefined) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const corps = lignes.map((s) => {
    const en = anglaisDe(s.nom);
    const c = contactIcama(s.nom);
    return [
      en?.nomAnglais || s.glose || s.latin || s.nom,
      en ? `${en.nomAnglais} (${en.niveau})` : "",
      s.latin,
      s.region,
      s.licenceProduction ? "oui" : "non — titulaire, peut-être négociant",
      licenceLisible(s.licenceProduction),
      s.nbHomologations,
      s.teneurMax,
      s.expirationMax,
      en?.registres.join(", ") ?? "",
      c?.site ?? "",
      c?.emails.join(", ") ?? "",
      c?.telephones.join(", ") ?? "",
      s.nom,
    ]
      .map(cellule)
      .join(";");
  });

  const fichier = "﻿" + [entete.join(";"), ...corps].join("\r\n") + "\r\n";
  const slug = m.iso.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new Response(fichier, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="usines-chine-${slug}.csv"`,
    },
  });
}
