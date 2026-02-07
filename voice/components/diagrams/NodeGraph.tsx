import { useState } from 'react'
import { THEME, SVG_WIDTH, SVG_HEIGHT, ArrowDefs, midpoint } from './shared'
import type { NodeGraphConfig } from '../../lib/pipeline/types'

export default function NodeGraph({ rounds }: { rounds: NodeGraphConfig[] }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, boolean> | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const round = rounds[roundIndex]
  const challengeNodes = round.nodes.filter(n => n.challenge)
  const allFilled = challengeNodes.every(n => answers[n.id] !== undefined && answers[n.id] !== '')

  // Build a lookup map for nodes by id
  const nodeMap: Record<string, (typeof round.nodes)[number]> = {}
  for (const node of round.nodes) {
    nodeMap[node.id] = node
  }

  function getNodeClass(node: (typeof round.nodes)[number]): string {
    if (!node.challenge) return 'node-default'
    if (!results) return 'node-challenge'
    return results[node.id] ? 'node-correct' : 'node-incorrect'
  }

  function getDisplayValue(node: (typeof round.nodes)[number]): string {
    if (!node.challenge) return node.value || node.correctValue
    if (results) return answers[node.id] || '?'
    if (answers[node.id] !== undefined && answers[node.id] !== '') return answers[node.id]
    return '?'
  }

  function handleSetAnswer() {
    if (!selectedNode || !inputValue.trim()) return
    setAnswers(prev => ({ ...prev, [selectedNode]: inputValue.trim() }))
    setInputValue('')
    setSelectedNode(null)
  }

  function handleNodeClick(nodeId: string) {
    const node = nodeMap[nodeId]
    if (!node || !node.challenge || results) return
    setSelectedNode(nodeId)
    setInputValue(answers[nodeId] || '')
  }

  async function handleCheck() {
    const newResults: Record<string, boolean> = {}
    let correct = 0
    for (const node of challengeNodes) {
      const userVal = (answers[node.id] || '').trim().toLowerCase()
      const correctVal = node.correctValue.trim().toLowerCase()
      const isCorrect = userVal === correctVal
      newResults[node.id] = isCorrect
      if (isCorrect) correct++
    }
    setResults(newResults)
    setScore(prev => prev + correct)
    setSelectedNode(null)

    // Fetch LLM feedback
    setFeedbackLoading(true)
    try {
      const details = challengeNodes
        .map(n => `${n.label}: user="${answers[n.id] || ''}", correct="${n.correctValue}", ${newResults[n.id] ? 'correct' : 'wrong'}`)
        .join('; ')

      const res = await fetch('/api/game-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'node-graph-eval',
          game: 'Node Graph',
          topic: round.title,
          score: correct,
          totalRounds: challengeNodes.length,
          details,
        }),
      })
      const data = await res.json()
      setFeedback(data.insight || data.feedback || null)
    } catch {
      setFeedback(null)
    }
    setFeedbackLoading(false)
  }

  function nextRound() {
    if (roundIndex < rounds.length - 1) {
      setRoundIndex(prev => prev + 1)
      setAnswers({})
      setResults(null)
      setSelectedNode(null)
      setInputValue('')
      setFeedback(null)
    }
  }

  function reset() {
    setRoundIndex(0)
    setAnswers({})
    setResults(null)
    setSelectedNode(null)
    setInputValue('')
    setScore(0)
    setFeedback(null)
  }

  return (
    <div className="game-container">
      <h2 className="game-title">{round.title}</h2>
      <p className="game-subtitle">{round.instruction}</p>
      <div className="round-indicator">
        Round <span>{roundIndex + 1}</span> of {rounds.length}
      </div>

      <div className="game-stats">
        <div className="stat">
          <div className="stat-value">{score}</div>
          <div className="stat-label">Score</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {Object.keys(answers).filter(k => answers[k] !== '').length}/{challengeNodes.length}
          </div>
          <div className="stat-label">Filled</div>
        </div>
      </div>

      {/* SVG Diagram */}
      <svg
        className="diagram-svg"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      >
        <ArrowDefs />

        {/* Edges */}
        {round.edges.map((edge, i) => {
          const fromNode = nodeMap[edge.from]
          const toNode = nodeMap[edge.to]
          if (!fromNode || !toNode) return null

          const mid = midpoint(fromNode.x, fromNode.y, toNode.x, toNode.y)

          return (
            <g key={`edge-${i}`}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                className="edge-line"
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={mid.x}
                  y={mid.y}
                  className="edge-label"
                  dy="-6"
                >
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {round.nodes.map(node => {
          const cls = getNodeClass(node)
          const displayValue = getDisplayValue(node)
          const isSelected = selectedNode === node.id

          return (
            <g
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              style={{ cursor: node.challenge && !results ? 'pointer' : 'default' }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={35}
                className={cls}
                stroke={isSelected ? THEME.accent : undefined}
                strokeWidth={isSelected ? 3 : undefined}
              />
              <text
                x={node.x}
                y={node.y - 5}
                textAnchor="middle"
                fill={THEME.text}
                fontSize="13"
                fontWeight="600"
              >
                {node.label}
              </text>
              <text
                x={node.x}
                y={node.y + 14}
                textAnchor="middle"
                fill={
                  results
                    ? results[node.id] === true
                      ? THEME.correct
                      : results[node.id] === false
                        ? THEME.incorrect
                        : THEME.textMuted
                    : THEME.textMuted
                }
                fontSize="12"
              >
                {displayValue}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Input area for challenge nodes */}
      {selectedNode && !results && (
        <div className="diagram-input-area">
          <label style={{ color: THEME.textMuted, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            {nodeMap[selectedNode]?.label}:
          </label>
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSetAnswer()}
            placeholder="Enter value..."
            autoFocus
          />
          <button onClick={handleSetAnswer}>Set</button>
        </div>
      )}

      {/* Feedback panel */}
      {(feedbackLoading || feedback) && (
        <div className="diagram-feedback info">
          <strong style={{ color: THEME.accent }}>Feedback</strong>
          <br />
          {feedbackLoading ? 'Analyzing your answers...' : feedback}
        </div>
      )}

      {/* Actions */}
      <div className="game-actions">
        {!results && allFilled && (
          <button className="btn-primary" onClick={handleCheck}>Check</button>
        )}
        {results && roundIndex < rounds.length - 1 && (
          <button className="btn-primary" onClick={nextRound}>Next Round</button>
        )}
        {results && roundIndex === rounds.length - 1 && (
          <button className="btn-primary" onClick={reset}>Play Again</button>
        )}
        <button className="btn-secondary" onClick={reset}>Reset</button>
      </div>
    </div>
  )
}
