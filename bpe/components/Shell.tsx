export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="no-print sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">BPE</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
    </>
  );
}
