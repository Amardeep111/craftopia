import defaultContent from '@/data/about-content.json'

const BACKEND_URL = (process.env.GO_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://craftopia-backend.vercel.app' : 'http://localhost:8080')).replace(/\/$/, '')

export function mergeAboutContent(parsed) {
  if (!parsed || typeof parsed !== 'object') return defaultContent
  return {
    ...defaultContent,
    ...parsed,
    header: { ...defaultContent.header, ...(parsed.header || {}) },
    story: { ...defaultContent.story, ...(parsed.story || {}) },
    makersHeading: { ...defaultContent.makersHeading, ...(parsed.makersHeading || {}) },
    makers: Array.isArray(parsed.makers) && parsed.makers.length ? parsed.makers : defaultContent.makers,
    values: Array.isArray(parsed.values) && parsed.values.length ? parsed.values : defaultContent.values,
    crafting: { ...defaultContent.crafting, ...(parsed.crafting || {}) },
  }
}

export async function getAboutContent() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/about`, { cache: 'no-store' })
    if (response.ok) {
      const result = await response.json()
      const content = result?.data?.aboutContent || result?.data || result?.aboutContent || result
      if (content && typeof content === 'object') return mergeAboutContent(content)
    }
  } catch (error) {
    console.error('Failed to load About content from the database:', error)
  }
  return defaultContent
}
