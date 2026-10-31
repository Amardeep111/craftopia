import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/admin';
import { Shield, Package, Users, TrendingUp, CheckCircle, Tag, Settings, UserRound, ClipboardList } from 'lucide-react';
import AdminLogoutButton from './logout-button';
import { AdminAccessProvider } from './access-context';

export default async function AdminLayout({ children }) {
  const token = (await cookies()).get('jamaes_session')?.value;
  const session = await getAdminSession(token);
  const role = session?.user?.role;
  if (!role || !['ADMIN', 'SUPERADMIN'].includes(role) || session.user.adminActive === false) {
    redirect('/account/admin-login?redirect=/admin');
  }
  const permissions = Array.isArray(session.user.adminPermissions) ? session.user.adminPermissions : [];
  const isSuperadmin = role === 'SUPERADMIN';
  const can = (permission) => isSuperadmin || permissions.includes(permission) || (permission.endsWith('.view') && permissions.includes(`${permission.slice(0, -'.view'.length)}.manage`));
  return (
    <AdminAccessProvider role={role} permissions={permissions}>
    <div className="min-h-screen bg-ink/5">
      <nav className="sticky top-0 z-40 flex min-h-[64px] flex-wrap items-center justify-between gap-2 border-b border-plum/20 bg-plum px-3 py-3 shadow-soft sm:px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-cream" aria-hidden="true" />
          <span className="font-display text-lg font-bold text-cream sm:text-xl">Admin</span>
        </div>
        <div className="hidden gap-4 text-sm text-cream/90 sm:flex">
          <Link href="/" target="_blank" rel="noopener noreferrer" className="hover:text-cream underline underline-offset-2">Open storefront ↗</Link>
        </div>
        <AdminLogoutButton />
      </nav>
      <aside className="fixed left-0 top-[72px] bottom-0 w-52 bg-ink border-r border-sand/20 hidden md:block">
        <div className="p-4 space-y-1">
          {can('dashboard.view') && <AdminNavLink href="/admin" icon={<TrendingUp className="h-4 w-4" />} label="Dashboard" />}
          {can('orders.view') && <AdminNavLink href="/admin/orders" icon={<Package className="h-4 w-4" />} label="Orders" />}
          {can('customRequests.view') && <AdminNavLink href="/admin/custom-requests" icon={<ClipboardList className="h-4 w-4" />} label="Custom requests" />}
          {can('products.view') && <AdminNavLink href="/admin/products" icon={<CheckCircle className="h-4 w-4" />} label="Products" />}
          {can('users.view') && <AdminNavLink href="/admin/users" icon={<Users className="h-4 w-4" />} label="Customers" />}
          {can('categories.view') && <AdminNavLink href="/admin/categories" icon={<Tag className="h-4 w-4" />} label="Categories" />}
          {can('coupons.view') && <AdminNavLink href="/admin/coupons" icon={<Tag className="h-4 w-4" />} label="Coupons" />}
          {can('settings.view') && <AdminNavLink href="/admin/settings" icon={<Settings className="h-4 w-4" />} label="Store & payment" />}
          {isSuperadmin && <AdminNavLink href="/admin/admins" icon={<Shield className="h-4 w-4" />} label="Admin access" />}
          <AdminNavLink href="/admin/account" icon={<UserRound className="h-4 w-4" />} label="My account" />
        </div>
      </aside>
      <nav aria-label="Admin navigation" className="grid grid-cols-3 gap-1 bg-ink px-1 py-2 sm:px-2 md:hidden [&_a]:flex-col [&_a]:gap-1 [&_a]:px-1 [&_a]:py-2 [&_a]:text-center [&_a]:text-xs [&_a_span]:text-[11px]">
        {can('dashboard.view') && <AdminNavLink href="/admin" icon={<TrendingUp className="h-4 w-4" />} label="Dashboard" />}
        {can('orders.view') && <AdminNavLink href="/admin/orders" icon={<Package className="h-4 w-4" />} label="Orders" />}
        {can('customRequests.view') && <AdminNavLink href="/admin/custom-requests" icon={<ClipboardList className="h-4 w-4" />} label="Custom requests" />}
        {can('products.view') && <AdminNavLink href="/admin/products" icon={<CheckCircle className="h-4 w-4" />} label="Products" />}
        {can('users.view') && <AdminNavLink href="/admin/users" icon={<Users className="h-4 w-4" />} label="Customers" />}
        {can('coupons.view') && <AdminNavLink href="/admin/coupons" icon={<Tag className="h-4 w-4" />} label="Coupons" />}
        {can('settings.view') && <AdminNavLink href="/admin/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />}
        {isSuperadmin && <AdminNavLink href="/admin/admins" icon={<Shield className="h-4 w-4" />} label="Admin access" />}
        <AdminNavLink href="/admin/account" icon={<UserRound className="h-4 w-4" />} label="My account" />
      </nav>
      <main className="min-w-0 px-3 py-5 sm:px-5 sm:py-6 md:ml-52 md:px-8 md:py-10">
        {children}
      </main>
    </div>
    </AdminAccessProvider>
  );
}

function AdminNavLink({ href, icon, label }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-cream/80 hover:bg-plum/50 hover:text-cream transition">
      {icon}
      <span>{label}</span>
    </Link>
  );
}
