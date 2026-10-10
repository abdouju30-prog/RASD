import { Download } from "lucide-react";

/** Lien de téléchargement tableur, aligné à droite du titre de la page. */
export function BoutonExport({ table }: { table: "produits" | "homologations" | "alertes" | "matieres" }) {
  return (
    <a
      href={`/api/export/${table}`}
      className="link-accent"
      style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 500 }}
    >
      <Download size={13} aria-hidden /> Exporter (Excel)
    </a>
  );
}
