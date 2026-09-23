import { Nav } from "./Nav";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Bonnes pratiques d&apos;expérimentation
            </p>
            <p className="hidden text-sm text-[var(--muted)] sm:block">
              Spectre, cultures et mélanges — lecture seule, Homologa inchangé
            </p>
          </div>
          <Nav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-16 text-sm text-[var(--muted)]">
        Lecture seule de l&apos;index. Homologa n&apos;est pas modifié. Doses et DAR sont des
        précédents, pas une autorisation d&apos;essai.
      </footer>
    </>
  );
}
