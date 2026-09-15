import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "Catalogue_PHYTOBEHT_2026_complet.pdf");

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Le catalogue PDF n'est pas encore disponible.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Catalogue_PHYTOBEHT_2026_complet.pdf"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
