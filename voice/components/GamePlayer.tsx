// Dispatch component: takes (rendererType, config) → renders correct renderer
// Handles both config-based renderers and dynamically generated custom code

import React, { Component } from 'react'
import type { RendererConfig } from '../lib/pipeline/types'
import { SortBattle, ErrorDetective, ClaimEvidenceMatch, PredictionBet, TeachTheBot } from './games'
import NodeGraph from './diagrams/NodeGraph'
import SpatialMap from './diagrams/SpatialMap'
import Timeline from './diagrams/Timeline'
import FlowDiagram from './diagrams/FlowDiagram'
import { THEME } from './diagrams/shared'

// ═══════════════════════════════════════════
//   Error Boundary for custom games
// ═══════════════════════════════════════════

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class GameErrorBoundary extends Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="game-container" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 className="game-title" style={{ color: '#f44336' }}>Game Crashed</h2>
          <p style={{ color: '#888', marginBottom: '1rem' }}>
            The custom game encountered an error and could not render.
          </p>
          <pre style={{
            background: '#1a1a2e',
            padding: '1rem',
            borderRadius: '8px',
            color: '#f44336',
            fontSize: '0.8rem',
            textAlign: 'left',
            overflowX: 'auto',
          }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            className="btn-secondary"
            style={{ marginTop: '1rem' }}
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ═══════════════════════════════════════════
//   Custom Code Renderer
// ═══════════════════════════════════════════

function CustomGameRenderer({ code, rounds }: { code: string; rounds: unknown[] }) {
  const [CustomComponent, setCustomComponent] = React.useState<React.ComponentType<{ rounds: unknown[] }> | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    try {
      // Execute the wrapped code to get the component
      // eslint-disable-next-line no-new-func
      const factory = new Function('React', 'THEME', `
        const exports = {};
        ${code}
        return exports.default || null;
      `)
      const Comp = factory(React, THEME)
      if (typeof Comp === 'function') {
        setCustomComponent(() => Comp)
        setError(null)
      } else {
        setError('Generated code did not produce a valid React component')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load custom game')
    }
  }, [code])

  if (error) {
    return (
      <div className="game-container" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2 className="game-title" style={{ color: '#f44336' }}>Load Error</h2>
        <p style={{ color: '#888' }}>{error}</p>
      </div>
    )
  }

  if (!CustomComponent) {
    return (
      <div className="game-container" style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#888' }}>Loading custom game...</p>
      </div>
    )
  }

  return <CustomComponent rounds={rounds} />
}

// ═══════════════════════════════════════════
//   Main GamePlayer
// ═══════════════════════════════════════════

interface GamePlayerProps {
  config: RendererConfig
  customCode?: string
}

export default function GamePlayer({ config, customCode }: GamePlayerProps) {
  // Custom code path
  if (customCode) {
    return (
      <GameErrorBoundary>
        <CustomGameRenderer code={customCode} rounds={(config as any)?.rounds || []} />
      </GameErrorBoundary>
    )
  }

  // Config-based dispatch
  return (
    <GameErrorBoundary>
      <ConfigRenderer config={config} />
    </GameErrorBoundary>
  )
}

function ConfigRenderer({ config }: { config: RendererConfig }) {
  switch (config.type) {
    case 'sortBattle':
      return <SortBattle rounds={config.rounds} />
    case 'errorDetective':
      return <ErrorDetective rounds={config.rounds} />
    case 'claimEvidence':
      return <ClaimEvidenceMatch rounds={config.rounds} />
    case 'predictionBet':
      return <PredictionBet rounds={config.rounds} />
    case 'teachBot':
      return <TeachTheBot rounds={config.rounds} />
    case 'nodeGraph':
      return <NodeGraph rounds={config.rounds} />
    case 'spatialMap':
      return <SpatialMap rounds={config.rounds} />
    case 'timeline':
      return <Timeline rounds={config.rounds} />
    case 'flowDiagram':
      return <FlowDiagram rounds={config.rounds} />
    default:
      return (
        <div className="game-container" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 className="game-title">Unknown Game Type</h2>
          <p style={{ color: '#888' }}>Renderer not found for type: {(config as any).type}</p>
        </div>
      )
  }
}
