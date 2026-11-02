import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveCartItems } from '../app/lib/cart-sync-utils.js'

test('merges a guest cart into the saved cart at sign-in', () => {
  const saved = [{ id: 'rose', quantity: 2 }]
  const guest = [{ id: 'rose', quantity: 3 }, { id: 'bear', quantity: 1 }]

  assert.deepEqual(resolveCartItems(saved, guest, null), [
    { id: 'rose', quantity: 5 },
    { id: 'bear', quantity: 1 },
  ])
})

test('does not add an already-owned local cart to its saved copy', () => {
  const saved = [{ id: 'rose', quantity: 3 }]
  const localMirror = [{ id: 'rose', quantity: 3 }]

  assert.deepEqual(resolveCartItems(saved, localMirror, 'user-1'), saved)
})

test('does not carry a previous account cart into the active account', () => {
  const saved = [{ id: 'bear', quantity: 2 }]
  const previousAccount = [{ id: 'rose', quantity: 4 }]

  assert.deepEqual(resolveCartItems(saved, previousAccount, 'user-1'), saved)
})

test('caps a guest merge at the cart quantity limit', () => {
  const saved = [{ id: 'rose', quantity: 70 }]
  const guest = [{ id: 'rose', quantity: 40 }]

  assert.deepEqual(resolveCartItems(saved, guest, null), [{ id: 'rose', quantity: 99 }])
})
