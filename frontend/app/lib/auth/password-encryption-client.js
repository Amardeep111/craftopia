'use client'

let cachedKeyPromise

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export async function encryptPassword(password) {
  if (typeof password !== 'string' || !password || password.length > 128) throw new Error('Enter a valid password.')
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot securely encrypt passwords. Update your browser and try again.')
  cachedKeyPromise ||= fetch('/api/auth/password-key', { cache: 'no-store' }).then(async (response) => {
    const data = await response.json()
    if (!response.ok || !data.publicKey || !data.kid) throw new Error(data.error || 'Secure password handling is temporarily unavailable.')
    return data
  }).catch((error) => { cachedKeyPromise = undefined; throw error })
  const { publicKey, kid } = await cachedKeyPromise
  const key = await crypto.subtle.importKey('jwk', publicKey, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt'])
  const ciphertext = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(password))
  return { v: 1, kid, ciphertext: toBase64Url(new Uint8Array(ciphertext)) }
}
