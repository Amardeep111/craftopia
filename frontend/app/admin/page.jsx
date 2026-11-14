'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Package,
  Users,
  TrendingUp,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Settings,
  Tag,
  ShoppingBag,
} from 'lucide-react'
import { useAdminAccess } from './access-context'

export default function AdminDashboard() {
  const { can } = useAdminAccess()
  const [stats, setStats] = useState({ orders: 0, users: 0, products: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      // Primary: Single aggregated query endpoint
      const response = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      const result = await response.json()

      if (response.ok && result.success && result.data) {
        setStats({
          orders: Number(result.data.orders) || 0,
          users: Number(result.data.users) || 0,
          products: Number(result.data.products) || 0,
          pending: Number(result.data.pending) || 0,
        })
        setLastUpdated(new Date())
        return
      }

      // Resilient fallback: Query individual endpoints if dashboard aggregate returns error
      const [ordersRes, usersRes, productsRes] = await Promise.allSettled([
        fetch('/api/admin/orders?page=1&pageSize=1', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/admin/users?page=1&pageSize=1', { cache: 'no-store' }).then((r) => r.json()),
        fetch('/api/products?limit=100', { cache: 'no-store' }).then((r) => r.json()),
      ])

      const fallbackOrders = ordersRes.status === 'fulfilled' ? Number(ordersRes.value?.data?.total || 0) : 0
      const fallbackUsers = usersRes.status === 'fulfilled' ? Number(usersRes.value?.data?.total || 0) : 0
      const fallbackProducts =
        productsRes.status === 'fulfilled'
          ? Array.isArray(productsRes.value?.data)
            ? productsRes.value.data.length
            : Number(productsRes.value?.data?.total || 0)
          : 0

      setStats({
        orders: fallbackOrders,
        users: fallbackUsers,
        products: fallbackProducts,
        pending: 0,
      })
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message || 'Could not load dashboard statistics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Overview of store performance, customers, and active orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => loadStats(true)}
            disabled={refreshing || loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-sand bg-surface px-3 py-1.5 text-sm font-medium text-brand shadow-none hover:bg-sand/30 disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-bloom/10 p-4 text-sm text-accent ring-1 ring-bloom/20">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pending Orders Notice Banner */}
      {!loading && stats.pending > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-sand bg-warning-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="font-semibold text-ink">
                {stats.pending} {stats.pending === 1 ? 'order requires' : 'orders require'} attention
              </p>
              <p className="text-xs text-warning">
                Awaiting payment verification or order confirmation.
              </p>
            </div>
          </div>
          {can('orders.view') && (
            <Link
              href="/admin/orders?status=PENDING"
              className="inline-flex min-h-9 items-center justify-center rounded-lg bg-plum px-4 py-2 text-sm font-semibold text-on-primary hover:bg-[var(--action-hover)]"
            >
              Review pending orders →
            </Link>
          )}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Package className="h-5 w-5 text-brand" />}
          label="Confirmed Orders"
          value={loading ? '…' : stats.orders.toLocaleString('en-IN')}
          href={can('orders.view') ? '/admin/orders' : undefined}
          subtext="Total active & confirmed orders"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-brand" />}
          label="Users"
          value={loading ? '…' : stats.users.toLocaleString('en-IN')}
          href={can('users.view') ? '/admin/users' : undefined}
          subtext="Registered customer accounts"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-brand" />}
          label="Active Products"
          value={loading ? '…' : stats.products.toLocaleString('en-IN')}
          href={can('products.view') ? '/admin/products' : undefined}
          subtext="Published catalog items"
        />
      </div>

      {/* Quick Navigation & Shortcuts */}
      <section className="rounded-lg bg-surface ring-1 ring-sand p-6 shadow-none">
        <h2 className="font-display text-xl text-brand mb-4">Quick Management</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {can('orders.view') && (
            <Link
              href="/admin/orders"
              className="group flex items-center justify-between rounded-xl border border-sand bg-surface p-3.5 transition hover:border-plum hover:shadow-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ShoppingBag className="h-5 w-5 text-brand shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand group-hover:underline">Orders</p>
                  <p className="text-xs text-muted truncate">Fulfillment & payments</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition" />
            </Link>
          )}

          {can('products.view') && (
            <Link
              href="/admin/products"
              className="group flex items-center justify-between rounded-xl border border-sand bg-surface p-3.5 transition hover:border-plum hover:shadow-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <TrendingUp className="h-5 w-5 text-brand shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand group-hover:underline">Products</p>
                  <p className="text-xs text-muted truncate">Stock & catalog items</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition" />
            </Link>
          )}

          {can('users.view') && (
            <Link
              href="/admin/users"
              className="group flex items-center justify-between rounded-xl border border-sand bg-surface p-3.5 transition hover:border-plum hover:shadow-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users className="h-5 w-5 text-brand shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand group-hover:underline">Customers</p>
                  <p className="text-xs text-muted truncate">Registered accounts</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition" />
            </Link>
          )}

          {can('settings.view') && (
            <Link
              href="/admin/settings"
              className="group flex items-center justify-between rounded-xl border border-sand bg-surface p-3.5 transition hover:border-plum hover:shadow-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Settings className="h-5 w-5 text-brand shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand group-hover:underline">Store Settings</p>
                  <p className="text-xs text-muted truncate">UPI & business info</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition" />
            </Link>
          )}

          {can('customRequests.view') && (
            <Link
              href="/admin/custom-requests"
              className="group flex items-center justify-between rounded-xl border border-sand bg-surface p-3.5 transition hover:border-plum hover:shadow-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ClipboardList className="h-5 w-5 text-brand shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand group-hover:underline">Custom Orders</p>
                  <p className="text-xs text-muted truncate">Customer requests</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition" />
            </Link>
          )}

          {can('coupons.view') && (
            <Link
              href="/admin/coupons"
              className="group flex items-center justify-between rounded-xl border border-sand bg-surface p-3.5 transition hover:border-plum hover:shadow-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Tag className="h-5 w-5 text-brand shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand group-hover:underline">Coupons</p>
                  <p className="text-xs text-muted truncate">Promo codes & offers</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition" />
            </Link>
          )}
        </div>
      </section>

      {/* Database & sync note */}
      <div className="rounded-lg bg-surface ring-1 ring-sand p-5 text-xs text-muted">
        <p className="font-semibold text-brand mb-1">Database & Live Metrics</p>
        <p>
          All counts are synchronized live from PostgreSQL via the backend API. User counts reflect all active registered customer profiles.
        </p>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, href, subtext }) {
  const CardContent = (
    <div className="rounded-lg bg-surface ring-1 ring-sand p-6 shadow-none transition hover:ring-plum/40 hover:shadow-md flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-brand">{icon}</span>
            <span className="text-sm font-medium text-muted">{label}</span>
          </div>
          {href && <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand group-hover:translate-x-0.5 transition" />}
        </div>
        <div className="text-3xl font-display font-bold text-brand">{value}</div>
      </div>
      {subtext && <p className="mt-3 text-xs text-muted border-t border-sand/40 pt-2">{subtext}</p>}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="group block focus:outline-none focus:ring-2 focus:ring-plum rounded-lg">
        {CardContent}
      </Link>
    )
  }

  return CardContent
}
