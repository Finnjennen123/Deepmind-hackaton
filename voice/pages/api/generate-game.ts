import type { NextApiRequest, NextApiResponse } from 'next'
import { generateGame } from '../../lib/pipeline/orchestrator'
import { digitalCloneProfiles } from '../../lib/pipeline/mock-profiles'
import { buildDigitalCloneProfile } from '../../lib/pipeline/profile-builder'
import { searchForTopic } from '../../lib/pipeline/search'
import { getLatestLearnerProfileForUser } from '../../lib/db'
import type { GenerateGameInput, RendererType, ArticleContext } from '../../lib/pipeline/types'

async function resolveSessionUserId(req: NextApiRequest): Promise<string | null> {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
  const host = req.headers.host
  const cookie = req.headers.cookie || ''
  if (!host) return null
  try {
    const sessionRes = await fetch(`${proto}://${host}/api/auth/get-session`, {
      headers: { cookie },
    })
    const sessionJson = await sessionRes.json()
    return sessionJson?.user?.id ?? null
  } catch {
    return null
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    profileIndex, topic, preferredGameType, forceCustom,
    articleTitle, articleContent, masteryCriteria,
  } = req.body as {
    profileIndex?: number
    topic?: string
    preferredGameType?: RendererType
    forceCustom?: boolean
    articleTitle?: string
    articleContent?: string
    masteryCriteria?: string
  }

  // Profile resolution: session DB profile → mock fallback
  let profile = digitalCloneProfiles[profileIndex ?? 2] // Priya fallback
  try {
    const userId = await resolveSessionUserId(req)
    if (userId) {
      const row = await getLatestLearnerProfileForUser(userId)
      if (row) {
        profile = buildDigitalCloneProfile(row.profile, 'Learner')
      }
    }
  } catch (e) {
    console.warn('[generate-game] Failed to resolve DB profile, using mock:', e)
  }

  if (!profile) {
    return res.status(400).json({ error: 'No profile available' })
  }

  // Build article context + search enrichment
  let articleContext: ArticleContext | undefined
  const effectiveTopic = topic || articleTitle
  if (articleContent && articleTitle) {
    const searchResults = await searchForTopic(effectiveTopic || articleTitle)
    articleContext = {
      title: articleTitle,
      content: articleContent,
      masteryCriteria: masteryCriteria || '',
      searchResults: searchResults.length > 0 ? searchResults : undefined,
    }
  }

  const input: GenerateGameInput = {
    profile,
    topic: effectiveTopic || undefined,
    preferredGameType: preferredGameType || undefined,
    forceCustom: forceCustom || false,
    articleContext,
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  // Flush headers
  res.flushHeaders()

  try {
    for await (const event of generateGame(input)) {
      const data = JSON.stringify(event)
      res.write(`data: ${data}\n\n`)

      // Flush if available (some Node.js adapters support this)
      if (typeof (res as any).flush === 'function') {
        (res as any).flush()
      }

      // Stop streaming after terminal events
      if (event.event === 'complete' || event.event === 'error') {
        break
      }
    }
  } catch (err) {
    const errorEvent = JSON.stringify({
      event: 'error',
      data: { message: err instanceof Error ? err.message : 'Pipeline failed' },
    })
    res.write(`data: ${errorEvent}\n\n`)
  }

  res.end()
}
