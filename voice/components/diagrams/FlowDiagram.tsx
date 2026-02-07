import { useState, useCallback } from 'react'
import { THEME, SVG_WIDTH, SVG_HEIGHT, ArrowDefs, midpoint } from './shared'
import type { FlowDiagramConfig, FlowNode, FlowTraceStep } from '../../lib/pipeline/types'

// ═══════════════════════════════════════════
//   Node geometry constants
// ═══════════════════════════════════════════

const NODE_W = 120
const NODE_H = 50
const DIAMOND_R = 35 // half-diagonal for diamond shape

// ═══════════════════════════════════════════
//   Helpers
// ═══════════════════════════════════════════

function nodeClass(
  node: FlowNode,
  currentNodeId: string | null,
  visitedNodes: Set<string>,
  stepResults: (boolean | null)[],
  traceSteps: FlowTraceStep[],
): string {
  if (currentNodeId === node.id) return 'node-current'

  // Check if this node was visited and what result it got
  // Find the last trace step for this node that was answered
  for (let i = traceSteps.length - 1; i >= 0; i--) {
    if (traceSteps[i].nodeId === node.id && stepResults[i] !== null) {
      if (stepResults[i] === false) return 'node-incorrect'
      if (stepResults[i] === true && visitedNodes.has(node.id)) return 'node-visited'
    }
  }

  if (visitedNodes.has(node.id)) return 'node-visited'
  return 'node-default'
}

/** Compute the edge start point, offset for decision node labels */
function edgeEndpoints(
  fromNode: FlowNode,
  toNode: FlowNode,
  label?: string,
): { x1: number; y1: number; x2: number; y2: number } {
  let x1 = fromNode.x
  let y1 = fromNode.y
  let x2 = toNode.x
  let y2 = toNode.y

  if (fromNode.type === 'decision') {
    // Decision node: offset start based on label direction
    const lbl = (label || '').toLowerCase()
    if (lbl === 'yes' || lbl === '>' || lbl === '<' || lbl === '=') {
      // "Yes" / comparison labels: exit from bottom
      y1 = fromNode.y + DIAMOND_R
    } else if (lbl === 'no') {
      // "No": exit from right
      x1 = fromNode.x + DIAMOND_R
    } else if (toNode.y > fromNode.y + 30) {
      // Default: if target is below, exit bottom
      y1 = fromNode.y + DIAMOND_R
    } else if (toNode.x > fromNode.x + 30) {
      // If target is to the right, exit right
      x1 = fromNode.x + DIAMOND_R
    } else if (toNode.x < fromNode.x - 30) {
      // If target is to the left, exit left
      x1 = fromNode.x - DIAMOND_R
    } else {
      y1 = fromNode.y + DIAMOND_R
    }
  } else {
    // Rect/pill nodes: exit from the nearest edge
    if (Math.abs(toNode.y - fromNode.y) > Math.abs(toNode.x - fromNode.x)) {
      // Primarily vertical
      y1 = toNode.y > fromNode.y ? fromNode.y + NODE_H / 2 : fromNode.y - NODE_H / 2
    } else {
      // Primarily horizontal
      x1 = toNode.x > fromNode.x ? fromNode.x + NODE_W / 2 : fromNode.x - NODE_W / 2
    }
  }

  // Compute entry point on the target node
  if (toNode.type === 'decision') {
    const dx = x1 - toNode.x
    const dy = y1 - toNode.y
    if (Math.abs(dy) > Math.abs(dx)) {
      y2 = dy > 0 ? toNode.y + DIAMOND_R : toNode.y - DIAMOND_R
    } else {
      x2 = dx > 0 ? toNode.x + DIAMOND_R : toNode.x - DIAMOND_R
    }
  } else {
    if (Math.abs(y1 - toNode.y) > Math.abs(x1 - toNode.x)) {
      y2 = y1 > toNode.y ? toNode.y + NODE_H / 2 : toNode.y - NODE_H / 2
    } else {
      x2 = x1 > toNode.x ? toNode.x + NODE_W / 2 : toNode.x - NODE_W / 2
    }
  }

  return { x1, y1, x2, y2 }
}

