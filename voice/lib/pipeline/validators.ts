// Zod schemas for runtime validation of LLM-generated game configs

import { z } from 'zod'
import type { RendererType } from './types'

// ═══════════════════════════════════════════
//   Sort Battle
// ═══════════════════════════════════════════

export const sortBattleRoundSchema = z.object({
  instruction: z.string().min(1),
  buckets: z.array(z.string().min(1)).min(2).max(6),
  items: z.array(z.object({
    text: z.string().min(1),
    correctBucket: z.number().int().min(0),
  })).min(2),
}).refine(
  (data) => data.items.every(item => item.correctBucket < data.buckets.length),
  { message: 'correctBucket index must be within buckets array bounds' }
)

export const sortBattleConfigSchema = z.array(sortBattleRoundSchema).min(1)

// ═══════════════════════════════════════════
//   Error Detective
// ═══════════════════════════════════════════

export const errorDetectiveRoundSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  segments: z.array(z.object({
    text: z.string().min(1),
    isError: z.boolean(),
    explanation: z.string().optional(),
  })).min(2),
}).refine(
  (data) => data.segments.some(s => s.isError),
  { message: 'At least one segment must be an error' }
).refine(
  (data) => data.segments.filter(s => s.isError).every(s => s.explanation),
  { message: 'Every error segment must have an explanation' }
)

export const errorDetectiveConfigSchema = z.array(errorDetectiveRoundSchema).min(1)

// ═══════════════════════════════════════════
//   Claim-Evidence Match
// ═══════════════════════════════════════════

export const claimEvidenceRoundSchema = z.object({
  topic: z.string().min(1),
  claims: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1),
  })).min(2),
  evidence: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    matchesClaimId: z.string().min(1),
    isDistractor: z.boolean().optional(),
  })).min(2),
}).refine(
  (data) => {
    const claimIds = new Set(data.claims.map(c => c.id))
    return data.evidence.every(e => claimIds.has(e.matchesClaimId))
  },
  { message: 'All evidence matchesClaimId must reference an existing claim' }
)

export const claimEvidenceConfigSchema = z.array(claimEvidenceRoundSchema).min(1)

// ═══════════════════════════════════════════
//   Prediction Bet
// ═══════════════════════════════════════════

export const predictionBetRoundSchema = z.object({
  scenario: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  correctIndex: z.number().int().min(0),
  explanation: z.string().min(1),
}).refine(
  (data) => data.correctIndex < data.options.length,
  { message: 'correctIndex must be within options array bounds' }
)

export const predictionBetConfigSchema = z.array(predictionBetRoundSchema).min(1)

// ═══════════════════════════════════════════
//   Teach the Bot
// ═══════════════════════════════════════════

export const teachBotRoundSchema = z.object({
  topic: z.string().min(1),
  botStatements: z.array(z.object({
    text: z.string().min(1),
    isWrong: z.boolean(),
    whatsWrong: z.string().optional(),
    hint: z.string().optional(),
  })).min(2),
}).refine(
  (data) => data.botStatements.some(s => s.isWrong),
  { message: 'At least one bot statement must be wrong' }
).refine(
  (data) => data.botStatements.filter(s => s.isWrong).every(s => s.whatsWrong && s.hint),
  { message: 'Wrong statements must have whatsWrong and hint' }
)

export const teachBotConfigSchema = z.array(teachBotRoundSchema).min(1)

// ═══════════════════════════════════════════
//   Node Graph
// ═══════════════════════════════════════════

export const nodeGraphRoundSchema = z.object({
  title: z.string().min(1),
  instruction: z.string().min(1),
  nodes: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    value: z.string().optional(),
    challenge: z.boolean().optional(),
    correctValue: z.string().min(1),
    x: z.number(),
    y: z.number(),
  })).min(2),
  edges: z.array(z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    label: z.string().optional(),
  })).min(1),
}).refine(
  (data) => {
    const nodeIds = new Set(data.nodes.map(n => n.id))
    return data.edges.every(e => nodeIds.has(e.from) && nodeIds.has(e.to))
  },
  { message: 'All edge from/to must reference existing node IDs' }
).refine(
  (data) => data.nodes.some(n => n.challenge),
  { message: 'At least one node must be a challenge node' }
)

export const nodeGraphConfigSchema = z.array(nodeGraphRoundSchema).min(1)

// ═══════════════════════════════════════════
//   Spatial Map
// ═══════════════════════════════════════════

const spatialMapRegionSchema = z.object({
  col: z.number().int().min(0),
  row: z.number().int().min(0),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  color: z.string().min(1),
  label: z.string().min(1),
})

const spatialMapUnitSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().min(1),
})

const spatialMapPlacementSchema = z.object({
  unitId: z.string().min(1),
  col: z.number().int().min(0),
  row: z.number().int().min(0),
})

