import { useState } from 'react'
import type { SortBattleConfig } from '../../lib/pipeline/types'

export default function SortBattle({ rounds }: { rounds: SortBattleConfig[] }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [placements, setPlacements] = useState<Record<string, number>>({})
  const [revealed, setRevealed] = useState(false)
  const [dragItem, setDragItem] = useState<string | null>(null)
  const [dragOverBucket, setDragOverBucket] = useState<number | null>(null)

  const round = rounds[roundIndex]
  const unplaced = round.items.filter(item => !(item.text in placements))

  function handleDrop(bucketIndex: number) {
    if (!dragItem) return
    setPlacements(prev => ({ ...prev, [dragItem]: bucketIndex }))
    setDragItem(null)
    setDragOverBucket(null)
  }

  function checkAnswers() {
    setRevealed(true)
    let correct = 0
    round.items.forEach(item => {
      if (placements[item.text] === item.correctBucket) correct++
    })
    const roundScore = correct
    setScore(prev => prev + roundScore)
    if (correct === round.items.length) {
      setStreak(prev => prev + 1)
    } else {
      setStreak(0)
    }
  }

  function nextRound() {
    if (roundIndex < rounds.length - 1) {
      setRoundIndex(prev => prev + 1)
      setPlacements({})
      setRevealed(false)
    }
  }

  function reset() {
    setRoundIndex(0)
    setScore(0)
    setStreak(0)
    setPlacements({})
    setRevealed(false)
  }

  return (
    <div className="game-container">
      <h2 className="game-title">Sort Battle</h2>
      <p className="game-subtitle">{round.instruction}</p>
      <div className="round-indicator">Round <span>{roundIndex + 1}</span> of {rounds.length}</div>

      <div className="game-stats">
        <div className="stat">
          <div className="stat-value">{score}</div>
          <div className="stat-label">Score</div>
        </div>
        <div className="stat">
          <div className="stat-value streak-indicator">{streak > 0 ? `${streak}x` : '-'}</div>
          <div className="stat-label">Streak</div>
        </div>
      </div>

      {/* Unplaced items */}
      <div className="sort-items" style={{ marginBottom: '1rem', minHeight: '50px' }}>
        {unplaced.map(item => (
          <div
            key={item.text}
            className={`sort-item ${dragItem === item.text ? 'dragging' : ''}`}
            draggable
            onDragStart={() => setDragItem(item.text)}
            onDragEnd={() => { setDragItem(null); setDragOverBucket(null) }}
          >
            {item.text}
          </div>
        ))}
      </div>

      {/* Buckets */}
      <div className="sort-battle-buckets">
        {round.buckets.map((bucket, bi) => (
          <div
            key={bucket}
            className={`sort-bucket ${dragOverBucket === bi ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverBucket(bi) }}
            onDragLeave={() => setDragOverBucket(null)}
            onDrop={(e) => { e.preventDefault(); handleDrop(bi) }}
          >
            <h4>{bucket}</h4>
            <div className="sort-items">
              {round.items
                .filter(item => placements[item.text] === bi)
                .map(item => {
                  let cls = 'sort-item in-bucket'
                  if (revealed) {
                    cls += item.correctBucket === bi ? ' correct' : ' incorrect'
                  }
                  return (
                    <div key={item.text} className={cls}>
                      {item.text}
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="game-actions">
        {!revealed && Object.keys(placements).length === round.items.length && (
          <button className="btn-primary" onClick={checkAnswers}>Check</button>
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
