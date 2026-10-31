/**
 * usePayment — client hook wrapping the PaymentService.
 *
 * The UI imports this single hook for every payment action: initialize,
 * confirm, fee estimation, and order creation. It manages the common
 * loading/error/result state so no component re-implements it.
 */
import { useState, useCallback } from 'react'
import * as svc from '../lib/paymentService'

export default function usePayment() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [state, setState] = useState('idle') // idle | processing | success | failed

  const run = useCallback(async (fn, opts = {}) => {
    const { successText, failText } = opts
    setLoading(true)
    setError('')
    setState('processing')
    try {
      const data = await fn()
      setState('success')
      return data
    } catch (e) {
      const message = e.message || failText || 'Something went wrong.'
      setError(message)
      setState('failed')
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const initialize = useCallback(
    (input) => run(() => svc.initializePayment(input), { successText: 'init' }),
    [run]
  )

  const confirm = useCallback(
    (input) => run(() => svc.confirmPayment(input), { successText: 'success', failText: 'failed' }),
    [run]
  )

  const createOrder = useCallback(
    (payload) => run(() => svc.createOrder(payload), { successText: 'success', failText: 'failed' }),
    [run]
  )

  const estimateFee = useCallback(async (input) => {
    try {
      return await svc.estimateFee(input)
    } catch {
      return { fee: 0, free: true }
    }
  }, [])

  return {
    loading,
    error,
    state,
    initialize,
    confirm,
    createOrder,
    estimateFee,
  }
}
