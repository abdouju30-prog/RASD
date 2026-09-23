import { notFound, redirect } from "next/navigation";
import { ANCIENNES, ETAPES } from "@/lib/procedures";

export function generateStaticParams() {
  const ids = new Set([...ETAPES.map((e) => e.id), ...Object.keys(ANCIENNES)]);
  return [...ids].map((id) => ({ id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const etape = ANCIENNES[id] ?? (ETAPES.some((e) => e.id === id) ? id : "");
  if (!etape) notFound();
  redirect(`/procedures?etape=${etape}`);
}