const spatialMapPhaseSchema = z.object({
  name: z.string().min(1),
  instruction: z.string().min(1),
  correctPlacements: z.array(spatialMapPlacementSchema).min(1),
})

export const spatialMapRoundSchema = z.object({
  title: z.string().min(1),
  gridCols: z.number().int().min(2).max(20),
  gridRows: z.number().int().min(2).max(20),
  regions: z.array(spatialMapRegionSchema).min(1),
  units: z.array(spatialMapUnitSchema).min(1),
  phases: z.array(spatialMapPhaseSchema).min(1),
}).refine(
  (data) => {
    const unitIds = new Set(data.units.map(u => u.id))
    return data.phases.every(phase =>
      phase.correctPlacements.every(p => unitIds.has(p.unitId))
    )
  },
  { message: 'All placement unitIds must reference existing units' }
).refine(
  (data) => {
    return data.phases.every(phase =>
      phase.correctPlacements.every(p =>
        p.col < data.gridCols && p.row < data.gridRows
      )
    )
  },
  { message: 'All placements must be within grid bounds' }
)

export const spatialMapConfigSchema = z.array(spatialMapRoundSchema).min(1)

// ═══════════════════════════════════════════
//   Timeline
// ═══════════════════════════════════════════

export const timelineRoundSchema = z.object({
  title: z.string().min(1),
  instruction: z.string().min(1),
  events: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    date: z.string().optional(),
  })).min(2),
  correctOrder: z.array(z.string().min(1)).min(2),
  revealedPositions: z.array(z.number().int().min(0)).optional(),
}).refine(
  (data) => {
    const eventIds = new Set(data.events.map(e => e.id))
    return data.correctOrder.every(id => eventIds.has(id))
  },
  { message: 'All correctOrder IDs must reference existing events' }
).refine(
  (data) => data.correctOrder.length === data.events.length,
  { message: 'correctOrder must contain all events' }
).refine(
  (data) => {
    if (!data.revealedPositions) return true
    return data.revealedPositions.every(i => i < data.correctOrder.length)
  },
  { message: 'revealedPositions indices must be within correctOrder bounds' }
)

export const timelineConfigSchema = z.array(timelineRoundSchema).min(1)

// ═══════════════════════════════════════════
//   Flow Diagram
// ═══════════════════════════════════════════

const flowNodeTypeSchema = z.enum(['start', 'end', 'process', 'decision'])

const flowNodeSchema = z.object({
  id: z.string().min(1),
  type: flowNodeTypeSchema,
  label: z.string().min(1),
  x: z.number(),
  y: z.number(),
})

const flowEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
})

const flowTraceStepSchema = z.object({
  nodeId: z.string().min(1),
  prompt: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctOption: z.number().int().min(0).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().min(1),
})

export const flowDiagramRoundSchema = z.object({
  title: z.string().min(1),
  instruction: z.string().min(1),
  nodes: z.array(flowNodeSchema).min(2),
  edges: z.array(flowEdgeSchema).min(1),
  traceSteps: z.array(flowTraceStepSchema).min(1),
}).refine(
  (data) => {
    const nodeIds = new Set(data.nodes.map(n => n.id))
    return data.edges.every(e => nodeIds.has(e.from) && nodeIds.has(e.to))
  },
  { message: 'All edge from/to must reference existing node IDs' }
).refine(
  (data) => {
    const nodeIds = new Set(data.nodes.map(n => n.id))
    return data.traceSteps.every(s => nodeIds.has(s.nodeId))
  },
  { message: 'All traceStep nodeIds must reference existing nodes' }
)

export const flowDiagramConfigSchema = z.array(flowDiagramRoundSchema).min(1)

// ═══════════════════════════════════════════
//   Validator dispatch
// ═══════════════════════════════════════════

const schemaMap: Record<RendererType, z.ZodType> = {
  sortBattle: sortBattleConfigSchema,
  errorDetective: errorDetectiveConfigSchema,
  claimEvidence: claimEvidenceConfigSchema,
  predictionBet: predictionBetConfigSchema,
  teachBot: teachBotConfigSchema,
  nodeGraph: nodeGraphConfigSchema,
  spatialMap: spatialMapConfigSchema,
  timeline: timelineConfigSchema,
  flowDiagram: flowDiagramConfigSchema,
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateConfig(gameType: RendererType, rounds: unknown): ValidationResult {
  const schema = schemaMap[gameType]
  if (!schema) {
    return { valid: false, errors: [`Unknown game type: ${gameType}`] }
  }

  const result = schema.safeParse(rounds)
  if (result.success) {
    return { valid: true, errors: [] }
  }

  const errors = result.error.issues.map(issue => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })

  return { valid: false, errors }
}
