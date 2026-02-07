import { useState } from 'react'
import type { ErrorDetectiveConfig } from '../../lib/pipeline/types'

export default function ErrorDetective({ rounds }: { rounds: ErrorDetectiveConfig[] }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)

  const round = rounds[roundIndex]
  const errorCount = round.segments.filter(s => s.isError).length

  function toggleSegment(index: number) {
    if (revealed) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function checkAnswers() {
    setRevealed(true)
    let correct = 0
    round.segments.forEach((seg, i) => {
      if (seg.isError && selected.has(i)) correct++
      if (!seg.isError && !selected.has(i)) correct++
    })
    setScore(prev => prev + correct)
  }

  function nextRound() {
    if (roundIndex < rounds.length - 1) {
      setRoundIndex(prev => prev + 1)
      setSelected(new Set())
      setRevealed(false)
    }
  }

  function reset() {
    setRoundIndex(0)
    setScore(0)
    setSelected(new Set())
    setRevealed(false)
  }

  return (
    <div className="game-container">
      <h2 className="game-title">Error Detective</h2>
      <p className="game-subtitle">{round.description} ({errorCount} error{errorCount > 1 ? 's' : ''} to find)</p>
      <div className="round-indicator">Round <span>{roundIndex + 1}</span> of {rounds.length}</div>

      <div className="game-stats">
        <div className="stat">
          <div className="stat-value">{score}</div>
          <div className="stat-label">Score</div>
        </div>
        <div className="stat">
          <div className="stat-value">{selected.size}/{errorCount}</div>
          <div className="stat-label">Flagged</div>
        </div>
      </div>

      <div className="error-segments">
        {round.segments.map((seg, i) => {
          let cls = 'error-segment'
          if (!revealed && selected.has(i)) cls += ' selected-error'
          if (revealed) {
            if (seg.isError && selected.has(i)) cls += ' revealed-correct'
            else if (seg.isError && !selected.has(i)) cls += ' revealed-missed'
            else if (!seg.isError && selected.has(i)) cls += ' selected-error'
            else cls += ' revealed-correct'
          }
          return (
            <div key={i} className={cls} onClick={() => toggleSegment(i)}>
              {seg.text}
              {revealed && seg.isError && seg.explanation && (
                <div className="error-explanation">{seg.explanation}</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="game-actions">
        {!revealed && (
          <button className="btn-primary" onClick={checkAnswers}>Submit</button>
        )}
        {revealed && roundIndex < rounds.length - 1 && (
          <button className="btn-primary" onClick={nextRound}>Next Round</button>
        )}
        {revealed && roundIndex === rounds.length - 1 && (
          <button className="btn-primary" onClick={reset}>Play Again</button>
        )}
        <button className="btn-secondary" onClick={reset}>Reset</button>
      </div>
    </div>
  )
}
