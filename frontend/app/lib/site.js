import defaultSite from '@/data/site-content.json'
import { cache } from 'react'

const BACKEND_URL = (process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')).replace(/\/$/, '')

export function mergeSiteContent(parsed) {
  if (!parsed || typeof parsed !== 'object') return defaultSite
  return {
    ...defaultSite,
    ...parsed,
    social: {
      ...defaultSite.social,
      ...(parsed.social || {}),
    },
    visibility: {
      ...defaultSite.visibility,
      ...(parsed.visibility || {}),
    },
    images: {
      ...defaultSite.images,
      ...(parsed.images || {}),
      hero: {
        ...(defaultSite.images?.hero || {}),
        ...(parsed.images?.hero || {}),
      },
      brandStory: {
        ...(defaultSite.images?.brandStory || {}),
        ...(parsed.images?.brandStory || {}),
      },
      customOrderCta: {
        ...(defaultSite.images?.customOrderCta || {}),
        ...(parsed.images?.customOrderCta || {}),
      },
      customOrdersPage: {
        ...(defaultSite.images?.customOrdersPage || {}),
        ...(parsed.images?.customOrdersPage || {}),
      },
      craftTable: Array.isArray(parsed.images?.craftTable) && parsed.images.craftTable.length
        ? parsed.images.craftTable
        : defaultSite.images?.craftTable || [],
    },
  }
}

export const getSiteContent = cache(async function getSiteContent() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/site`, { cache: 'no-store' })
    if (response.ok) {
      const result = await response.json()
      const content = result?.data?.siteContent || result?.data || result?.siteContent || result
      if (content && typeof content === 'object') return mergeSiteContent(content)
    }
  } catch (error) {
    console.error('Failed to load site content from the database:', error)
  }
  return defaultSite
})
