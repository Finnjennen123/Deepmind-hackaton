// You.com Search API client for enriching game generation with web context

import type { SearchResult } from './types'

interface YouWebResult {
  url: string
  title: string
  description: string
  snippets?: string[]
}

interface YouSearchResponse {
  results?: {
    web?: YouWebResult[]
  }
}

export async function searchForTopic(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.YOU_API_KEY
  if (!apiKey) {
    console.log('[search] YOU_API_KEY not set, skipping search enrichment')
    return []
  }

  try {
    const url = `https://api.ydc-index.io/v1/search?query=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: { 'X-API-Key': apiKey },
    })

    if (!res.ok) {
      console.warn(`[search] You.com API returned ${res.status}`)
      return []
    }

    const data = (await res.json()) as YouSearchResponse
    const webResults = data.results?.web || []

    return webResults.slice(0, 5).map(r => ({
      title: r.title,
      url: r.url,
      snippet: (r.snippets?.[0] || r.description || '').slice(0, 500),
    }))
  } catch (err) {
    console.warn('[search] You.com search failed:', err instanceof Error ? err.message : err)
    return []
  }
}
