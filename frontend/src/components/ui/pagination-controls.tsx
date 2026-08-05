"use client";

export function PaginationControls({ page, totalItems, pageSize, onPageChange }: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  if (totalPages <= 1) return null;
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-3">
    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{firstItem}–{lastItem} of {totalItems}</span>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-border-focus hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Previous</button>
      <span className="min-w-20 text-center font-mono text-[10px] text-muted-foreground">{page} / {totalPages}</span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-border-focus hover:text-white disabled:cursor-not-allowed disabled:opacity-30">Next</button>
    </div>
  </div>;
}
