export const ADMIN_PERMISSION_GROUPS = [
  { key: 'dashboard', label: 'Dashboard', permissions: [{ id: 'dashboard.view', label: 'View dashboard' }] },
  { key: 'orders', label: 'Orders', permissions: [{ id: 'orders.view', label: 'View orders' }, { id: 'orders.manage', label: 'Update fulfillment, payments, tracking, and refunds' }] },
  { key: 'customRequests', label: 'Custom requests', permissions: [{ id: 'customRequests.view', label: 'View custom order requests and reference images' }, { id: 'customRequests.manage', label: 'Update custom request status and notes' }] },
  { key: 'products', label: 'Products', permissions: [{ id: 'products.view', label: 'View products' }, { id: 'products.manage', label: 'Edit products and prices' }] },
  { key: 'users', label: 'Customers', permissions: [{ id: 'users.view', label: 'View customer accounts' }, { id: 'users.manage', label: 'Activate or deactivate customer accounts' }] },
  { key: 'coupons', label: 'Coupons', permissions: [{ id: 'coupons.view', label: 'View coupons' }, { id: 'coupons.manage', label: 'Create and edit coupons' }] },
  { key: 'categories', label: 'Categories', permissions: [{ id: 'categories.view', label: 'View categories' }, { id: 'categories.manage', label: 'Edit categories, images, and order' }] },
  { key: 'settings', label: 'Payment settings', permissions: [{ id: 'settings.view', label: 'View payment settings' }, { id: 'settings.manage', label: 'Edit payment settings' }] },
]

export const ADMIN_PERMISSION_IDS = new Set(ADMIN_PERMISSION_GROUPS.flatMap((group) => group.permissions.map((permission) => permission.id)))
