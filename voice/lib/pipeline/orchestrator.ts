// Main pipeline orchestrator: generateGame() async generator
// Takes a learner profile → produces a playable game config

import { callLLM } from '../llm'
import type { LLMResponse, Tool } from '../llm'
import { buildSpecPrompt, buildConfigPrompt, buildCriticPrompt, buildRevisionPrompt, buildRevisionPromptWithTools, buildCustomGamePrompt, buildCustomFixPrompt } from './prompts'
import { CODE_EDIT_TOOLS, applyToolEdits } from './edit-tools'
import { validateConfig } from './validators'
import { validateCustomCode, transpileTSX, wrapForClientExecution, testRender, stripCodeFences } from './code-sandbox'
import { PipelineTrace } from './trace'
import type {
  DigitalCloneProfile,
  GameSpec,
  RendererType,
  RendererConfig,
  PipelineEvent,
  CriticResult,
  GenerateGameInput,
} from './types'

const MAX_ITERATIONS = 3 // 1 initial + 2 revisions

// ═══════════════════════════════════════════
//   LLM call helper
// ═══════════════════════════════════════════

async function llmCall(
  system: string,
  user: string,
  traceComplete?: (extras: { llm: { systemPrompt: string; userPrompt: string; response: string }; parsed?: unknown }) => void,
): Promise<string> {
  const response = await callLLM({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    tools: [],
  })

  const content = response.choices[0]?.message?.content || ''

  if (traceComplete) {
    try {
      traceComplete({ llm: { systemPrompt: system, userPrompt: user, response: content } })
    } catch { /* tracing never breaks the pipeline */ }
  }

  return content
}

async function llmCallWithTools(
  system: string,
  user: string,
  tools: Tool[],
  traceComplete?: (extras: { llm: { systemPrompt: string; userPrompt: string; response: string }; parsed?: unknown }) => void,
): Promise<LLMResponse> {
  const response = await callLLM({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    tools,
  })

  if (traceComplete) {
    try {
      const msg = response.choices[0]?.message
      const summary = msg?.tool_calls
        ? `[${msg.tool_calls.length} tool call(s): ${msg.tool_calls.map(tc => tc.function.name).join(', ')}]`
        : (msg?.content || '')
      traceComplete({ llm: { systemPrompt: system, userPrompt: user, response: summary } })
    } catch { /* tracing never breaks the pipeline */ }
  }

  return response
}

