// Pipeline tracing — captures full LLM call details, validation, and timing per run.
// All operations are try/caught so tracing never breaks the pipeline.
// Flushes to disk after each step so logs survive crashes.

import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export interface TraceStep {
  step: string
  iteration?: number
  timestamp: string
  durationMs?: number
  llm?: { systemPrompt: string; userPrompt: string; response: string }
  parsed?: unknown
  result?: unknown
  finalConfig?: unknown
  error?: string
}

export interface TraceData {
  runId: string
  status: 'running' | 'complete' | 'error'
  startedAt: string
  finishedAt?: string
  durationMs?: number
  input: { profileName: string; topic?: string; forceCustom?: boolean }
  steps: TraceStep[]
}

const LOGS_DIR = path.join(process.cwd(), 'voice', 'logs')

function shortId(): string {
  return Math.random().toString(36).slice(2, 8)
}

export class PipelineTrace {
  private data: TraceData
  private startTime: number
  private filepath: string | null = null
  private dirReady: Promise<void>

  constructor(input: { profileName: string; topic?: string; forceCustom?: boolean }) {
    this.startTime = Date.now()
    const runId = shortId()
    const ts = new Date().toISOString().replace(/[:.]/g, '-')

    this.data = {
      runId,
      status: 'running',
      startedAt: new Date().toISOString(),
      input,
      steps: [],
    }

    // Pre-create the logs directory so flush never waits on mkdir
    this.dirReady = mkdir(LOGS_DIR, { recursive: true }).catch(() => {})
    // Stable filename — flush overwrites in place rather than creating new files
    this.filepath = path.join(LOGS_DIR, `trace-${ts}-${runId}.json`)
  }

  /** Start timing a step. Returns a function to call when the step completes. */
  startStep(step: string, iteration?: number): (extras: Omit<TraceStep, 'step' | 'iteration' | 'timestamp' | 'durationMs'>) => void {
    const stepStart = Date.now()
    const timestamp = new Date().toISOString()

    return (extras) => {
      try {
        this.data.steps.push({
          step,
          ...(iteration !== undefined && { iteration }),
          timestamp,
          durationMs: Date.now() - stepStart,
          ...extras,
        })
      } catch {
        // never break the pipeline
      }
    }
  }

  /** Add a step with no timing (e.g. validation results). */
  addStep(step: string, extras: Omit<TraceStep, 'step' | 'timestamp'>): void {
    try {
      this.data.steps.push({
        step,
        timestamp: new Date().toISOString(),
        ...extras,
      })
    } catch {
      // never break the pipeline
    }
  }

  /** Write current state to disk. Safe to call frequently — overwrites the same file. */
  async flush(): Promise<void> {
    try {
      await this.dirReady
      if (!this.filepath) return
      this.data.durationMs = Date.now() - this.startTime
      await writeFile(this.filepath, JSON.stringify(this.data, null, 2))
    } catch {
      // never break the pipeline
    }
  }

  /** Mark the trace as complete/error and write final state to disk. */
  async finalize(status: 'complete' | 'error' = 'complete'): Promise<void> {
    try {
      this.data.status = status
      this.data.finishedAt = new Date().toISOString()
      this.data.durationMs = Date.now() - this.startTime
      await this.dirReady
      if (!this.filepath) return
      await writeFile(this.filepath, JSON.stringify(this.data, null, 2))
    } catch {
      // never break the pipeline
    }
  }
}
