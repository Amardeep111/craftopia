function normalizedState(value) {
  return String(value || '').trim().toLocaleLowerCase('en-IN').replace(/[.\s]+/g, ' ')
}

export function getProductDeliveryRestriction(product, address) {
  if (product.availableForSale === false) return 'This item is temporarily unavailable for purchase.'
  const state = normalizedState(address?.state)
  const pinCode = String(address?.pinCode || '').replace(/\D/g, '').slice(0, 6)
  const restrictedState = (product.unavailableStates || []).find((item) => normalizedState(item) === state)
  if (state && restrictedState) return `This item cannot be delivered to ${address.state}. Please remove it or use another delivery address.`
  const restrictedPin = (product.unavailablePinCodes || []).find((item) => String(item).replace(/\D/g, '') === pinCode)
  if (pinCode && restrictedPin) return `This item cannot be delivered to PIN code ${pinCode}. Please remove it or use another delivery address.`
  return null
}
