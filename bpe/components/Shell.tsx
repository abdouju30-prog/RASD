import { Nav } from "./Nav";
import { CORPUS } from "@/lib/corpus";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                Bonnes pratiques d&apos;expérimentation
              </p>
              <p className="text-sm text-[var(--muted)]">
                Spectre, mélanges et organismes — lecture seule, Homologa inchangé
              </p>
            </div>
          </div>
          <Nav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-sm text-[var(--muted)]">
        {CORPUS.meta.avertissement}
      </footer>
    </>
  );
}
