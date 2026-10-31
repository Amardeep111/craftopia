/** Resolve the public origin used by emails and server-generated links. */
export function getAppUrl() {
  const configuredUrl = process.env.APP_URL?.trim()
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`

  return `http://localhost:${process.env.PORT || 3000}`
}
