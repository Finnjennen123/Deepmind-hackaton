import { useState } from 'react'
import type { ClaimEvidenceConfig } from '../../lib/pipeline/types'

export default function ClaimEvidenceMatch({ rounds }: { rounds: ClaimEvidenceConfig[] }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null)
  const [matches, setMatches] = useState<Record<string, string>>({}) // evidenceId -> claimId
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)

  const round = rounds[roundIndex]

  function handleEvidenceClick(evidenceId: string) {
    if (revealed) return
    if (matches[evidenceId]) return // already matched
    if (!selectedClaim) return

    setMatches(prev => ({ ...prev, [evidenceId]: selectedClaim }))
    setSelectedClaim(null)
  }

  function checkAnswers() {
    setRevealed(true)
    let correct = 0
    round.evidence.forEach(ev => {
      if (!ev.isDistractor && matches[ev.id] === ev.matchesClaimId) correct++
    })
    setScore(prev => prev + correct)
  }

  function nextRound() {
    if (roundIndex < rounds.length - 1) {
      setRoundIndex(prev => prev + 1)
      setSelectedClaim(null)
      setMatches({})
      setRevealed(false)
    }
  }

  function reset() {
    setRoundIndex(0)
    setScore(0)
    setSelectedClaim(null)
    setMatches({})
    setRevealed(false)
  }

  const matchedClaims = new Set(Object.values(matches))

  return (
    <div className="game-container">
      <h2 className="game-title">Claim-Evidence Match</h2>
      <p className="game-subtitle">Select a claim, then click the best supporting evidence</p>
      <div className="round-indicator">Round <span>{roundIndex + 1}</span> of {rounds.length}</div>

      <div className="game-stats">
        <div className="stat">
          <div className="stat-value">{score}</div>
          <div className="stat-label">Score</div>
        </div>
        <div className="stat">
          <div className="stat-value">{Object.keys(matches).length}/{round.claims.length}</div>
          <div className="stat-label">Matched</div>
        </div>
      </div>

      <div className="claim-evidence-layout">
        <div className="claims-column">
          <h4>Claims</h4>
          {round.claims.map(claim => (
            <div
              key={claim.id}
              className={`claim-card ${selectedClaim === claim.id ? 'selected' : ''} ${matchedClaims.has(claim.id) ? 'matched' : ''}`}
              onClick={() => !revealed && !matchedClaims.has(claim.id) && setSelectedClaim(claim.id)}
            >
              {claim.text}
              {revealed && matchedClaims.has(claim.id) && (
                <div className="match-indicator">Matched</div>
              )}
            </div>
          ))}
        </div>
        <div className="evidence-column">
          <h4>Evidence</h4>
          {round.evidence.map(ev => {
            let cls = 'evidence-card'
            if (matches[ev.id]) cls += ' matched'
            if (revealed && ev.isDistractor && matches[ev.id]) cls += ' distractor-revealed'
            return (
              <div
                key={ev.id}
                className={cls}
                onClick={() => handleEvidenceClick(ev.id)}
              >
                {ev.text}
                {revealed && ev.isDistractor && matches[ev.id] && (
                  <div className="match-indicator" style={{ color: '#ff9800' }}>Near-miss distractor</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="game-actions">
        {!revealed && Object.keys(matches).length >= round.claims.length && (
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
