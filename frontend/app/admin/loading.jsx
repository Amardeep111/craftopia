export default function AdminLoading() {
  return <div role="status" aria-label="Loading management page" aria-busy="true" className="space-y-6">
    <span className="sr-only">Opening management page…</span>
    <div aria-hidden="true" className="h-8 w-48 rounded bg-sand/50" />
    <div aria-hidden="true" className="h-80 rounded-xl border border-sand bg-surface" />
  </div>
}
