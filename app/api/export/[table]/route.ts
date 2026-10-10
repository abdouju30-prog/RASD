import { matieresDuPortefeuille, produitsDe } from "@/lib/data";
import { detenteurActuel } from "@/lib/detenteur";
import { alertesGroupees, LIBELLE_ALERTE } from "@/lib/alertes";
import { etatAMM } from "@/lib/logic";
import { conformite, libelleMoa } from "@/lib/conformite";
import { reponseCsv } from "@/lib/csv";
import { ANNUAIRE, REGIONS, dansRegion, type Region } from "@/lib/annuaire";

/**
 * Exports tableur du détenteur choisi : produits, homologations (usages),
 * alertes, matières actives. Mêmes données que l'écran, une ligne par élément.
 */
export async function GET(req: Request, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  if (table === "annuaire") {
    const sp = new URL(req.url).searchParams;
    const reg = REGIONS.find((r) => r === sp.get("region")) as Region | undefined;
    const q = (sp.get("q") ?? "").toLowerCase();
    const min = Number(sp.get("min") ?? "1") || 1;
    const liste = ANNUAIRE.filter((f) =>
      (!reg || dansRegion(f, reg)) &&
      (!sp.get("pays") || f.pays === sp.get("pays")) &&
      (!sp.get("registre") || f.registres.includes(sp.get("registre")!)) &&
      f.registres.length >= min &&
      (!q || f.nom.toLowerCase().includes(q) || f.molecules.some((m) => m.toLowerCase().includes(q))));
    return reponseCsv(
      "annuaire-fabricants.csv",
      ["Fabricant / titulaire", "Pays", "Pays présumé", "Région", "Fournit déjà le Maroc", "Nb registres", "Registres", "Nb molécules", "Molécules"],
      liste.map((f) => [f.nom, f.pays, f.paysFiable ? "" : "oui", f.region, f.meToo ? "oui" : "", f.registres.length,
        f.registres.join(", "), f.molecules.length, f.molecules.join(", ")])
    );
  }
  const d = await detenteurActuel();
  const slug = d.id;
  const produits = produitsDe(d.id);

  if (table === "produits") {
    return reponseCsv(
      `produits-${slug}.csv`,
      ["Produit", "AMM", "Expiration", "État AMM", "Catégorie", "Formulation", "Tox", "Matières actives", "Fournisseurs", "Usages"],
      produits.map((p) => [
        p.nomCommercial, p.amm, p.expiration, etatAMM(p).etat, p.categorie, p.formulation, p.tox,
        p.matieresActives.join(" + "), p.fournisseurs.join(", "), p.usages.length,
      ])
    );
  }
  if (table === "homologations") {
    return reponseCsv(
      `homologations-${slug}.csv`,
      ["Produit", "AMM", "Matières actives", "Culture", "Cible", "Dose", "DAR (j)", "Nb applications"],
      produits.flatMap((p) =>
        p.usages.map((u) => [p.nomCommercial, p.amm, p.matieresActives.join(" + "), u.culture, u.cible, u.dose, u.dar, u.nbAppl])
      )
    );
  }
  if (table === "alertes") {
    return reponseCsv(
      `alertes-${slug}.csv`,
      ["Molécule ou produit", "Niveau", "Signaux", "Produits", "Usages", "Échéance", "Action"],
      alertesGroupees(d.id).map((g) => [
        g.titre, g.niveau, [...new Set(g.signaux.map((s) => LIBELLE_ALERTE[s.type]))].join(", "),
        g.produits.map((p) => p.nomCommercial).join(", "), g.usages, g.echeance, g.action,
      ])
    );
  }
  if (table === "matieres") {
    return reponseCsv(
      `matieres-${slug}.csv`,
      ["Matière active", "Molécule", "Catégorie", "Statut UE", "Expiration UE", "CAS", "Mode d'action",
        "Fairtrade", "Rainforest", "Bio UE", "AMM au Maroc", "Détenteurs"],
      matieresDuPortefeuille(d.id).map((m) => {
        const c = conformite(m.nom);
        return [
          m.nom, m.molecule, m.categorie, c.ue?.statut, c.ue?.expiration, c.ue?.cas.join(", "),
          libelleMoa(c.moa).join(" ; "), c.normes?.fairtrade ?? (c.normes ? "non listée" : ""),
          c.normes?.rainforest ?? (c.normes ? "non listée" : ""), c.normes ? c.normes.bio ?? "non autorisée" : "",
          m.nbHomologations, m.detenteurs.length,
        ];
      })
    );
  }
  return new Response("Table inconnue : produits, homologations, alertes ou matieres.", { status: 404 });
}
