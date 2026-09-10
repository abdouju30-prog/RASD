import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "rapport-hebdo-onssa.pdf");

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Le rapport PDF n'est pas encore disponible.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Homologa_Rapport_Hebdo_ONSSA_${new Date().toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
