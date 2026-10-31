// Shared order status metadata used by all order pages (success, list, detail).
// Statuses flow: PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED.
// CANCELLED is a terminal off-flow state.

import { CheckCircle2, Package, Truck, AlertCircle, Clock } from 'lucide-react'

export const STATUS_META = {
  PENDING:    { label: 'Pending payment', icon: Clock,        color: 'text-muted',   dot: 'bg-muted',   bg: 'bg-muted/15',   desc: 'Awaiting payment confirmation.' },
  CONFIRMED:  { label: 'Confirmed',       icon: CheckCircle2, color: 'text-sage',    dot: 'bg-sage',    bg: 'bg-sage/15',    desc: 'Your order has been placed.' },
  PROCESSING: { label: 'Being crafted',   icon: Package,      color: 'text-bloom',   dot: 'bg-bloom',   bg: 'bg-bloom/15',   desc: 'Our artisans are preparing it.' },
  SHIPPED:    { label: 'Shipped',         icon: Truck,        color: 'text-plum',    dot: 'bg-plum',    bg: 'bg-plum/15',    desc: 'On its way to you.' },
  DELIVERED:  { label: 'Delivered',       icon: CheckCircle2, color: 'text-sage',    dot: 'bg-sage',    bg: 'bg-sage/15',    desc: 'Enjoy your piece!' },
  CANCELLED:  { label: 'Cancelled',       icon: AlertCircle,  color: 'text-bloom',   dot: 'bg-bloom',   bg: 'bg-bloom/15',   desc: 'This order was cancelled.' },
  RETURN_REQUESTED: { label: 'Return requested', icon: Clock, color: 'text-bloom', dot: 'bg-bloom', bg: 'bg-bloom/15', desc: 'Your return request is waiting for review.' },
  RETURN_APPROVED: { label: 'Return approved', icon: CheckCircle2, color: 'text-sage', dot: 'bg-sage', bg: 'bg-sage/15', desc: 'Your return has been approved.' },
  RETURN_IN_TRANSIT: { label: 'Return in transit', icon: Truck, color: 'text-plum', dot: 'bg-plum', bg: 'bg-plum/15', desc: 'Your return is on its way back.' },
  RETURNED: { label: 'Returned', icon: CheckCircle2, color: 'text-sage', dot: 'bg-sage', bg: 'bg-sage/15', desc: 'The item has been returned.' },
  REFUND_REQUESTED: { label: 'Refund requested', icon: Clock, color: 'text-bloom', dot: 'bg-bloom', bg: 'bg-bloom/15', desc: 'Your refund request is waiting for review.' },
}

export const STATUS_FLOW = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

export function getFlowIndex(status) {
  if (status === 'CANCELLED' || status === 'PENDING') return -1
  return STATUS_FLOW.indexOf(status)
}

export function getStatusMeta(status) {
  return STATUS_META[status] || { label: status, color: 'text-muted', dot: 'bg-muted', bg: 'bg-muted/15', icon: Clock, desc: 'Unknown status.' }
}

export const PAYMENT_STATUS_META = {
  PENDING: { label: 'Payment pending', description: 'We are waiting for payment.' },
  AWAITING_VERIFICATION: { label: 'Payment verification in progress', description: 'We are checking your payment.' },
  PAID: { label: 'Paid', description: 'Payment received.' },
  COD_PENDING_COLLECTION: { label: 'Payment due on delivery', description: 'Pay the delivery partner when your order arrives.' },
  COD_COLLECTED: { label: 'Paid on delivery', description: 'Cash payment received at delivery.' },
  MANUAL_REVIEW: { label: 'Payment under review', description: 'Our team is reviewing your payment.' },
  FAILED: { label: 'Payment failed', description: 'Payment was not completed.' },
  EXPIRED: { label: 'Payment expired', description: 'The payment request expired.' },
  CANCELLED: { label: 'Payment cancelled', description: 'The payment was cancelled.' },
  REFUND_REQUESTED: { label: 'Refund requested', description: 'Your refund request is waiting for review.' },
  REFUND_APPROVED: { label: 'Refund approved', description: 'Your refund request has been approved.' },
  REFUND_PROCESSING: { label: 'Refund processing', description: 'Your refund has been approved and is being processed.' },
  REFUND_REJECTED: { label: 'Refund request declined', description: 'Your refund request was declined. Contact support if you have questions.' },
  PARTIALLY_REFUNDED: { label: 'Partially refunded', description: 'Part of your payment has been refunded.' },
  REFUNDED: { label: 'Refunded', description: 'Your payment has been refunded.' },
}

export function getPaymentStatusMeta(status) {
  return PAYMENT_STATUS_META[status] || { label: 'Payment status unavailable', description: '' }
}
