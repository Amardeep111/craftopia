/**
 * Direct UPI payment provider adapter.
 * Generates UPI intent URI and QR code for server-calculated amount.
 */

export const upiProvider = {
  name: 'upi',
  
  async initialize({ amount, currency, orderNumber, orderId }) {
    if (!process.env.MERCHANT_UPI_ID || !process.env.MERCHANT_PAYEE_NAME) {
      throw new Error('UPI merchant configuration is missing.')
    }

    // Amount in rupees with 2 decimal places (UPI format)
    const amountInRupees = (amount / 100).toFixed(2)
    
    const params = {
      pa: process.env.MERCHANT_UPI_ID.trim(),
      pn: process.env.MERCHANT_PAYEE_NAME.trim(),
      am: amountInRupees,
      cu: currency || 'INR',
      tn: `Order ${orderNumber || orderId}`,
    }

    const upiUri = `upi://pay?pa=${params.pa}&pn=${params.pn}&am=${params.am}&cu=${params.cu}&tn=${params.tn}`

    return {
      provider: 'upi',
      providerReference: orderNumber || orderId,
      amount,
      currency: currency || 'INR',
      testMode: false,
      data: {
        upiUri,
        amountInRupees,
        merchantVpa: process.env.MERCHANT_UPI_ID,
        merchantName: process.env.MERCHANT_PAYEE_NAME,
      },
    }
  },

  async verify({ providerReference, utr }) {
    // Direct UPI requires manual verification
    // Return awaiting_verification state, admin must manually mark as paid
    return {
      verified: false,
      status: 'AWAITING_VERIFICATION',
      providerReference,
      utr,
      testMode: false,
    }
  },
}
