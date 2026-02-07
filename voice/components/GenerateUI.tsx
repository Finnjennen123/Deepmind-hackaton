// Generation trigger UI: profile picker, topic input, progress stream, loading states

import { useState, useCallback, useRef } from 'react'
import { digitalCloneProfiles } from '../lib/pipeline/mock-profiles'
import type { PipelineEvent, RendererConfig, GameSpec } from '../lib/pipeline/types'

interface GenerateResult {
  spec: GameSpec
  config: RendererConfig
  customCode?: string
}

interface GenerateUIProps {
  onGameReady: (result: GenerateResult) => void
}

interface ProgressStep {
  message: string
  status: 'active' | 'done' | 'error'
  timestamp: number
}

const RENDERER_LABELS: Record<string, string> = {
  sortBattle: 'Sort Battle',
  errorDetective: 'Error Detective',
  claimEvidence: 'Claim-Evidence Match',
  predictionBet: 'Prediction Bet',
  teachBot: 'Teach the Bot',
  nodeGraph: 'Node Graph',
  spatialMap: 'Spatial Map',
  timeline: 'Timeline',
  flowDiagram: 'Flow Diagram',
}

type GameMode = 'template' | 'custom'

export default function GenerateUI({ onGameReady }: GenerateUIProps) {
  const [profileIndex, setProfileIndex] = useState(0)
  const [topic, setTopic] = useState('')
  const [gameMode, setGameMode] = useState<GameMode>('template')
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<ProgressStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const profile = digitalCloneProfiles[profileIndex]

  const addProgress = useCallback((message: string, status: 'active' | 'done' | 'error' = 'active') => {
    setProgress(prev => {
      // Mark previous active step as done
      const updated = prev.map(s => s.status === 'active' ? { ...s, status: 'done' as const } : s)
      return [...updated, { message, status, timestamp: Date.now() }]
    })
  }, [])

  const generate = useCallback(async () => {
    setGenerating(true)
    setProgress([])
    setError(null)

    addProgress('Designing your game...')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileIndex,
          topic: topic.trim() || undefined,
          forceCustom: gameMode === 'custom',
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6)

          try {
            const event = JSON.parse(jsonStr) as PipelineEvent

            switch (event.event) {
              case 'spec_ready':
                addProgress(
                  `Building "${event.data.title}" — a ${RENDERER_LABELS[event.data.gameType] || event.data.gameType} game...`
                )
                break

              case 'config_draft':
                addProgress(
                  event.data.iteration === 1
                    ? 'Creating game content...'
                    : `Revising content (attempt ${event.data.iteration})...`
                )
                break

              case 'validation_error':
                addProgress(`Fixing ${event.data.errors.length} validation issue(s)...`)
                break

              case 'critic_result':
                if (event.data.pass) {
                  addProgress(`Quality check passed (${event.data.score}/12)`)
                } else {
                  addProgress(`Quality check: ${event.data.score}/12 — improving...`)
                }
                break

              case 'revision':
                addProgress('Applying improvements...')
                break

              case 'complete':
                addProgress('Ready! Play now.', 'done')
                onGameReady({
                  spec: event.data.spec,
                  config: event.data.config,
                  customCode: event.data.customCode,
                })
                setGenerating(false)
                return

              case 'error':
                addProgress(event.data.message, 'error')
                setError(event.data.message)
                setGenerating(false)
                return
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }

      // Stream ended without complete/error event
      if (generating) {
        setError('Connection lost during generation')
        setGenerating(false)
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        addProgress('Cancelled', 'error')
      } else {
        const msg = err instanceof Error ? err.message : 'Generation failed'
        addProgress(msg, 'error')
        setError(msg)
      }
      setGenerating(false)
    }
  }, [profileIndex, topic, gameMode, addProgress, onGameReady, generating])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setGenerating(false)
  }, [])

  return (
    <div className="generate-ui">
      {/* Profile Picker */}
      <div className="generate-section">
        <h3 className="generate-section-title">Learner Profile</h3>
        <div className="profile-picker">
          {digitalCloneProfiles.map((p, i) => (
            <div
              key={i}
              className={`profile-card ${profileIndex === i ? 'selected' : ''}`}
              onClick={() => !generating && setProfileIndex(i)}
            >
              <div className="profile-name">{p.name}</div>
              <div className="profile-subject">{p.subject}</div>
              <div className="profile-level">{p.level}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Summary */}
      <div className="generate-section">
        <div className="profile-summary">
          <div className="profile-detail">
            <span className="detail-label">Gaps:</span>
            <span className="detail-value">{profile.knownGaps.slice(0, 3).join(', ')}</span>
          </div>
          <div className="profile-detail">
            <span className="detail-label">Misconceptions:</span>
            <span className="detail-value">{profile.misconceptions.slice(0, 2).join(', ') || 'None identified'}</span>
          </div>
          <div className="profile-detail">
            <span className="detail-label">Current module:</span>
            <span className="detail-value">{profile.currentModule}</span>
          </div>
        </div>
      </div>

      {/* Topic */}
      <div className="generate-section">
        <div className="input-group">
          <label>Topic (optional)</label>
          <input
            type="text"
            className="generate-input"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder={`e.g., "${profile.knownGaps[0]}"`}
            disabled={generating}
          />
        </div>
      </div>

      {/* Game Mode Toggle */}
      <div className="generate-section">
        <div className="mode-toggle">
          <button
            className={`mode-option ${gameMode === 'template' ? 'active' : ''}`}
            onClick={() => !generating && setGameMode('template')}
            disabled={generating}
          >
            <span className="mode-icon">&#9638;</span>
            <span className="mode-label">Use template</span>
            <span className="mode-desc">Pick from 9 proven game types</span>
          </button>
          <button
            className={`mode-option ${gameMode === 'custom' ? 'active' : ''}`}
            onClick={() => !generating && setGameMode('custom')}
            disabled={generating}
          >
            <span className="mode-icon">&#10024;</span>
            <span className="mode-label">Invent new game</span>
            <span className="mode-desc">AI writes a novel game from scratch</span>
          </button>
        </div>
      </div>

      {/* Generate Button */}
      <div className="generate-section" style={{ textAlign: 'center' }}>
        {!generating ? (
          <button className="btn-generate" onClick={generate}>
            Generate Game
          </button>
        ) : (
          <button className="btn-cancel" onClick={cancel}>
            Cancel
          </button>
        )}
      </div>

      {/* Progress */}
      {progress.length > 0 && (
        <div className="generate-progress">
          {progress.map((step, i) => (
            <div key={i} className={`progress-step ${step.status}`}>
              <span className="progress-dot" />
              <span className="progress-message">{step.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="generate-error">
          {error}
        </div>
      )}
    </div>
  )
}
