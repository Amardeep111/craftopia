export function mergeGuestCartItems(savedItems, guestItems) {
  const merged = new Map(savedItems.map((item) => [item.id, { ...item }]))
  for (const item of guestItems) {
    const current = merged.get(item.id)
    if (current) {
      current.quantity = Math.min(99, Number(current.quantity || 0) + Number(item.quantity || 0))
      if (!current.image && item.image) current.image = item.image
      if (!current.imageUrl && item.imageUrl) current.imageUrl = item.imageUrl
      if (!current.visual && item.visual) current.visual = item.visual
    } else {
      merged.set(item.id, { ...item, quantity: Math.min(99, Number(item.quantity || 1)) })
    }
  }
  return [...merged.values()]
}

export function resolveCartItems(savedItems, localItems, localOwnerUserId) {
  // Guest items should join a saved cart once at sign-in. A cart already owned
  // by any account is never additive, and is never copied into another account.
  return localOwnerUserId === null
    ? mergeGuestCartItems(savedItems, localItems)
    : savedItems
}
