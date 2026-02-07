import { useState, useCallback } from 'react'
import { THEME, SVG_WIDTH, SVG_HEIGHT } from './shared'
import type { TimelineConfig } from '../../lib/pipeline/types'

// Small SVG dimensions for the timeline axis
const TIMELINE_SVG_WIDTH = SVG_WIDTH
const TIMELINE_SVG_HEIGHT = 60
const TIMELINE_X_START = 60
const TIMELINE_X_END = TIMELINE_SVG_WIDTH - 60

interface Props {
  rounds: TimelineConfig[]
}

export default function Timeline({ rounds }: Props) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [slotAssignments, setSlotAssignments] = useState<(string | null)[]>(() =>
    initSlots(rounds[0])
  )
  const [dragItem, setDragItem] = useState<string | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<(boolean | null)[]>([])
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const round = rounds[roundIndex]
  const slotCount = round.correctOrder.length
  const revealedSet = new Set(round.revealedPositions ?? [])

  // Determine which event IDs are currently placed in slots
  const placedIds = new Set(slotAssignments.filter((id): id is string => id !== null))

  // Events available to drag (not yet placed, or placed as hint — hints stay in slot, not in pool)
  const poolEvents = round.events.filter(
    (ev) => !placedIds.has(ev.id)
  )

  // ── Drag handlers ──

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
      e.dataTransfer.setData('text/plain', eventId)
      e.dataTransfer.effectAllowed = 'move'
      setDragItem(eventId)
    },
    []
  )

  const handleDragEnd = useCallback(() => {
    setDragItem(null)
    setDragOverSlot(null)
  }, [])

  const handleSlotDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, slotIndex: number) => {
      // Don't allow drops on revealed hint slots
      if (revealedSet.has(slotIndex)) return
      e.preventDefault()
      setDragOverSlot(slotIndex)
    },
    [revealedSet]
  )

  const handleSlotDragLeave = useCallback(() => {
    setDragOverSlot(null)
  }, [])

  const handleSlotDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, slotIndex: number) => {
      e.preventDefault()
      if (revealedSet.has(slotIndex)) return
      const eventId = e.dataTransfer.getData('text/plain')
      if (!eventId) return

      setSlotAssignments((prev) => {
        const next = [...prev]
        // If dropping an event already in another slot, clear that slot first
        const existingIndex = next.indexOf(eventId)
        if (existingIndex !== -1 && !revealedSet.has(existingIndex)) {
          next[existingIndex] = null
        }
        // If slot already has an event, return it to pool
        // (just clear it — the pool rebuilds from what's not assigned)
        next[slotIndex] = eventId
        return next
      })

      setDragItem(null)
      setDragOverSlot(null)
    },
    [revealedSet]
  )

  const handleSlotClick = useCallback(
    (slotIndex: number) => {
      if (revealed) return
      if (revealedSet.has(slotIndex)) return
      if (slotAssignments[slotIndex] === null) return

      // Remove card from slot (return to pool)
      setSlotAssignments((prev) => {
        const next = [...prev]
        next[slotIndex] = null
        return next
      })
    },
    [revealed, revealedSet, slotAssignments]
  )

  // ── Check logic ──

  const allNonRevealedFilled = slotAssignments.every(
    (id, i) => revealedSet.has(i) || id !== null
  )

  function checkAnswers() {
    const newResults: (boolean | null)[] = slotAssignments.map((id, i) => {
      if (revealedSet.has(i)) return null // hint — don't score
      return id === round.correctOrder[i]
    })
    setResults(newResults)
    setRevealed(true)

    const correctCount = newResults.filter((r) => r === true).length
    const scorableCount = newResults.filter((r) => r !== null).length
    setScore(correctCount)

    // Request LLM feedback
    fetchFeedback(correctCount, scorableCount, newResults)
  }

  async function fetchFeedback(
    correctCount: number,
    scorableCount: number,
    resultArr: (boolean | null)[]
  ) {
    setFeedbackLoading(true)
    try {
      const details = slotAssignments
        .map((id, i) => {
          if (resultArr[i] === null) return `Slot ${i + 1}: hint (${id})`
          const ev = round.events.find((e) => e.id === id)
          const label = ev?.label ?? id
          return `Slot ${i + 1}: ${label} — ${resultArr[i] ? 'correct' : 'wrong'}`
        })
        .join('; ')

      const res = await fetch('/api/game-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'timeline-eval',
          game: 'Timeline',
          topic: round.title,
          score: correctCount,
          totalRounds: scorableCount,
          details,
        }),
      })

      const data = await res.json()
      setFeedback(data.insight ?? data.feedback ?? null)
    } catch {
      setFeedback(null)
    }
    setFeedbackLoading(false)
  }

  // ── Navigation ──

  function nextRound() {
    if (roundIndex < rounds.length - 1) {
      const nextIdx = roundIndex + 1
      setRoundIndex(nextIdx)
      setSlotAssignments(initSlots(rounds[nextIdx]))
      setRevealed(false)
      setResults([])
      setScore(0)
      setFeedback(null)
      setFeedbackLoading(false)
      setDragItem(null)
      setDragOverSlot(null)
    }
  }

  function reset() {
    setRoundIndex(0)
    setSlotAssignments(initSlots(rounds[0]))
    setRevealed(false)
    setResults([])
    setScore(0)
    setFeedback(null)
    setFeedbackLoading(false)
    setDragItem(null)
    setDragOverSlot(null)
  }

  // ── SVG dot positions ──

  const dotPositions = Array.from({ length: slotCount }, (_, i) => {
    const spacing = (TIMELINE_X_END - TIMELINE_X_START) / Math.max(slotCount - 1, 1)
    return TIMELINE_X_START + i * spacing
  })

  // ── Helpers ──

  function getEventLabel(eventId: string): string {
    const ev = round.events.find((e) => e.id === eventId)
    return ev?.label ?? eventId
  }

  // ── Render ──

  return (
    <div className="game-container">
      <h2 className="game-title">Timeline</h2>
      <p className="game-subtitle">{round.instruction}</p>
      <div className="round-indicator">
        Round <span>{roundIndex + 1}</span> of {rounds.length}
      </div>

      <div className="game-stats">
        <div className="stat">
          <div className="stat-value">{revealed ? score : '-'}</div>
          <div className="stat-label">Score</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {slotAssignments.filter((id, i) => !revealedSet.has(i) && id !== null).length}/
            {slotCount - revealedSet.size}
          </div>
          <div className="stat-label">Placed</div>
        </div>
      </div>

      {/* ── Card Pool ── */}
      <div className="timeline-card-pool">
        {poolEvents.map((ev) => (
          <div
            key={ev.id}
            className={`timeline-card${dragItem === ev.id ? ' dragging' : ''}`}
            draggable={!revealed}
            onDragStart={(e) => handleDragStart(e, ev.id)}
            onDragEnd={handleDragEnd}
          >
            {ev.label}
            {ev.date && <div className="timeline-card-date">{ev.date}</div>}
          </div>
        ))}
        {poolEvents.length === 0 && !revealed && (
          <span style={{ color: THEME.textMuted, fontSize: '0.8rem' }}>
            All events placed
          </span>
        )}
      </div>

      {/* ── Drop Slots ── */}
      <div className="timeline-slots">
        {Array.from({ length: slotCount }, (_, i) => {
          const isHint = revealedSet.has(i)
          const assignedId = slotAssignments[i]
          const isFilled = assignedId !== null
          const isOver = dragOverSlot === i && !isHint

          let slotClass = 'timeline-slot'
          if (isHint) slotClass += ' hint'
          else if (revealed && results[i] === true) slotClass += ' correct'
          else if (revealed && results[i] === false) slotClass += ' incorrect'
          else if (isFilled) slotClass += ' filled'
          if (isOver) slotClass += ' drag-over'
          if (revealed) slotClass += ' revealed'

          return (
            <div
              key={i}
              className={slotClass}
              onDragOver={(e) => handleSlotDragOver(e, i)}
              onDragLeave={handleSlotDragLeave}
              onDrop={(e) => handleSlotDrop(e, i)}
              onClick={() => handleSlotClick(i)}
              style={{ cursor: isFilled && !isHint && !revealed ? 'pointer' : 'default' }}
            >
              {isFilled ? (
                <span>{getEventLabel(assignedId)}</span>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── SVG Timeline Axis ── */}
      <svg
        className="diagram-svg"
        viewBox={`0 0 ${TIMELINE_SVG_WIDTH} ${TIMELINE_SVG_HEIGHT}`}
        style={{ height: '60px' }}
      >
        {/* Horizontal line */}
        <line
          x1={TIMELINE_X_START}
          y1={30}
          x2={TIMELINE_X_END}
          y2={30}
          stroke={THEME.textMuted}
          strokeWidth={2}
        />
        {/* Dots at each position */}
        {dotPositions.map((x, i) => {
          let dotColor: string = THEME.textMuted
          if (revealed) {
            if (results[i] === true) dotColor = THEME.correct
            else if (results[i] === false) dotColor = THEME.incorrect
            else if (results[i] === null) dotColor = THEME.accent // hint
          }
          return (
            <circle
              key={i}
              cx={x}
              cy={30}
              r={6}
              fill={dotColor}
              stroke={THEME.border}
              strokeWidth={1}
            />
          )
        })}
        {/* Position labels below dots */}
        {dotPositions.map((x, i) => (
          <text
            key={`label-${i}`}
            x={x}
            y={50}
            textAnchor="middle"
            fill={THEME.textMuted}
            fontSize={10}
          >
            {i + 1}
          </text>
        ))}
      </svg>

      {/* ── Feedback ── */}
      {revealed && (feedbackLoading || feedback) && (
        <div
          className="diagram-feedback info"
          style={{ marginTop: '1rem' }}
        >
          <strong style={{ color: THEME.accent }}>Feedback</strong>
          <br />
          {feedbackLoading ? 'Analyzing your timeline...' : feedback}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="game-actions">
        {!revealed && allNonRevealedFilled && (
          <button className="btn-primary" onClick={checkAnswers}>
            Check
          </button>
        )}
        {revealed && roundIndex < rounds.length - 1 && (
          <button className="btn-primary" onClick={nextRound}>
            Next Round
          </button>
        )}
        {revealed && roundIndex === rounds.length - 1 && (
          <button className="btn-primary" onClick={reset}>
            Play Again
          </button>
        )}
        <button className="btn-secondary" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  )
}

// ── Initialize slot assignments for a round ──
// Pre-fill revealed positions with the correct event IDs; others are null.
function initSlots(round: TimelineConfig): (string | null)[] {
  const slots: (string | null)[] = new Array(round.correctOrder.length).fill(null)
  if (round.revealedPositions) {
    for (const idx of round.revealedPositions) {
      if (idx >= 0 && idx < round.correctOrder.length) {
        slots[idx] = round.correctOrder[idx]
      }
    }
  }
  return slots
}
