import { useState, useRef } from 'react'
import { THEME, SVG_WIDTH, SVG_HEIGHT, pointerToSVG } from './shared'
import type { SpatialMapConfig } from '../../lib/pipeline/types'

interface Placement {
  col: number
  row: number
}

export default function SpatialMap({ rounds }: { rounds: SpatialMapConfig[] }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [placements, setPlacements] = useState<Record<string, Placement>>({})
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)

  const round = rounds[roundIndex]
  const phase = round.phases[phaseIndex]
  const { gridCols, gridRows } = round

  const cellW = SVG_WIDTH / gridCols
  const cellH = SVG_HEIGHT / gridRows

  // Units that have not been placed on the grid
  const unplacedUnits = round.units.filter(u => !(u.id in placements))

  // Check whether all required units are placed
  const allPlaced = phase.correctPlacements.every(cp => cp.unitId in placements)

  // --- Interaction: select from pool, click grid to place ---

  function handlePoolUnitClick(unitId: string) {
    if (revealed) return
    setSelectedUnit(prev => (prev === unitId ? null : unitId))
  }

  function handleGridCellClick(col: number, row: number) {
    if (revealed) return

    // If clicking a cell that already has a placed unit, pick it back up
    const existingUnit = Object.entries(placements).find(
      ([, p]) => p.col === col && p.row === row
    )
    if (existingUnit) {
      const [unitId] = existingUnit
      setPlacements(prev => {
        const next = { ...prev }
        delete next[unitId]
        return next
      })
      setSelectedUnit(unitId)
      return
    }

    // If we have a selected unit, place it
    if (selectedUnit) {
      setPlacements(prev => ({ ...prev, [selectedUnit!]: { col, row } }))
      setSelectedUnit(null)
    }
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (revealed || !svgRef.current) return
    const pt = pointerToSVG(e as unknown as React.PointerEvent<SVGSVGElement>, svgRef.current)
    const col = Math.floor(pt.x / cellW)
    const row = Math.floor(pt.y / cellH)
    if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) return
    handleGridCellClick(col, row)
  }

  // --- Check answers ---

  function checkAnswers() {
    setRevealed(true)
    let correct = 0
    phase.correctPlacements.forEach(cp => {
      const p = placements[cp.unitId]
      if (p && p.col === cp.col && p.row === cp.row) correct++
    })
    setScore(prev => prev + correct)
  }

  // --- Phase / round navigation ---

  function nextPhase() {
    if (phaseIndex < round.phases.length - 1) {
      setPhaseIndex(prev => prev + 1)
      setPlacements({})
      setSelectedUnit(null)
      setRevealed(false)
    }
  }

  function handleAllPhasesComplete() {
    fetchDebrief()
  }

  function reset() {
    setRoundIndex(0)
    setPhaseIndex(0)
    setPlacements({})
    setSelectedUnit(null)
    setRevealed(false)
    setScore(0)
    setFeedback(null)
  }

  // --- LLM eval ---

  async function fetchDebrief() {
    setFeedbackLoading(true)
    try {
      const details = round.phases
        .map((ph, i) => {
          if (i > phaseIndex) return null
          return `Phase "${ph.name}": ${ph.correctPlacements.length} placements`
        })
        .filter(Boolean)
        .join('; ')

      const res = await fetch('/api/game-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'spatial-map-eval',
          game: 'Spatial Map',
          topic: round.title,
          score,
          totalRounds: round.phases.length,
          details,
        }),
      })
      const data = await res.json()
      setFeedback(data.insight || null)
    } catch {
      setFeedback(null)
    }
    setFeedbackLoading(false)
  }

  // --- Determine result styling for a placed unit ---

  function getUnitResult(unitId: string): 'correct' | 'incorrect' | null {
    if (!revealed) return null
    const p = placements[unitId]
    if (!p) return null
    const cp = phase.correctPlacements.find(c => c.unitId === unitId)
    if (!cp) return null
    return p.col === cp.col && p.row === cp.row ? 'correct' : 'incorrect'
  }

  const isLastPhase = phaseIndex === round.phases.length - 1

  return (
    <div className="game-container">
      <h2 className="game-title">{round.title}</h2>
      <p className="game-subtitle">Spatial Map</p>

      <div className="game-stats">
        <div className="stat">
          <div className="stat-value">{score}</div>
          <div className="stat-label">Score</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {phaseIndex + 1} / {round.phases.length}
          </div>
          <div className="stat-label">Phase</div>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="phase-indicator">
        <strong>{phase.name}</strong>
        <br />
        {phase.instruction}
      </div>

      {/* SVG Grid */}
      <svg
        ref={svgRef}
        className="diagram-svg"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        onClick={handleSvgClick}
        style={{ cursor: selectedUnit ? 'crosshair' : 'default' }}
      >
        {/* Background */}
        <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill={THEME.bg} rx={8} />

        {/* Regions */}
        {round.regions.map((region, i) => {
          const rx = region.col * cellW
          const ry = region.row * cellH
          const rw = region.width * cellW
          const rh = region.height * cellH
          return (
            <g key={`region-${i}`}>
              <rect
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                fill={region.color}
                opacity={0.6}
              />
              <text
                x={rx + rw / 2}
                y={ry + rh / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={THEME.textMuted}
                fontSize={12}
                fontWeight={500}
                pointerEvents="none"
              >
                {region.label}
              </text>
            </g>
          )
        })}

        {/* Grid lines */}
        {Array.from({ length: gridCols + 1 }, (_, i) => (
          <line
            key={`vcol-${i}`}
            x1={i * cellW}
            y1={0}
            x2={i * cellW}
            y2={SVG_HEIGHT}
            stroke={THEME.border}
            strokeWidth={1}
            pointerEvents="none"
          />
        ))}
        {Array.from({ length: gridRows + 1 }, (_, i) => (
          <line
            key={`hrow-${i}`}
            x1={0}
            y1={i * cellH}
            x2={SVG_WIDTH}
            y2={i * cellH}
            stroke={THEME.border}
            strokeWidth={1}
            pointerEvents="none"
          />
        ))}

        {/* Hover hints: highlight cells when a unit is selected */}
        {selectedUnit &&
          !revealed &&
          Array.from({ length: gridRows }, (_, row) =>
            Array.from({ length: gridCols }, (_, col) => {
              // Only show if cell is empty
              const occupied = Object.values(placements).some(
                p => p.col === col && p.row === row
              )
              if (occupied) return null
              return (
                <rect
                  key={`hover-${col}-${row}`}
                  x={col * cellW + 1}
                  y={row * cellH + 1}
                  width={cellW - 2}
                  height={cellH - 2}
                  fill={THEME.accent}
                  opacity={0.06}
                  rx={4}
                  pointerEvents="none"
                />
              )
            })
          )}

        {/* Placed units as circles */}
        {Object.entries(placements).map(([unitId, p]) => {
          const unit = round.units.find(u => u.id === unitId)
          if (!unit) return null
          const cx = p.col * cellW + cellW / 2
          const cy = p.row * cellH + cellH / 2
          const radius = Math.min(cellW, cellH) * 0.32
          const result = getUnitResult(unitId)

          let strokeColor = 'transparent'
          let strokeWidth = 0
          if (result === 'correct') {
            strokeColor = THEME.correct
            strokeWidth = 3
          } else if (result === 'incorrect') {
            strokeColor = THEME.incorrect
            strokeWidth = 3
          }

          return (
            <g key={`placed-${unitId}`} style={{ cursor: revealed ? 'default' : 'pointer' }}>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={unit.color}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={0.9}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fill={THEME.white}
                fontSize={11}
                fontWeight={600}
                pointerEvents="none"
              >
                {unit.label}
              </text>
            </g>
          )
        })}

        {/* Show correct positions after reveal for incorrect placements */}
        {revealed &&
          phase.correctPlacements.map(cp => {
            const p = placements[cp.unitId]
            if (!p) return null
            // Only show ghost if placement was wrong
            if (p.col === cp.col && p.row === cp.row) return null
            const cx = cp.col * cellW + cellW / 2
            const cy = cp.row * cellH + cellH / 2
            const radius = Math.min(cellW, cellH) * 0.25
            return (
              <g key={`ghost-${cp.unitId}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={THEME.correct}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  opacity={0.6}
                />
                <text
                  x={cx}
                  y={cy + radius + 12}
                  textAnchor="middle"
                  fill={THEME.correct}
                  fontSize={9}
                  opacity={0.7}
                  pointerEvents="none"
                >
                  correct
                </text>
              </g>
            )
          })}
      </svg>

      {/* Unit pool (HTML) */}
      <div className="spatial-unit-pool">
        {unplacedUnits.length === 0 && !revealed && (
          <span style={{ color: THEME.textMuted, fontSize: '0.8rem' }}>
            All units placed. Click a unit on the grid to pick it back up.
          </span>
        )}
        {unplacedUnits.map(unit => (
          <div
            key={unit.id}
            className={`spatial-unit${selectedUnit === unit.id ? ' selected' : ''}`}
            style={{
              background: unit.color,
              color: '#fff',
              borderColor: selectedUnit === unit.id ? THEME.accent : 'transparent',
              boxShadow:
                selectedUnit === unit.id
                  ? `0 0 0 2px ${THEME.accent}`
                  : 'none',
            }}
            onClick={() => handlePoolUnitClick(unit.id)}
          >
            {unit.label}
          </div>
        ))}
      </div>

      {/* Feedback after all phases */}
      {feedback && (
        <div
          className="diagram-feedback info"
          style={{ marginBottom: '1rem', borderColor: THEME.accent }}
        >
          <strong style={{ color: THEME.accent }}>Coach&apos;s Take</strong>
          <br />
          {feedback}
        </div>
      )}
      {feedbackLoading && (
        <div
          className="diagram-feedback info"
          style={{ marginBottom: '1rem', borderColor: THEME.accent }}
        >
          Analyzing your performance...
        </div>
      )}

      {/* Actions */}
      <div className="game-actions">
        {!revealed && allPlaced && (
          <button className="btn-primary" onClick={checkAnswers}>
            Check
          </button>
        )}
        {revealed && !isLastPhase && (
          <button className="btn-primary" onClick={nextPhase}>
            Next Phase
          </button>
        )}
        {revealed && isLastPhase && !feedback && !feedbackLoading && (
          <button className="btn-primary" onClick={handleAllPhasesComplete}>
            Get Debrief
          </button>
        )}
        {revealed && isLastPhase && (feedback || feedbackLoading) && (
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
