import type { NextApiRequest, NextApiResponse } from 'next'
import { generateGame } from '../../lib/pipeline/orchestrator'
import { digitalCloneProfiles } from '../../lib/pipeline/mock-profiles'
import type { GenerateGameInput, RendererType } from '../../lib/pipeline/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { profileIndex, topic, preferredGameType, forceCustom } = req.body as {
    profileIndex?: number
    topic?: string
    preferredGameType?: RendererType
    forceCustom?: boolean
  }

  const profile = digitalCloneProfiles[profileIndex ?? 0]
  if (!profile) {
    return res.status(400).json({ error: 'Invalid profile index' })
  }

  const input: GenerateGameInput = {
    profile,
    topic: topic || undefined,
    preferredGameType: preferredGameType || undefined,
    forceCustom: forceCustom || false,
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