/** Render multiline label: split on \n and render tspan elements */
function renderLabel(label: string, cx: number, cy: number) {
  const lines = label.split('\n')
  const lineHeight = 16
  const startY = cy - ((lines.length - 1) * lineHeight) / 2

  return (
    <text
      x={cx}
      y={startY}
      textAnchor="middle"
      dominantBaseline="central"
      fill={THEME.text}
      fontSize="12"
      pointerEvents="none"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={cx} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

// ═══════════════════════════════════════════
//   SVG Node renderers
// ═══════════════════════════════════════════

function StartEndNode({ node, cls }: { node: FlowNode; cls: string }) {
  return (
    <g>
      <rect
        className={cls}
        x={node.x - NODE_W / 2}
        y={node.y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={20}
      />
      {renderLabel(node.label, node.x, node.y)}
    </g>
  )
}

function ProcessNode({ node, cls }: { node: FlowNode; cls: string }) {
  return (
    <g>
      <rect
        className={cls}
        x={node.x - NODE_W / 2}
        y={node.y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={4}
      />
      {renderLabel(node.label, node.x, node.y)}
    </g>
  )
}

function DecisionNode({ node, cls }: { node: FlowNode; cls: string }) {
  // Diamond: 4 points forming a rotated square
  const r = DIAMOND_R
  const points = [
    `${node.x},${node.y - r}`,
    `${node.x + r},${node.y}`,
    `${node.x},${node.y + r}`,
    `${node.x - r},${node.y}`,
  ].join(' ')

  return (
    <g>
      <polygon className={cls} points={points} />
      {renderLabel(node.label, node.x, node.y)}
    </g>
  )
}

function FlowNodeShape({ node, cls }: { node: FlowNode; cls: string }) {
  switch (node.type) {
    case 'start':
    case 'end':
      return <StartEndNode node={node} cls={cls} />
    case 'process':
      return <ProcessNode node={node} cls={cls} />
    case 'decision':
      return <DecisionNode node={node} cls={cls} />
    default:
      return <ProcessNode node={node} cls={cls} />
  }
}

// ═══════════════════════════════════════════
//   Main component
// ═══════════════════════════════════════════

export default function FlowDiagram({ rounds }: { rounds: FlowDiagramConfig[] }) {
  // Round state
  const [roundIndex, setRoundIndex] = useState(0)

  // Step-through state
  const [stepIndex, setStepIndex] = useState(0)
  const [stepResults, setStepResults] = useState<(boolean | null)[]>([])
  const [visitedNodes, setVisitedNodes] = useState<Set<string>>(new Set())
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)

  // Scoring & feedback
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const round = rounds[roundIndex]
  const { nodes, edges, traceSteps } = round
  const isComplete = stepIndex >= traceSteps.length
  const currentStep = !isComplete ? traceSteps[stepIndex] : null
  const currentNodeId = currentStep ? currentStep.nodeId : null

  // Build a node map for quick lookup
  const nodeMap = new Map<string, FlowNode>()
  for (const n of nodes) nodeMap.set(n.id, n)

  // ─── Initialize step results when round changes ───
  const initStepResults = useCallback(
    (stepsLength: number) => Array<boolean | null>(stepsLength).fill(null),
    [],
  )

  // ─── Handlers ───

  function handleSubmitAnswer() {
    if (!currentStep || answered) return

    let correct = false

    if (currentStep.options && currentStep.correctOption !== undefined) {
      // Decision node — option check
      if (selectedOption === null) return
      correct = selectedOption === currentStep.correctOption
    } else {
      // Process node — text answer check
      if (!currentAnswer.trim()) return
      correct = currentAnswer
        .toLowerCase()
        .includes((currentStep.correctAnswer || '').toLowerCase())
    }

    // Record the result
    const newResults = [...stepResults]
    newResults[stepIndex] = correct
    setStepResults(newResults)

    // Mark node visited
    setVisitedNodes(prev => {
      const next = new Set(prev)
      next.add(currentStep.nodeId)
      return next
    })

    if (correct) setScore(prev => prev + 1)
    setAnswered(true)
  }

  function handleAdvance() {
    const nextStep = stepIndex + 1
    setAnswered(false)
    setCurrentAnswer('')
    setSelectedOption(null)

    if (nextStep >= traceSteps.length) {
      // All steps done
      setStepIndex(nextStep)
      fetchFeedback()
    } else {
      setStepIndex(nextStep)
    }
  }

  async function fetchFeedback() {
    setFeedbackLoading(true)
    try {
      const details = traceSteps
        .map((step, i) => {
          const result = stepResults[i]
          return `Step ${i + 1} (${step.nodeId}): ${
            result === true ? 'correct' : result === false ? 'wrong' : 'unanswered'
          }`
        })
        .join('; ')

      const res = await fetch('/api/game-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'debrief',
          game: 'Flow Diagram Trace',
          topic: round.title,
          score,
          totalRounds: traceSteps.length,
          details,
        }),
      })
      const { insight } = await res.json()
      setFeedback(insight)
    } catch {
      setFeedback(null)
    }
    setFeedbackLoading(false)
  }

  function nextRound() {
    if (roundIndex < rounds.length - 1) {
      setRoundIndex(prev => prev + 1)
      resetStepState(rounds[roundIndex + 1].traceSteps.length)
    }
  }

  function resetGame() {
    setRoundIndex(0)
    resetStepState(rounds[0].traceSteps.length)
  }

  function resetStepState(stepsCount: number) {
    setStepIndex(0)
    setStepResults(initStepResults(stepsCount))
    setVisitedNodes(new Set())
    setCurrentAnswer('')
    setSelectedOption(null)
    setAnswered(false)
    setScore(0)
    setFeedback(null)
    setFeedbackLoading(false)
  }

  // Initialize results array on first render and when round changes
  if (stepResults.length !== traceSteps.length) {
    setStepResults(initStepResults(traceSteps.length))
  }

  // ─── Render ───

  return (
    <div className="game-container">
      <h2 className="game-title">{round.title}</h2>
      <p className="game-subtitle">{round.instruction}</p>
      <div className="round-indicator">
        Round <span>{roundIndex + 1}</span> of {rounds.length}
      </div>

      {/* Stats */}
      <div className="game-stats">
        <div className="stat">
          <div className="stat-value">{score}</div>
          <div className="stat-label">Score</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {Math.min(stepIndex + 1, traceSteps.length)}/{traceSteps.length}
          </div>
          <div className="stat-label">Step</div>
        </div>
      </div>

      {/* SVG Flowchart */}
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="diagram-svg"
      >
        <ArrowDefs />

        {/* Edges */}
        {edges.map((edge, i) => {
          const fromNode = nodeMap.get(edge.from)
          const toNode = nodeMap.get(edge.to)
          if (!fromNode || !toNode) return null

          const { x1, y1, x2, y2 } = edgeEndpoints(fromNode, toNode, edge.label)
          const mid = midpoint(x1, y1, x2, y2)

          return (
            <g key={`edge-${i}`}>
              <line
                className="edge-line"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text className="edge-label" x={mid.x} y={mid.y - 6}>
                  {edge.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const cls = nodeClass(node, currentNodeId, visitedNodes, stepResults, traceSteps)
          return <FlowNodeShape key={node.id} node={node} cls={cls} />
        })}
      </svg>

      {/* Step-through panel */}
      {currentStep && !isComplete && (
        <div className="flow-step-panel">
          <div className="flow-step-prompt">{currentStep.prompt}</div>

          {/* Decision node: show option buttons */}
          {currentStep.options && currentStep.options.length > 0 ? (
            <div className="flow-step-options">
              {currentStep.options.map((opt, i) => {
                let cls = 'flow-step-option'
                if (!answered && selectedOption === i) cls += ' selected'
                if (answered && i === currentStep.correctOption) cls += ' correct'
                if (answered && selectedOption === i && i !== currentStep.correctOption) {
                  cls += ' incorrect'
                }
                return (
                  <div
                    key={i}
                    className={cls}
                    onClick={() => {
                      if (!answered) setSelectedOption(i)
                    }}
                  >
                    {opt}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Process node: text input + submit */
            <div className="flow-step-input">
              <input
                type="text"
                value={currentAnswer}
                onChange={e => setCurrentAnswer(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !answered) handleSubmitAnswer()
                }}
                placeholder="Type your answer..."
                disabled={answered}
              />
              {!answered && (
                <button onClick={handleSubmitAnswer}>Submit</button>
              )}
            </div>
          )}

          {/* Submit button for option selection */}
          {currentStep.options && !answered && selectedOption !== null && (
            <div style={{ marginTop: '0.75rem' }}>
              <button className="btn-primary" onClick={handleSubmitAnswer}>
                Confirm
              </button>
            </div>
          )}

          {/* Explanation after answering */}
          {answered && (
            <>
              <div className="flow-step-explanation">
                <strong>
                  {stepResults[stepIndex] ? 'Correct!' : 'Not quite.'}
                </strong>{' '}
                {currentStep.explanation}
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <button className="btn-primary" onClick={handleAdvance}>
                  {stepIndex < traceSteps.length - 1 ? 'Next Step' : 'Finish'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Completion summary */}
      {isComplete && (
        <div className="flow-step-panel">
          <div className="flow-step-prompt" style={{ textAlign: 'center', fontSize: '1.1rem' }}>
            Trace complete! You scored{' '}
            <strong style={{ color: THEME.accent }}>
              {score}/{traceSteps.length}
            </strong>
          </div>

          {/* LLM feedback */}
          {(feedbackLoading || feedback) && (
            <div
              className="diagram-feedback info"
              style={{ marginTop: '1rem' }}
            >
              <strong style={{ color: THEME.accent }}>Coach&apos;s Take</strong>
              <br />
              {feedbackLoading ? 'Analyzing your performance...' : feedback}
            </div>
          )}
        </div>
      )}

      {/* Navigation actions */}
      <div className="game-actions">
        {isComplete && roundIndex < rounds.length - 1 && (
          <button className="btn-primary" onClick={nextRound}>
            Next Round
          </button>
        )}
        {isComplete && roundIndex === rounds.length - 1 && (
          <button className="btn-primary" onClick={resetGame}>
            Play Again
          </button>
        )}
        <button
          className="btn-secondary"
          onClick={() => resetStepState(traceSteps.length)}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
