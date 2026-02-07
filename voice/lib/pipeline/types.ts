// Pipeline types for dynamic game generation

// ═══════════════════════════════════════════
//   Game Config Types (used by renderers + pipeline)
// ═══════════════════════════════════════════

export interface SortBattleConfig {
  instruction: string
  buckets: string[]
  items: { text: string; correctBucket: number }[]
}

export interface ErrorDetectiveConfig {
  title: string
  description: string
  segments: { text: string; isError: boolean; explanation?: string }[]
}

export interface ClaimEvidenceConfig {
  topic: string
  claims: { id: string; text: string }[]
  evidence: { id: string; text: string; matchesClaimId: string; isDistractor?: boolean }[]
}

export interface PredictionBetConfig {
  scenario: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface TeachBotConfig {
  topic: string
  botStatements: {
    text: string
    isWrong: boolean
    whatsWrong?: string
    hint?: string
  }[]
}

export interface NodeGraphNode {
  id: string
  label: string
  value?: string
  challenge?: boolean
  correctValue: string
  x: number
  y: number
}

export interface NodeGraphEdge {
  from: string
  to: string
  label?: string
}

export interface NodeGraphConfig {
  title: string
  instruction: string
  nodes: NodeGraphNode[]
  edges: NodeGraphEdge[]
}

export interface SpatialMapUnit {
  id: string
  label: string
  color: string
}

export interface SpatialMapPlacement {
  unitId: string
  col: number
  row: number
}

export interface SpatialMapPhase {
  name: string
  instruction: string
  correctPlacements: SpatialMapPlacement[]
}

export interface SpatialMapRegion {
  col: number
  row: number
  width: number
  height: number
  color: string
  label: string
}

export interface SpatialMapConfig {
  title: string
  gridCols: number
  gridRows: number
  regions: SpatialMapRegion[]
  units: SpatialMapUnit[]
  phases: SpatialMapPhase[]
}

export interface TimelineEvent {
  id: string
  label: string
  date?: string
}

export interface TimelineConfig {
  title: string
  instruction: string
  events: TimelineEvent[]
  correctOrder: string[]
  revealedPositions?: number[]
}

export type FlowNodeType = 'start' | 'end' | 'process' | 'decision'

export interface FlowNode {
  id: string
  type: FlowNodeType
  label: string
  x: number
  y: number
}

export interface FlowEdge {
  from: string
  to: string
  label?: string
}

export interface FlowTraceStep {
  nodeId: string
  prompt?: string
  options?: string[]
  correctOption?: number
  correctAnswer?: string
  explanation: string
}

export interface FlowDiagramConfig {
  title: string
  instruction: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  traceSteps: FlowTraceStep[]
}

// ═══════════════════════════════════════════
//   Renderer Types
// ═══════════════════════════════════════════

export type RendererType =
  | 'sortBattle'
  | 'errorDetective'
  | 'claimEvidence'
  | 'predictionBet'
  | 'teachBot'
  | 'nodeGraph'
  | 'spatialMap'
  | 'timeline'
  | 'flowDiagram'

export type RendererConfig =
  | { type: 'sortBattle'; rounds: SortBattleConfig[] }
  | { type: 'errorDetective'; rounds: ErrorDetectiveConfig[] }
  | { type: 'claimEvidence'; rounds: ClaimEvidenceConfig[] }
  | { type: 'predictionBet'; rounds: PredictionBetConfig[] }
  | { type: 'teachBot'; rounds: TeachBotConfig[] }
  | { type: 'nodeGraph'; rounds: NodeGraphConfig[] }
  | { type: 'spatialMap'; rounds: SpatialMapConfig[] }
  | { type: 'timeline'; rounds: TimelineConfig[] }
  | { type: 'flowDiagram'; rounds: FlowDiagramConfig[] }
  | { type: 'custom'; rounds: RoundSpec[] }

// ═══════════════════════════════════════════
//   Game Spec (output of Prompt A)
// ═══════════════════════════════════════════

export interface RoundSpec {
  roundNumber: number
  focus: string           // what this round tests
  contentSeed: string     // brief content description for Prompt B
}

export interface CompletionRequirement {
  id: string
  description: string
  pseudocode: string      // testable condition
}

export interface GameSpec {
  id: string
  title: string
  gameType: RendererType | 'custom'
  concept: string                     // 1-2 sentence game idea
  pedagogicalGoal: string             // what understanding this tests
  whyThisGame: string                 // reasoning for mechanic selection
  difficulty: 1 | 2 | 3 | 4 | 5
  rounds: RoundSpec[]
  completionRequirements: CompletionRequirement[]
  customRendererDescription?: string  // only if gameType === 'custom'
}

// ═══════════════════════════════════════════
//   Critic Result (output of Prompt C)
// ═══════════════════════════════════════════

export interface CriticDimension {
  name: string
  score: 0 | 1 | 2 | 3
  feedback: string
}

export interface CriticResult {
  pass: boolean
  totalScore: number
  dimensions: CriticDimension[]
  revisionInstructions?: string       // specific fixes if fail
}

// ═══════════════════════════════════════════
//   Pipeline Events (streamed to client)
// ═══════════════════════════════════════════

export type PipelineEvent =
  | { event: 'spec_ready'; data: { title: string; concept: string; gameType: string } }
  | { event: 'config_draft'; data: { iteration: number } }
  | { event: 'validation_error'; data: { iteration: number; errors: string[] } }
  | { event: 'critic_result'; data: { pass: boolean; score: number; iteration: number } }
  | { event: 'revision'; data: { iteration: number; instructions: string } }
  | { event: 'complete'; data: { spec: GameSpec; config: RendererConfig; customCode?: string } }
  | { event: 'error'; data: { message: string; fallback?: RendererConfig } }

// ═══════════════════════════════════════════
//   Digital Clone Profile (enriched learner)
// ═══════════════════════════════════════════

export interface DigitalCloneProfile {
  name: string
  subject: string
  level: 'beginner' | 'intermediate' | 'advanced'
  context: string

  knownStrengths: string[]
  knownGaps: string[]
  misconceptions: string[]

  preferredModalities: ('visual' | 'hands-on' | 'conversational' | 'analytical')[]
  responseToChallenge: string
  engagementTriggers: string[]

  recentPerformance: {
    game: string
    score: number
    maxScore: number
    notableErrors: string[]
  }[]

  currentModule: string
  modulesCompleted: string[]
  upcomingTopics: string[]
}

// ═══════════════════════════════════════════
//   Article Context (from course lessons)
// ═══════════════════════════════════════════

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface ArticleContext {
  title: string
  content: string
  masteryCriteria: string
  searchResults?: SearchResult[]
}

// ═══════════════════════════════════════════
//   Pipeline Input
// ═══════════════════════════════════════════

export interface GenerateGameInput {
  profile: DigitalCloneProfile
  topic?: string            // optional override — otherwise inferred from profile gaps
  preferredGameType?: RendererType  // optional hint (only when mode is 'template')
  forceCustom?: boolean     // true = always generate a novel game type via code generation
  articleContext?: ArticleContext  // lesson content the student just read
}
