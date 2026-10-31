'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react'
import CheckoutProgress from '@/components/checkout/CheckoutProgress'
import PaymentMethodList from './PaymentMethodList'
import UpiForm from './UpiForm'
import CardForm from './CardForm'
import NetBankingForm from './NetBankingForm'
import CodForm from './CodForm'
import PaymentSummary from './PaymentSummary'
import PaymentResult from './PaymentResult'
import { PAYMENT_METHODS, PAYMENT_METHOD_ORDER } from '@/lib/payment'
import { couponDiscountAmount } from '@/lib/coupon'
import { useCartStore } from '@/lib/cart'
import { useCouponStore } from '@/lib/coupon'
import { useAddressStore } from '@/lib/address'
import { useUserStore } from '@/lib/user'
import usePayment from '@/hooks/usePayment'

export default function PaymentPage() {
  const router = useRouter()

  // ── Cart ────────────────────────────────────────────────────────────────
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clear)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const availableMethods = items.reduce((allowed, item) => {
    const productMethods = Array.isArray(item.allowedPaymentMethods) && item.allowedPaymentMethods.length ? item.allowedPaymentMethods : ['upi']
    return allowed.filter((method) => productMethods.includes(method))
  }, ['upi', 'cod'])

  // ── Coupon ──────────────────────────────────────────────────────────────
  const coupon = useCouponStore((s) => s.coupon)
  const discount = couponDiscountAmount(coupon, subtotal)

  // ── Address ─────────────────────────────────────────────────────────────
  const selectedAddress = useAddressStore((s) => s.getSelectedAddress())

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authEmail = useUserStore((s) => s.email)
  const authUserId = useUserStore((s) => s.userId)

  // ── Payment state ────────────────────────────────────────────────────────
  const [selectedMethod, setSelectedMethod] = useState('upi')
  const [submitState, setSubmitState] = useState('form') // 'form' | 'processing' | 'success' | 'failure'
  const [orderResult, setOrderResult] = useState(null)
  const [failureMessage, setFailureMessage] = useState('')
  // Idempotency guard — prevent duplicate orders on double-click / network retry.
  const [inFlight, setInFlight] = useState(false)
  useEffect(() => {
    if (availableMethods.length && !availableMethods.includes(selectedMethod)) setSelectedMethod(availableMethods[0])
  }, [availableMethods.join(','), selectedMethod])

  // ── Fee ─────────────────────────────────────────────────────────────────
  const gstTotal = items.reduce((sum, item) => sum + (item.gstAmount || Math.round(item.price * (item.gstPercent || 0) / 100)) * item.quantity, 0)
  const codFee = items.reduce((sum, item) => sum + (item.codFee || 0) * item.quantity, 0)
  const otherChargeTotal = items.reduce((sum, item) => sum + (item.otherCharge || 0) * item.quantity, 0)
  const shipping = subtotal >= 999 ? 0 : 49
  const orderTotal = subtotal - discount + shipping + gstTotal + otherChargeTotal
  const codTotal = orderTotal + codFee
  const currentFee = selectedMethod === 'cod' ? codFee : 0

  // ── Payment service ──────────────────────────────────────────────────────
  const { loading, error, initialize, confirm, createOrder } = usePayment()

  // ── Guard: empty cart ────────────────────────────────────────────────────
  if (items.length === 0 && submitState !== 'success') {
    return (
      <div className="container-page pb-20 pt-10 text-center">
        <div className="mx-auto max-w-md rounded-3xl bg-ivory/60 p-10">
          <p className="font-display text-2xl text-plum">Nothing here yet</p>
          <p className="mt-2 text-sm text-muted">Add something to your bag before checking out.</p>
          <Link href="/shop" className="mt-5 inline-block rounded-full bg-plum px-5 py-2.5 text-sm font-semibold text-cream">
            Browse the shop
          </Link>
        </div>
      </div>
    )
  }

  // ── Submit handler ────────────────────────────────────────────────────────
  async function handleSubmit(details) {
    // Idempotency: ignore if already processing / completed.
    if (inFlight || submitState === 'processing' || submitState === 'success') return
    setInFlight(true)
    setSubmitState('processing')

    try {
      // COD or manual UPI: the server records UPI as awaiting verification.
      if (selectedMethod === 'cod' || selectedMethod === 'upi') {
        if (!selectedAddress || !selectedAddress.fullName) {
          setInFlight(false)
          setSubmitState('failure')
          setFailureMessage('Please add a delivery address before placing your order.')
          return
        }
        const effectiveTotal = selectedMethod === 'cod' ? codTotal : orderTotal
        const orderData = {
          customerName: selectedAddress?.fullName || authEmail?.split('@')[0] || '',
          customerEmail: selectedAddress?.email || authEmail || '',
          customerPhone: selectedAddress?.mobileNumber || '',
          shippingAddress: { ...selectedAddress, userId: authUserId || null },
          totalAmount: effectiveTotal,
          paymentMethod: selectedMethod === 'cod' ? 'Cash on Delivery' : 'UPI',
          paymentReference: selectedMethod === 'upi' ? (details?.paymentReference || null) : null,
          paymentStatus: selectedMethod === 'cod' ? 'COD_PENDING_COLLECTION' : 'AWAITING_VERIFICATION',
          status: selectedMethod === 'cod' ? 'CONFIRMED' : 'PENDING',
          items: items.map((i) => ({
            productId: i.id,
            productName: i.name,
            unitPrice: i.price,
            quantity: i.quantity,
          })),
          couponCode: coupon?.code || null,
          notes: selectedMethod === 'cod' ? 'Payment method: COD | Pay on delivery' : 'Payment method: UPI | Customer reports payment sent; verification required.',
        }

        const order = await createOrder(orderData)
        const orderNumber = order?.orderNumber || order?.id

        clearCart()

        // Persist the most recent order so the success page can render immediately
        try {
          if (orderNumber) {
            window.sessionStorage.setItem('jamaes:lastOrderNumber', orderNumber)
            window.sessionStorage.setItem(
              `jamaes:order:${orderNumber}`,
              JSON.stringify({
                orderId: order?.id,
                orderNumber,
                amount: effectiveTotal,
                method: selectedMethod === 'cod' ? 'Cash on Delivery' : 'UPI',
                address: selectedAddress,
                testMode: false,
                paymentStatus: selectedMethod === 'cod' ? 'COD_PENDING_COLLECTION' : 'AWAITING_VERIFICATION',
                paymentReference: selectedMethod === 'upi' ? (details?.paymentReference || null) : null,
                status: selectedMethod === 'cod' ? 'CONFIRMED' : 'PENDING',
              })
            )
          }
        } catch {
          /* session storage may be unavailable; redirect anyway */
        }

        setInFlight(false)

        // Redirect to order success page so the user sees confirmation + tracking + "View my orders"
        if (orderNumber) {
          window.location.href = `/checkout/success?order=${encodeURIComponent(orderNumber)}`
        } else {
          window.location.href = '/orders/me'
        }
        return
      }

      // All other methods: initialize + confirm + create (existing flow)
      const initResult = await initialize({
        method: selectedMethod,
        details,
        amount: orderTotal + currentFee,
        currency: 'INR',
      })

      if (initResult.testMode) {
        throw new Error('Online payment is not connected yet. No payment was taken. Please choose Cash on Delivery.')
      }

      let confirmed
      try {
        confirmed = await confirm({
          method: selectedMethod,
          providerReference: initResult.providerReference,
          details,
        })
      } catch (verifyError) {
        throw verifyError
      }

      if (!confirmed?.verified) throw new Error('Your payment could not be verified. No order was placed.')

      const orderData = {
        customerName: selectedAddress?.fullName || '',
        customerEmail: selectedAddress?.email || authEmail || '',
        customerPhone: selectedAddress?.mobileNumber || '',
        shippingAddress: selectedAddress || null,
        totalAmount: orderTotal + currentFee,
        paymentMethod: PAYMENT_METHODS[selectedMethod]?.label || selectedMethod,
        paymentStatus: 'PAID',
        paymentReference: initResult.providerReference,
        status: 'CONFIRMED',
        items: items.map((i) => ({
          productId: i.id,
          productName: i.name,
          unitPrice: i.price,
          quantity: i.quantity,
        })),
        couponCode: coupon?.code || null,
        notes: `Payment method: ${selectedMethod} | Provider ref: ${initResult.providerReference}`,
      }

      const order = await createOrder(orderData)

      setOrderResult({
        orderId: order?.id,
        orderNumber: order?.orderNumber,
        amount: orderTotal + currentFee,
        method: PAYMENT_METHODS[selectedMethod]?.label || selectedMethod,
        address: selectedAddress,
        testMode: initResult.testMode,
      })

      clearCart()
      setInFlight(false)
      setSubmitState('success')
      if (order?.orderNumber) {
        window.location.href = `/checkout/success?order=${encodeURIComponent(order.orderNumber)}`
      } else {
        window.location.href = '/orders/me'
      }
      return
    } catch (e) {
      setInFlight(false)
      setFailureMessage(e.message || 'Payment could not be completed. Please try again.')
      setSubmitState('failure')
    }
  }

  // ── Payment form for selected method ─────────────────────────────────────
  function renderForm() {
    // COD needs the inFlight guard; other methods use the usePayment loading state.
    const isLoading = selectedMethod === 'cod' ? inFlight : loading
    const props = {
      total: orderTotal,
      fee: currentFee,
      testMode: true, // Always test mode since no real gateway is wired yet.
      onSubmit: handleSubmit,
      loading: isLoading,
      error,
      orderId: orderResult?.orderId, // Pass the order ID if order was created
    }
    switch (selectedMethod) {
      case 'upi':     return <UpiForm {...props} />
      case 'card':    return <CardForm {...props} />
      case 'net_banking': return <NetBankingForm {...props} />
      case 'cod':     return <CodForm {...props} />
      default:        return null
    }
  }

  // ── Continue shopping (from success or failure) ───────────────────────────
  function handleContinueShopping() {
    router.push('/shop')
  }

  function handleViewOrder() {
    const num = orderResult?.orderNumber
    if (num) router.push(`/checkout/success?order=${encodeURIComponent(num)}`)
    else router.push('/orders/me')
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container-page pb-24 pt-8 md:pt-12">
      {/* Progress */}
      <CheckoutProgress current="payment" />

      {/* Back nav */}
      <div className="mt-5 flex items-center gap-3">
        <Link
          href="/checkout"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-plum"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to order summary
        </Link>
      </div>

      <h1 className="mt-4 font-display text-3xl text-plum">Payment</h1>

      {/* ── Two-column layout (desktop) ───────────────────────────────────── */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        {/* ── LEFT: payment methods + form ─────────────────────────────── */}
        <section aria-label="Payment">
          {submitState === 'form' ? (
            <>
              <div className="paper-card p-5 sm:p-6">
                <h2 className="font-display text-xl text-plum mb-4">Payment Methods</h2>
                <PaymentMethodList selected={selectedMethod} onSelect={setSelectedMethod} availableMethods={availableMethods} />
              </div>

              {/* Selected method form */}
              {availableMethods.includes(selectedMethod) && (
                <div className="paper-card mt-4 p-5 sm:p-6">
                  <h2 className="font-display text-xl text-plum mb-5">
                    {PAYMENT_METHODS[selectedMethod]?.label}
                  </h2>
                  {renderForm()}
                </div>
              )}

              {/* Security badge */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted/70">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>Your payment is protected. We never store card details.</span>
              </div>
            </>
          ) : (
            <PaymentResult
              variant={submitState === 'processing' ? 'processing' : submitState}
              result={orderResult}
              errorMessage={failureMessage}
              onRetry={() => setSubmitState('form')}
              onContinueShopping={handleContinueShopping}
              onViewOrder={handleViewOrder}
            />
          )}
        </section>

        {/* ── RIGHT: order summary ─────────────────────────────────────── */}
        <section aria-label="Order summary" className="lg:sticky lg:top-6 lg:self-start">
          <PaymentSummary method={selectedMethod} fee={currentFee} />
        </section>
      </div>
    </div>
  )
}
