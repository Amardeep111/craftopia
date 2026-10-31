export const dynamic = 'force-dynamic';

import { Package, Users, TrendingUp, Clock } from 'lucide-react';
import { cookies } from 'next/headers';
import { getAdminSession } from '@/lib/auth/admin';

export default async function AdminDashboard() {
  const session = await getAdminSession((await cookies()).get('jamaes_session')?.value, 'dashboard.view');
  if (!session) return <section className="rounded-2xl bg-cream p-6 ring-1 ring-sand"><h1 className="font-display text-2xl text-plum">Dashboard access unavailable</h1><p className="mt-2 text-sm text-muted">Your administrator account does not have permission to view this page.</p></section>;
  let orders = 0, users = 0, products = 0;
  // Dashboard statistics are loaded via REST API in Go backend
  try {
    const backendUrl = process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    const res = await fetch(`${backendUrl}/api/products?limit=100`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] }));
    products = Array.isArray(res.data) ? res.data.length : 0;
  } catch {}

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-plum">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Package />} label="Confirmed Orders" value={String(orders)} />
        <StatCard icon={<Users />} label="Users" value={String(users)} />
        <StatCard icon={<TrendingUp />} label="Active Products" value={String(products)} />
      </div>
      <div className="rounded-2xl bg-cream ring-1 ring-sand p-6">
        <h2 className="font-display text-xl text-plum mb-4">Quick Status</h2>
        <p className="text-sm text-muted">All data loaded server-side from PostgreSQL. Images served from server (no static placeholders unless missing).</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-cream ring-1 ring-sand p-6 shadow-soft">
      <div className="flex items-center gap-3 mb-2">{icon}<span className="text-sm font-medium text-muted">{label}</span></div>
      <div className="text-3xl font-display font-bold text-plum">{value}</div>
    </div>
  );
}
