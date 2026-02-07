// String descriptions of each renderer's config interface.
// These are fed to the LLM so it knows the exact shape to generate.

import type { RendererType } from './types'

export const RENDERER_DESCRIPTIONS: Record<RendererType, { name: string; goodFor: string; schema: string }> = {
  sortBattle: {
    name: 'Sort Battle',
    goodFor: 'Classification, categorization, distinguishing similar concepts. Drag items into buckets.',
    schema: `interface SortBattleConfig {
  instruction: string              // e.g. "Sort these into the correct category"
  buckets: string[]                // 2-6 bucket labels
  items: {
    text: string                   // item to be sorted
    correctBucket: number          // index into buckets array (0-based)
  }[]                              // 4-8 items
}
// Config is an array of rounds: SortBattleConfig[]
// Each round has a different instruction and set of buckets/items.`,
  },

  errorDetective: {
    name: 'Error Detective',
    goodFor: 'Critical reading, fact-checking, identifying misconceptions. Click on segments that contain errors.',
    schema: `interface ErrorDetectiveConfig {
  title: string                    // title of the passage
  description: string              // "Find the errors in this explanation"
  segments: {
    text: string                   // a sentence or clause
    isError: boolean               // true if this segment contains an error
    explanation?: string           // REQUIRED if isError=true: what's actually correct
  }[]                              // 4-6 segments, at least 1 must be an error
}
// Config is an array of rounds: ErrorDetectiveConfig[]`,
  },

  claimEvidence: {
    name: 'Claim-Evidence Match',
    goodFor: 'Argumentation, evidence evaluation, critical thinking. Match claims to their best supporting evidence.',
    schema: `interface ClaimEvidenceConfig {
  topic: string                    // subject area
  claims: {
    id: string                     // unique ID like "c1", "c2"
    text: string                   // the claim
  }[]                              // 2-4 claims
  evidence: {
    id: string                     // unique ID like "e1", "e2"
    text: string                   // the evidence statement
    matchesClaimId: string         // which claim this evidence supports (must reference a claim id)
    isDistractor?: boolean         // true = plausible but wrong match (still needs matchesClaimId for what it mimics)
  }[]                              // more evidence items than claims; include 1-2 distractors
}
// Config is an array of rounds: ClaimEvidenceConfig[]`,
  },

  predictionBet: {
    name: 'Prediction Bet',
    goodFor: 'Testing mental models, exposing misconceptions, calibrating confidence. Present scenario, predict outcome, bet confidence.',
    schema: `interface PredictionBetConfig {
  scenario: string                 // code snippet, historical scenario, or conceptual question
  options: string[]                // 2-4 possible outcomes
  correctIndex: number             // 0-based index of the correct option
  explanation: string              // why the correct answer is correct
}
// Config is an array of rounds: PredictionBetConfig[]`,
  },

  teachBot: {
    name: 'Teach the Bot',
    goodFor: 'Testing deep understanding via explanation. Bot makes statements (some wrong), learner must catch and correct errors.',
    schema: `interface TeachBotConfig {
  topic: string                    // what the bot is "learning"
  botStatements: {
    text: string                   // what the bot says (conversational tone)
    isWrong: boolean               // true if the statement has an error
    whatsWrong?: string            // REQUIRED if isWrong=true: the actual correct info
    hint?: string                  // REQUIRED if isWrong=true: a nudge for the learner
  }[]                              // 3-5 statements, at least 1 must be wrong
}
// Config is an array of rounds: TeachBotConfig[]`,
  },

  nodeGraph: {
    name: 'Node Graph',
    goodFor: 'Computational thinking, tracing values through networks, understanding relationships. Fill in missing node values.',
    schema: `interface NodeGraphConfig {
  title: string
  instruction: string              // explain what the graph represents and what to fill in
  nodes: {
    id: string                     // unique node ID
    label: string                  // display label
    value?: string                 // shown value (omit for challenge nodes)
    challenge?: boolean            // true = user must fill this in
    correctValue: string           // expected answer
    x: number                      // x position (0-760 range)
    y: number                      // y position (0-460 range)
  }[]                              // at least 2 nodes, at least 1 challenge
  edges: {
    from: string                   // source node ID
    to: string                     // target node ID
    label?: string                 // edge label (e.g. weight, operation)
  }[]
}
// Config is an array of rounds: NodeGraphConfig[]
// Coordinates: SVG viewport is 760x460. Keep nodes within this range with some padding.`,
  },

  spatialMap: {
    name: 'Spatial Map',
    goodFor: 'Spatial reasoning, geography, memory layouts, feature spaces. Place units on a grid within labeled regions.',
    schema: `interface SpatialMapConfig {
  title: string
  gridCols: number                 // grid width (4-10)
  gridRows: number                 // grid height (4-8)
  regions: {
    col: number                    // region start column
    row: number                    // region start row
    width: number                  // region width in cells
    height: number                 // region height in cells
    color: string                  // hex color like "#1a3a1a"
    label: string                  // region label
  }[]
  units: {
    id: string                     // unique unit ID
    label: string                  // display label
    color: string                  // hex color
  }[]
  phases: {
    name: string                   // phase name
    instruction: string            // what to do in this phase
    correctPlacements: {
      unitId: string               // which unit
      col: number                  // correct column (0-based, < gridCols)
      row: number                  // correct row (0-based, < gridRows)
    }[]
  }[]                              // 1-3 phases
}
// Config is an array of rounds: SpatialMapConfig[]
// All placements must be within grid bounds. Unit IDs in placements must match defined units.`,
  },

  timeline: {
    name: 'Timeline',
    goodFor: 'Sequencing, chronological reasoning, understanding process order. Drag events to the correct position on a timeline.',
    schema: `interface TimelineConfig {
  title: string
  instruction: string              // e.g. "Place these events in chronological order"
  events: {
    id: string                     // unique event ID
    label: string                  // event description
    date?: string                  // optional date hint shown on card
  }[]                              // 4-8 events
  correctOrder: string[]           // event IDs in the correct left-to-right order (MUST contain ALL event IDs)
  revealedPositions?: number[]     // indices in correctOrder that are pre-placed as hints (0-based)
}
// Config is an array of rounds: TimelineConfig[]
// correctOrder.length MUST equal events.length. Every event ID must appear in correctOrder exactly once.`,
  },

  flowDiagram: {
    name: 'Flow Diagram',
    goodFor: 'Algorithm tracing, decision trees, strategic reasoning. Step through a flowchart answering questions at each node.',
    schema: `interface FlowDiagramConfig {
  title: string
  instruction: string              // explain the scenario
  nodes: {
    id: string                     // unique node ID
    type: 'start' | 'end' | 'process' | 'decision'
    label: string                  // node content (can use \\n for line breaks)
    x: number                      // x position (0-760)
    y: number                      // y position (0-460)
  }[]
  edges: {
    from: string                   // source node ID
    to: string                     // target node ID
    label?: string                 // edge label (e.g. "Yes", "No")
  }[]
  traceSteps: {
    nodeId: string                 // which node this step is at
    prompt?: string                // question to ask the user
    options?: string[]             // for decision nodes: multiple choice options
    correctOption?: number         // 0-based index of correct option
    correctAnswer?: string         // for free-text answers (process/start/end nodes)
    explanation: string            // shown after answering
  }[]                              // walk through the diagram step by step
}
// Config is an array of rounds: FlowDiagramConfig[]
// All edge from/to and traceStep nodeIds must reference existing nodes.
// Coordinates: SVG viewport is 760x460.`,
  },
}

export function getRendererSchema(gameType: RendererType): string {
  const desc = RENDERER_DESCRIPTIONS[gameType]
  return desc ? desc.schema : ''
}

export function getRendererCatalog(): string {
  return Object.entries(RENDERER_DESCRIPTIONS)
    .map(([key, desc]) => `### ${desc.name} (type: "${key}")\n**Good for:** ${desc.goodFor}\n\n${desc.schema}`)
    .join('\n\n---\n\n')
}
