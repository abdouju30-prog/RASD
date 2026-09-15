import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "spectres-21-matieres-actives.pdf");

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Le PDF des spectres n'est pas encore disponible.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Homologa_Spectres_21_MA_PHYTO_BEHT_${new Date().toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
