// TSX transpilation and sandboxed rendering for custom game components

import { transform } from 'sucrase'
import React from 'react'
import ReactDOMServer from 'react-dom/server'

// Import THEME so testRender can inject it (same object the client uses)
import { THEME } from '../../components/diagrams/shared'

/**
 * Strip markdown code fences from LLM output.
 * Handles ```js, ```jsx, ```typescript, etc. and bare ```.
 */
export function stripCodeFences(code: string): string {
  let stripped = code.trim()
  // Remove opening fence: ```lang or just ```
  stripped = stripped.replace(/^```[\w]*\s*\n?/, '')
  // Remove closing fence
  stripped = stripped.replace(/\n?```\s*$/, '')
  return stripped.trim()
}

export interface TranspileResult {
  success: boolean
  code?: string
  error?: string
}

/**
 * Transpile TSX source code to plain JavaScript.
 * Runs server-side (in API route or orchestrator).
 */
export function transpileTSX(source: string): TranspileResult {
  try {
    const result = transform(source, {
      transforms: ['typescript', 'jsx'],
      jsxRuntime: 'classic',
      production: true,
    })
    return { success: true, code: result.code }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Transpilation failed',
    }
  }
}

/**
 * Validate that generated component code follows required patterns.
 * Checks for: default export, rounds prop, no forbidden APIs.
 */
export function validateCustomCode(source: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check for default export
  if (!/export\s+default\s+function/.test(source)) {
    errors.push('Component must have a default export function')
  }

  // Check for rounds prop
  if (!/rounds/.test(source)) {
    errors.push('Component must accept a "rounds" prop')
  }

  // Check line count
  const lineCount = source.split('\n').length
  if (lineCount > 500) {
    errors.push(`Component is ${lineCount} lines (max 500)`)
  }

  // Check for forbidden APIs
  const forbidden = [
    { pattern: /\bfetch\s*\(/, name: 'fetch()' },
    { pattern: /\bXMLHttpRequest\b/, name: 'XMLHttpRequest' },
    { pattern: /\beval\s*\(/, name: 'eval()' },
    { pattern: /\bnew\s+Function\b/, name: 'new Function()' },
    { pattern: /\bimport\s*\(/, name: 'dynamic import()' },
    { pattern: /\blocalStorage\b/, name: 'localStorage' },
    { pattern: /\bsessionStorage\b/, name: 'sessionStorage' },
    { pattern: /\bwindow\b/, name: 'window' },
    { pattern: /\bdocument\b/, name: 'document' },
  ]

  for (const { pattern, name } of forbidden) {
    if (pattern.test(source)) {
      errors.push(`Forbidden API used: ${name}`)
    }
  }

  // Try to transpile
  const transpiled = transpileTSX(source)
  if (!transpiled.success) {
    errors.push(`Syntax error: ${transpiled.error}`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Strip `const/let/var THEME = { ... }` declarations, including multi-line ones.
 * Uses brace-depth counting so nested objects don't fool it.
 */
function stripThemeDeclaration(code: string): string {
  const pattern = /^(?:const|let|var)\s+THEME\s*=\s*\{/gm
  let match: RegExpExecArray | null
  while ((match = pattern.exec(code)) !== null) {
    // Find the matching closing brace by counting depth
    let depth = 1
    let i = match.index + match[0].length
    while (i < code.length && depth > 0) {
      if (code[i] === '{') depth++
      else if (code[i] === '}') depth--
      i++
    }
    // Consume optional semicolon and trailing whitespace/newline
    while (i < code.length && (code[i] === ';' || code[i] === ' ' || code[i] === '\t')) i++
    if (i < code.length && code[i] === '\n') i++

    code = code.slice(0, match.index) + code.slice(i)
    pattern.lastIndex = match.index // re-scan from same position
  }
  return code
}

/**
 * Create a sandboxed module from transpiled JS code.
 * Returns a function that creates the React component when called with React.
 *
 * Used client-side: the transpiled code is wrapped to receive React and THEME
 * as dependencies rather than importing them.
 */
export function wrapForClientExecution(transpiledCode: string): string {
  let code = transpiledCode

  // Remove import statements — deps are injected via new Function params.
  // Multi-line imports (e.g. `import {\n  useState\n} from 'react'`) need the
  // multiline-aware pattern first, then single-line as fallback.
  code = code.replace(/^import\s+[\s\S]*?\s+from\s+['"].*?['"];?\s*$/gm, '')
  code = code.replace(/^(?:const|let|var)\s+.*?=\s*require\(.*?\);?\s*$/gm, '')

  // Remove LLM-defined THEME declarations — THEME is injected as a Function parameter.
  code = stripThemeDeclaration(code)

  // Convert export default to exports.default assignment
  code = code.replace(/export\s+default\s+function\s+/, 'exports.default = function ')
  code = code.replace(/export\s+default\s+/, 'exports.default = ')

  // Destructure hooks from the React global (provided by new Function params)
  const hooksPreamble = 'const { useState, useEffect, useRef, useCallback, useMemo, useReducer, useLayoutEffect, Fragment } = React;\n'

  return hooksPreamble + code
}

// ═══════════════════════════════════════════
//   Server-side test render
// ═══════════════════════════════════════════

export interface TestRenderResult {
  success: boolean
  error?: string
}

/**
 * Test-render a wrapped custom component server-side.
 * Executes `new Function()` with React + THEME (same as the client),
 * then calls React.createElement() to catch render-time errors
 * like undefined variables, THEME redeclaration, hook issues, etc.
 *
 * Does NOT catch errors triggered only by user interaction.
 */
export function testRender(wrappedCode: string): TestRenderResult {
  try {
    // Same factory construction as GamePlayer.tsx client-side
    // eslint-disable-next-line no-new-func
    const factory = new Function('React', 'THEME', `
      const exports = {};
      ${wrappedCode}
      return exports.default || null;
    `)

    const Comp = factory(React, THEME)

    if (typeof Comp !== 'function') {
      return { success: false, error: 'Generated code did not produce a valid React component (not a function)' }
    }

    // renderToString actually INVOKES the component function,
    // catching runtime errors like .map() on undefined, THEME
    // redeclaration, missing variables, bad JSX, etc.
    // (React.createElement only creates a descriptor, never calls the function.)
    ReactDOMServer.renderToString(React.createElement(Comp, { rounds: [] }))

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error during test render',
    }
  }
}