function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {
    // Try to find JSON in the response (may have markdown fences)
  }

  // Try extracting from markdown code blocks
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {
      // continue
    }
  }

  // Try finding the first { or [ and matching
  const jsonStart = text.search(/[\[{]/)
  if (jsonStart >= 0) {
    const candidate = text.slice(jsonStart)
    try {
      return JSON.parse(candidate)
    } catch {
      // Try trimming trailing content after the JSON
      const bracketChar = candidate[0]
      const closeChar = bracketChar === '[' ? ']' : '}'
      let depth = 0
      for (let i = 0; i < candidate.length; i++) {
        if (candidate[i] === bracketChar) depth++
        else if (candidate[i] === closeChar) {
          depth--
          if (depth === 0) {
            try {
              return JSON.parse(candidate.slice(0, i + 1))
            } catch {
              break
            }
          }
        }
      }
    }
  }

  throw new Error('Could not extract valid JSON from LLM response')
}

// ═══════════════════════════════════════════
//   Pipeline steps
// ═══════════════════════════════════════════

async function generateSpec(profile: DigitalCloneProfile, topic?: string, trace?: PipelineTrace): Promise<GameSpec> {
  const { system, user } = buildSpecPrompt(profile, topic)
  const complete = trace?.startStep('spec_generation')
  const response = await llmCall(system, user)
  const spec = extractJSON(response) as GameSpec

  // Basic validation
  if (!spec.id || !spec.title || !spec.gameType || !spec.rounds) {
    throw new Error('Invalid game spec: missing required fields')
  }

  complete?.({ llm: { systemPrompt: system, userPrompt: user, response }, parsed: spec })
  return spec
}

async function generateConfig(spec: GameSpec, trace?: PipelineTrace, iteration?: number): Promise<{ config: unknown; isCustom: boolean }> {
  const { system, user } = buildConfigPrompt(spec)
  const complete = trace?.startStep('config_generation', iteration)
  const response = await llmCall(system, user)

  if (spec.gameType === 'custom') {
    complete?.({ llm: { systemPrompt: system, userPrompt: user, response }, parsed: '(custom code)' })
    return { config: response, isCustom: true }
  }

  const config = extractJSON(response)
  complete?.({ llm: { systemPrompt: system, userPrompt: user, response }, parsed: config })
  return { config, isCustom: false }
}

async function critiqueConfig(spec: GameSpec, config: unknown, isCustom: boolean, trace?: PipelineTrace, iteration?: number): Promise<CriticResult> {
  const { system, user } = buildCriticPrompt(spec, config, isCustom)
  const complete = trace?.startStep('critic', iteration)
  const response = await llmCall(system, user)
  const result = extractJSON(response) as CriticResult

  // Ensure pass criteria is computed correctly
  const totalScore = result.dimensions.reduce((sum, d) => sum + d.score, 0)
  const allAboveTwo = result.dimensions.every(d => d.score >= 2)
  result.pass = allAboveTwo && totalScore >= 10
  result.totalScore = totalScore

  complete?.({ llm: { systemPrompt: system, userPrompt: user, response }, parsed: result })
  return result
}

async function reviseCustomCode(
  spec: GameSpec,
  currentCode: string,
  criticResult: CriticResult,
  trace?: PipelineTrace,
  iteration?: number,
): Promise<string> {
  const { system, user } = buildRevisionPromptWithTools(spec, currentCode, criticResult)
  const complete = trace?.startStep('revision', iteration)
  const response = await llmCallWithTools(system, user, CODE_EDIT_TOOLS, complete)

  const msg = response.choices[0]?.message

  // Fallback: if the LLM returned plain content instead of tool calls, treat as full rewrite
  if (!msg?.tool_calls || msg.tool_calls.length === 0) {
    return msg?.content || currentCode
  }

  const result = applyToolEdits(currentCode, msg.tool_calls)

  // Log any edit errors for debugging
  if (result.errors.length > 0) {
    console.warn(`[revision] ${result.errors.length} edit error(s):`, result.errors)
  }

  return result.code
}

async function reviseConfig(
  spec: GameSpec,
  currentConfig: unknown,
  criticResult: CriticResult,
  isCustom: boolean,
  trace?: PipelineTrace,
  iteration?: number,
): Promise<unknown> {
  if (isCustom) {
    return reviseCustomCode(spec, currentConfig as string, criticResult, trace, iteration)
  }

  const { system, user } = buildRevisionPrompt(spec, currentConfig, criticResult, isCustom)
  const complete = trace?.startStep('revision', iteration)
  const response = await llmCall(system, user)

  const revised = extractJSON(response)
  complete?.({ llm: { systemPrompt: system, userPrompt: user, response }, parsed: revised })
  return revised
}

// ═══════════════════════════════════════════
//   Custom game pipeline (Generate → Test-Render → Fix)
// ═══════════════════════════════════════════

async function* generateCustomGame(
  input: GenerateGameInput,
  trace: PipelineTrace,
): AsyncGenerator<PipelineEvent> {
  const { profile, topic } = input

  // Step 1: Merged Design+Build — one LLM call
  const { system, user } = buildCustomGamePrompt(profile, topic)
  const buildComplete = trace.startStep('custom_build')

  yield { event: 'spec_ready', data: { title: 'Generating custom game...', concept: topic || 'AI-designed game', gameType: 'custom' } }

  let code: string
  try {
    const raw = await llmCall(system, user, buildComplete)
    code = stripCodeFences(raw)
    await trace.flush()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    trace.addStep('error', { error: `Custom build failed: ${msg}` })
    await trace.finalize('error')
    yield { event: 'error', data: { message: `Failed to generate custom game: ${msg}` } }
    return
  }

  yield { event: 'config_draft', data: { iteration: 1 } }

  // Step 2: Validate + Test-Render — zero LLM calls
  const validation = validateCustomCode(code)
  if (!validation.valid) {
    trace.addStep('validation', { result: { valid: false, errors: validation.errors } })
    yield { event: 'validation_error', data: { iteration: 1, errors: validation.errors } }

    // Try to fix with one LLM call
    const fixResult = await attemptCustomFix(code, validation.errors.join('. '), trace)
    if (fixResult) {
      code = fixResult
    } else {
      // Emit anyway — error boundary handles it
      trace.addStep('error', { error: 'Custom game has validation errors after fix attempt' })
      await trace.finalize('error')
      yield { event: 'error', data: { message: `Custom game has validation errors: ${validation.errors.join('; ')}` } }
      return
    }
  }

  // Transpile + wrap
  let wrappedCode: string
  const transpiled = transpileTSX(code)
  if (!transpiled.success) {
    trace.addStep('validation', { result: { valid: false, errors: [transpiled.error!] } })
    yield { event: 'validation_error', data: { iteration: 1, errors: [transpiled.error!] } }

    const fixResult = await attemptCustomFix(code, `Transpilation error: ${transpiled.error}`, trace)
    if (fixResult) {
      code = fixResult
      const retranspiled = transpileTSX(code)
      if (!retranspiled.success) {
        await trace.finalize('error')
        yield { event: 'error', data: { message: `Transpilation failed after fix: ${retranspiled.error}` } }
        return
      }
      wrappedCode = wrapForClientExecution(retranspiled.code!)
    } else {
      await trace.finalize('error')
      yield { event: 'error', data: { message: `Transpilation error: ${transpiled.error}` } }
      return
    }
  } else {
    wrappedCode = wrapForClientExecution(transpiled.code!)
  }

  // Test-render the wrapped code
  const renderResult = testRender(wrappedCode)
  if (!renderResult.success) {
    trace.addStep('test_render', { result: { success: false, error: renderResult.error } })
    yield { event: 'validation_error', data: { iteration: 1, errors: [`Test render failed: ${renderResult.error}`] } }

    // Try to fix with one LLM call
    const fixResult = await attemptCustomFix(code, `Runtime error during render: ${renderResult.error}`, trace)
    if (fixResult) {
      code = fixResult
      const retranspiled = transpileTSX(code)
      if (retranspiled.success) {
        const rewrapped = wrapForClientExecution(retranspiled.code!)
        const retest = testRender(rewrapped)
        if (retest.success) {
          wrappedCode = rewrapped
          trace.addStep('test_render', { result: { success: true } })
        } else {
          // Emit anyway with warning — error boundary catches runtime crashes
          trace.addStep('test_render', { result: { success: false, error: retest.error, note: 'emitting despite error' } })
          wrappedCode = rewrapped
        }
      }
    }
    // If fix failed, still emit with the original code — error boundary handles it
  } else {
    trace.addStep('test_render', { result: { success: true } })
  }

  // Success — emit the complete game
  const spec: GameSpec = {
    id: `custom-${Date.now()}`,
    title: 'Custom Game',
    gameType: 'custom',
    concept: topic || 'AI-designed game',
    pedagogicalGoal: 'Adaptive learning',
    whyThisGame: 'Custom game designed for this learner',
    difficulty: 3,
    rounds: [{ roundNumber: 1, focus: 'custom', contentSeed: 'hardcoded' }],
    completionRequirements: [],
  }

  const rendererConfig: RendererConfig = { type: 'custom', rounds: spec.rounds }

  trace.addStep('complete', { finalConfig: '(custom code)' })
  await trace.finalize()
  yield {
    event: 'complete',
    data: {
      spec,
      config: rendererConfig,
      customCode: wrappedCode,
    },
  }
}

/**
 * Attempt to fix custom code with one LLM call using edit tools.
 * Returns the fixed source code, or null if fix failed.
 */
async function attemptCustomFix(
  currentCode: string,
  errorMessage: string,
  trace: PipelineTrace,
): Promise<string | null> {
  try {
    const { system, user } = buildCustomFixPrompt(currentCode, errorMessage)
    const complete = trace.startStep('custom_fix')
    const response = await llmCallWithTools(system, user, CODE_EDIT_TOOLS, complete)
    await trace.flush()

    const msg = response.choices[0]?.message

    // If plain content instead of tool calls, treat as full rewrite
    if (!msg?.tool_calls || msg.tool_calls.length === 0) {
      const content = stripCodeFences(msg?.content || '')
      if (content.length > 50) {
        // Looks like a full rewrite
        return content
      }
      return null
    }

    const result = applyToolEdits(currentCode, msg.tool_calls)

    if (result.errors.length > 0) {
      console.warn(`[custom_fix] ${result.errors.length} edit error(s):`, result.errors)
    }

    // Only return if at least one edit was applied
    return result.appliedCount > 0 ? result.code : null
  } catch (err) {
    console.warn('[custom_fix] Fix attempt failed:', err instanceof Error ? err.message : err)
    return null
  }
}

// ═══════════════════════════════════════════
//   Main pipeline generator
// ═══════════════════════════════════════════

export async function* generateGame(
  input: GenerateGameInput
): AsyncGenerator<PipelineEvent> {
  const { profile, topic, preferredGameType, forceCustom } = input
  const trace = new PipelineTrace({ profileName: profile.name, topic, forceCustom })

  // Fast path: custom game pipeline (1-2 LLM calls instead of 3-7)
  if (forceCustom) {
    yield* generateCustomGame(input, trace)
    return
  }

  let spec: GameSpec
  let config: unknown
  let isCustom = false
  let customCode: string | undefined
  let bestConfig: unknown = null
  let bestScore = -1
  let finalized = false

  try {
    // Step 1: Generate game spec
    try {
      spec = await generateSpec(profile, topic, trace)
      await trace.flush()

      // If user preferred a specific template, override
      if (preferredGameType && spec.gameType !== 'custom') {
        spec.gameType = preferredGameType
      }

      yield {
        event: 'spec_ready',
        data: { title: spec.title, concept: spec.concept, gameType: spec.gameType },
      }
    } catch (err) {
      trace.addStep('error', { error: `Failed to generate game spec: ${err instanceof Error ? err.message : 'Unknown error'}` })
      finalized = true
      await trace.finalize('error')
      yield {
        event: 'error',
        data: { message: `Failed to generate game spec: ${err instanceof Error ? err.message : 'Unknown error'}` },
      }
      return
    }

    isCustom = spec.gameType === 'custom'

    // Step 2-5: Config generation + validation + critic loop
    for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
      try {
        // Generate or revise config
        if (iteration === 1) {
          const result = await generateConfig(spec, trace, iteration)
          config = result.config
          isCustom = result.isCustom
          await trace.flush()
        }
        // (revision happens at end of loop for next iteration)

        yield { event: 'config_draft', data: { iteration } }

        // Validate
        if (isCustom) {
          const codeStr = config as string
          const validation = validateCustomCode(codeStr)
          if (!validation.valid) {
            trace.addStep('validation', { iteration, result: { valid: false, errors: validation.errors } })
            await trace.flush()
            yield { event: 'validation_error', data: { iteration, errors: validation.errors } }

            if (iteration < MAX_ITERATIONS) {
              // Create a synthetic critic result for code validation failures
              const syntheticCritic: CriticResult = {
                pass: false,
                totalScore: 0,
                dimensions: [
                  { name: 'structural_correctness', score: 0, feedback: validation.errors.join('; ') },
                  { name: 'content_accuracy', score: 2, feedback: 'N/A - code validation failed' },
                  { name: 'playability', score: 0, feedback: 'Cannot play - code has errors' },
                  { name: 'educational_value', score: 2, feedback: 'N/A - code validation failed' },
                ],
                revisionInstructions: `Fix these code issues: ${validation.errors.join('. ')}`,
              }

              yield { event: 'revision', data: { iteration, instructions: syntheticCritic.revisionInstructions! } }
              config = await reviseConfig(spec, config, syntheticCritic, isCustom, trace, iteration)
              await trace.flush()
              continue
            }
            // Last iteration — fall through to use best or fail
            break
          }

          // Transpile the validated custom code
          const transpiled = transpileTSX(codeStr)
          if (transpiled.success) {
            customCode = wrapForClientExecution(transpiled.code!)
          }
        } else {
          // JSON config validation
          const validation = validateConfig(spec.gameType as RendererType, config)
          if (!validation.valid) {
            trace.addStep('validation', { iteration, result: { valid: false, errors: validation.errors } })
            await trace.flush()
            yield { event: 'validation_error', data: { iteration, errors: validation.errors } }

            if (iteration < MAX_ITERATIONS) {
              const syntheticCritic: CriticResult = {
                pass: false,
                totalScore: 0,
                dimensions: [
                  { name: 'structural_correctness', score: 0, feedback: validation.errors.join('; ') },
                  { name: 'content_accuracy', score: 2, feedback: 'N/A - schema validation failed' },
                  { name: 'playability', score: 0, feedback: 'Cannot render - invalid config' },
                  { name: 'educational_value', score: 2, feedback: 'N/A - schema validation failed' },
                ],
                revisionInstructions: `Fix these schema validation errors: ${validation.errors.join('. ')}`,
              }

              yield { event: 'revision', data: { iteration, instructions: syntheticCritic.revisionInstructions! } }
              config = await reviseConfig(spec, config, syntheticCritic, isCustom, trace, iteration)
              await trace.flush()
              continue
            }
            break
          }
        }

        trace.addStep('validation', { iteration, result: { valid: true } })

        // Critic evaluation
        const criticResult = await critiqueConfig(spec, config, isCustom, trace, iteration)
        await trace.flush()

        yield {
          event: 'critic_result',
          data: { pass: criticResult.pass, score: criticResult.totalScore, iteration },
        }

        // Track best config
        if (criticResult.totalScore > bestScore) {
          bestScore = criticResult.totalScore
          bestConfig = config
        }

        if (criticResult.pass) {
          // Success!
          const rendererConfig: RendererConfig = isCustom
            ? { type: 'custom', rounds: spec.rounds }
            : { type: spec.gameType, rounds: config } as RendererConfig

          trace.addStep('complete', { finalConfig: rendererConfig ?? '(custom code)' })
          finalized = true
          await trace.finalize()
          yield {
            event: 'complete',
            data: {
              spec,
              config: rendererConfig!,
              customCode: isCustom ? customCode : undefined,
            },
          }
          return
        }

        // Failed critic — revise if more iterations available
        if (iteration < MAX_ITERATIONS && criticResult.revisionInstructions) {
          yield { event: 'revision', data: { iteration, instructions: criticResult.revisionInstructions } }
          config = await reviseConfig(spec, config, criticResult, isCustom, trace, iteration)
          await trace.flush()
        }
      } catch (err) {
        trace.addStep('error', { iteration, error: `Iteration ${iteration} failed: ${err instanceof Error ? err.message : 'Unknown error'}` })
        await trace.flush()
        yield {
          event: 'error',
          data: { message: `Iteration ${iteration} failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
        }

        if (iteration === MAX_ITERATIONS) break
      }
    }

    // Exhausted all iterations — use best config if available
    if (bestConfig) {
      const rendererConfig: RendererConfig = isCustom
        ? { type: 'custom', rounds: spec!.rounds }
        : { type: spec!.gameType, rounds: bestConfig } as RendererConfig

      trace.addStep('complete', { finalConfig: rendererConfig ?? '(custom code — best effort)' })
      finalized = true
      await trace.finalize()
      yield {
        event: 'complete',
        data: {
          spec: spec!,
          config: rendererConfig!,
          customCode: isCustom ? customCode : undefined,
        },
      }
    } else {
      trace.addStep('error', { error: 'Failed to generate a valid game after all iterations' })
      finalized = true
      await trace.finalize('error')
      yield {
        event: 'error',
        data: { message: 'Failed to generate a valid game after all iterations' },
      }
    }
  } finally {
    // Safety net: if we exit without finalizing (unexpected throw, generator abandoned),
    // flush whatever we have so the trace is never lost.
    if (!finalized) {
      trace.addStep('error', { error: 'Pipeline exited unexpectedly without finalizing' })
      await trace.finalize('error')
    }
  }
}
