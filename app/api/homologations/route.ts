import { NextRequest, NextResponse } from "next/server";
import {
  enregistrementsCsv,
  resoudreCible,
  resoudreCulture,
  resoudreEmploi,
  type StatutAmm,
} from "@/lib/usages";

export const dynamic = "force-dynamic";

function statutDe(v: string | null): StatutAmm {
  if (v === "vigueur" || v === "expire") return v;
  return "tous";
}

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const culture = resoudreCulture(sp.get("culture") ?? "");
  const cible = resoudreCible(sp.get("cible") ?? sp.get("maladie") ?? "");
  const molQ = (sp.get("molecule") ?? "").trim();
  const matiere = molQ ? resoudreEmploi(molQ).matiere : null;
  const societe = (sp.get("societe") ?? "").trim() || null;
  const statut = statutDe(sp.get("statut"));

  if (!culture && !cible && !matiere && !societe) {
    return new NextResponse("Indiquez une substance, une culture, un ravageur ou une société.\n", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const { csv } = enregistrementsCsv({ culture, cible, matiere, societe, statut });
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="homologations.csv"',
      "Cache-Control": "no-store",
    },
  });
}
