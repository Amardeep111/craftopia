import './admin.css';
import ThemeControl from '../components/layout/ThemeControl';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth/admin';
import { Shield, Package, Users, TrendingUp, CheckCircle, Tag, Settings, UserRound, ClipboardList } from 'lucide-react';
import AdminLogoutButton from './logout-button';
import { AdminAccessProvider } from './access-context';
import AdminNavLink from './admin-nav-link';
import AdminSessionHeartbeat from './AdminSessionHeartbeat';

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
    <div className="studio-admin min-h-screen">
      <AdminSessionHeartbeat />
      <nav className="studio-admin-header sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-sand bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-brand" aria-hidden="true" />
          <span className="text-base font-semibold text-ink">Manage store</span>
        </div>
        <div className="hidden gap-4 text-sm text-brand sm:flex">
          <Link href="/" target="_blank" rel="noopener noreferrer" className="hover:text-ink underline underline-offset-2">Open storefront ↗</Link>
        </div>
        <div className="flex items-center gap-3"><AdminLogoutButton /><ThemeControl /></div>
      </nav>
      <aside className="fixed left-0 top-16 bottom-0 w-56 overflow-y-auto border-r border-sand bg-surface hidden md:block">
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
      <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto border-b border-sand bg-surface px-3 py-2 md:hidden [&_a]:shrink-0 [&_a]:gap-2 [&_a]:px-3 [&_a]:text-xs">
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
      <main className="min-w-0 px-4 py-6 sm:px-6 md:ml-56 md:px-8 md:py-8">
        {children}
      </main>
    </div>
    </AdminAccessProvider>
  );
}
