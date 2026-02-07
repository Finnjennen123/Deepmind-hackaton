import { useState } from 'react'
import type { PredictionBetConfig } from '../../lib/pipeline/types'

export default function PredictionBet({ rounds }: { rounds: PredictionBetConfig[] }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [calibrationHistory, setCalibrationHistory] = useState<{ confidence: number; correct: boolean }[]>([])
  const [debrief, setDebrief] = useState<string | null>(null)
  const [debriefLoading, setDebriefLoading] = useState(false)

  const round = rounds[roundIndex]

  function submit() {
    if (confidence === null || selectedOption === null) return
    const correct = selectedOption === round.correctIndex
    setRevealed(true)
    const points = correct ? confidence : -confidence
    setTotalScore(prev => prev + points)
    const newHistory = [...calibrationHistory, { confidence, correct }]
    setCalibrationHistory(newHistory)

    // Fetch debrief after the final round
    if (roundIndex === rounds.length - 1) {
      fetchDebrief(newHistory, totalScore + points)
    }
  }

  async function fetchDebrief(history: { confidence: number; correct: boolean }[], finalScore: number) {
    setDebriefLoading(true)
    try {
      const details = history
        .map((h, i) => `Round ${i + 1}: ${h.correct ? 'correct' : 'wrong'}, confidence ${h.confidence}`)
        .join('; ')

      const res = await fetch('/api/game-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'debrief',
          game: 'Prediction Bet',
          topic: rounds[0].scenario.split('\n')[0].slice(0, 60),
          score: finalScore,
          totalRounds: rounds.length,
          details,
        }),
      })
      const { insight } = await res.json()
      setDebrief(insight)
    } catch {
      setDebrief(null)
    }
    setDebriefLoading(false)
  }

  function nextRound() {
    if (roundIndex < rounds.length - 1) {
      setRoundIndex(prev => prev + 1)
      setConfidence(null)
      setSelectedOption(null)
      setRevealed(false)
    }
  }

  function reset() {
    setRoundIndex(0)
    setTotalScore(0)
    setConfidence(null)
    setSelectedOption(null)
    setRevealed(false)
    setCalibrationHistory([])
    setDebrief(null)
  }

  const avgCalibration = calibrationHistory.length > 0
    ? Math.round(calibrationHistory.filter(h => h.correct).length / calibrationHistory.length * 100)
    : null

  return (
    <div className="game-container">
      <h2 className="game-title">Prediction Bet</h2>
      <p className="game-subtitle">Predict the outcome and bet your confidence</p>
      <div className="round-indicator">Round <span>{roundIndex + 1}</span> of {rounds.length}</div>

      <div className="game-stats">
        <div className="stat">
          <div className="stat-value">{totalScore}</div>
          <div className="stat-label">Points</div>
        </div>
        {avgCalibration !== null && (
          <div className="stat">
            <div className="stat-value">{avgCalibration}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
        )}
      </div>

      <div className="prediction-scenario">{round.scenario}</div>

      {/* Options */}
      <div className="prediction-options">
        {round.options.map((opt, i) => {
          let cls = 'prediction-option'
          if (!revealed && selectedOption === i) cls += ' selected'
          if (revealed && i === round.correctIndex) cls += ' correct'
          if (revealed && selectedOption === i && i !== round.correctIndex) cls += ' incorrect'
          return (
            <div key={i} className={cls} onClick={() => !revealed && setSelectedOption(i)}>
              {opt}
            </div>
          )
        })}
      </div>

      {/* Confidence */}
      {!revealed && (
        <>
          <p style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            How confident are you? (Higher bet = more points if right, more lost if wrong)
          </p>
          <div className="confidence-bar">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                className={`confidence-btn ${confidence === n ? 'selected' : ''}`}
                onClick={() => setConfidence(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Result */}
      {revealed && (
        <div className={`prediction-result ${selectedOption === round.correctIndex ? 'correct' : 'incorrect'}`}>
          {selectedOption === round.correctIndex
            ? `Correct! +${confidence} points.`
            : `Wrong. -${confidence} points.`
          }
          <br /><br />
          {round.explanation}
        </div>
      )}

      {/* Debrief after final round */}
      {revealed && roundIndex === rounds.length - 1 && (debriefLoading || debrief) && (
        <div className="prediction-result correct" style={{ marginTop: '1rem', borderColor: '#ff6b00' }}>
          <strong style={{ color: '#ff6b00' }}>Coach&apos;s Take</strong>
          <br />
          {debriefLoading ? 'Analyzing your performance...' : debrief}
        </div>
      )}

      <div className="game-actions">
        {!revealed && confidence !== null && selectedOption !== null && (
          <button className="btn-primary" onClick={submit}>Lock In</button>
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
