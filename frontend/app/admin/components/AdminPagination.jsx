'use client'

export default function AdminPagination({ page, pageSize, total, pages, onPageChange, onPageSizeChange }) {
  if (!total) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sand bg-white px-3 py-2 text-sm text-muted">
      <span>Showing {first}–{last} of {total}</span>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs">
          Rows
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="min-h-9 rounded-lg border border-sand bg-white px-2 text-sm text-plum"
          >
            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="min-h-9 rounded-lg border border-sand px-3 font-medium text-plum disabled:opacity-40">Previous</button>
        <span className="min-w-16 text-center text-xs">Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)} className="min-h-9 rounded-lg border border-sand px-3 font-medium text-plum disabled:opacity-40">Next</button>
      </div>
    </nav>
  )
}
