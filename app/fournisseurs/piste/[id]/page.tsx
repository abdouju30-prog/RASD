import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ContactCell } from "@/components/Contact";
import { LiensMatieres } from "@/components/LienMatiere";
import { EtiquetteLien, ReservePistes } from "@/components/PistesFournisseur";
import { contactDe } from "@/lib/contact";
import { pisteParId, STATS_PISTES } from "@/lib/pistes";

export const dynamic = "force-dynamic";

export default async function PistePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = pisteParId(decodeURIComponent(id));
  if (!p) notFound();

  const contact = contactDe(p.nom);
  const horsIndex = p.matieres.filter((m) => !p.matieresMaroc.includes(m));

  return (
    <>
      <Link
        href="/fournisseurs?source=apvma"
        style={{ color: "var(--muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} /> Australie
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h1>{p.nom}</h1>
          <div style={{ color: "var(--muted)", fontSize: 13.5, marginTop: 6 }}>
            {p.pays ?? "pays à préciser"}
            {p.pays && !p.paysFiable && <span style={{ color: "var(--mod)" }}> ?</span>}
            {p.filialeLocale && " · filiale australienne"}
            {" · "}
            {p.nbProduitsAu} produit(s) AU
          </div>
        </div>
        <EtiquetteLien lien={p.lien} />
      </div>

      {p.fournisseurOnssa && (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>
          Rapprochement index : <strong style={{ color: "var(--fg)" }}>{p.fournisseurOnssa}</strong>
          {p.lien === "homonyme" ? " — même groupe probable, à confirmer." : "."}
        </p>
      )}

      <div className="card" style={{ padding: "14px 18px", margin: "16px 0" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Contact</div>
        <ContactCell c={contact} />
      </div>

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span>Terrain commun — aussi à l&apos;index ONSSA</span>
          <span className="mono">{p.matieresMaroc.length}</span>
        </div>
        {p.matieresMaroc.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Aucune matière active de cette société n&apos;est homologuée au Maroc.
          </p>
        ) : (
          <p style={{ fontSize: 13.5, lineHeight: 1.7, padding: "8px 0 4px" }}>
            <LiensMatieres noms={p.matieresMaroc} />
          </p>
        )}
      </div>

      <div className="bloc" style={{ marginBottom: 16 }}>
        <div className="titre">
          <span>Autres constituants PUBCRIS</span>
          <span className="mono">{horsIndex.length}</span>
        </div>
        {horsIndex.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "12px 0" }}>
            Toutes ses matières actives australiennes sont aussi à l&apos;index marocain.
          </p>
        ) : (
          <p style={{ fontSize: 13.5, lineHeight: 1.7, padding: "8px 0 4px" }}>
            <LiensMatieres noms={horsIndex} />
          </p>
        )}
      </div>

      <ReservePistes source={STATS_PISTES.source} />
    </>
  );
}
