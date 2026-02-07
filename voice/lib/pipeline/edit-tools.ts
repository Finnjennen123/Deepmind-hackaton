// Code editing tools for surgical revision of custom game components
// Used by the Revision (D) step when revising custom code

import type { Tool, ToolCall } from '../llm'

// ═══════════════════════════════════════════
//   Tool schemas (OpenAI function calling format)
// ═══════════════════════════════════════════

export const CODE_EDIT_TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'search_replace',
      description:
        'Find an exact text match in the current code and replace it. Use for edits and deletions (replace with empty string to delete). The search text must match exactly — including whitespace and indentation.',
      parameters: {
        type: 'object',
        properties: {
          search: {
            type: 'string',
            description: 'The exact text to find in the current code. Must be unique — if it appears more than once the edit is skipped.',
          },
          replace: {
            type: 'string',
            description: 'The replacement text. Use an empty string to delete the matched text.',
          },
        },
        required: ['search', 'replace'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'insert_after',
      description:
        'Insert new code immediately after a matched anchor line. The anchor must be a single, complete line (trimmed) that appears exactly once in the code.',
      parameters: {
        type: 'object',
        properties: {
          anchor: {
            type: 'string',
            description: 'An exact line of code to anchor on. Must be unique in the file.',
          },
          code: {
            type: 'string',
            description: 'The new code to insert after the anchor line.',
          },
        },
        required: ['anchor', 'code'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'full_rewrite',
      description:
        'Replace the entire component code. Use ONLY when the changes are too extensive for targeted edits (more than 5 individual edits needed). This is the escape hatch — prefer search_replace and insert_after for smaller fixes.',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The complete rewritten component code.',
          },
        },
        required: ['code'],
        additionalProperties: false,
      },
    },
  },
]

// ═══════════════════════════════════════════
//   Edit application
// ═══════════════════════════════════════════

interface EditError {
  tool: string
  index: number
  message: string
}

export interface EditResult {
  code: string
  appliedCount: number
  errors: EditError[]
  wasFullRewrite: boolean
}

export function applyToolEdits(originalCode: string, toolCalls: ToolCall[]): EditResult {
  const errors: EditError[] = []

  // Check if any tool call is a full_rewrite — it takes precedence
  const fullRewrite = toolCalls.find(tc => tc.function.name === 'full_rewrite')
  if (fullRewrite) {
    try {
      const args = JSON.parse(fullRewrite.function.arguments)
      return { code: args.code, appliedCount: 1, errors: [], wasFullRewrite: true }
    } catch (err) {
      return {
        code: originalCode,
        appliedCount: 0,
        errors: [{ tool: 'full_rewrite', index: 0, message: `Invalid JSON arguments: ${err instanceof Error ? err.message : 'parse error'}` }],
        wasFullRewrite: true,
      }
    }
  }

  // Apply edits sequentially — each operates on the result of the previous
  let code = originalCode
  let appliedCount = 0

  for (let i = 0; i < toolCalls.length; i++) {
    const tc = toolCalls[i]
    const toolName = tc.function.name

    let args: Record<string, string>
    try {
      args = JSON.parse(tc.function.arguments)
    } catch (err) {
      errors.push({ tool: toolName, index: i, message: `Invalid JSON arguments: ${err instanceof Error ? err.message : 'parse error'}` })
      continue
    }

    if (toolName === 'search_replace') {
      const { search, replace } = args
      if (!search) {
        errors.push({ tool: toolName, index: i, message: 'Empty search string' })
        continue
      }

      // Count occurrences to enforce uniqueness
      const occurrences = countOccurrences(code, search)
      if (occurrences === 0) {
        errors.push({ tool: toolName, index: i, message: `Search text not found: "${truncate(search, 80)}"` })
        continue
      }
      if (occurrences > 1) {
        errors.push({ tool: toolName, index: i, message: `Ambiguous match: search text appears ${occurrences} times — must be unique` })
        continue
      }

      code = code.replace(search, replace)
      appliedCount++
    } else if (toolName === 'insert_after') {
      const { anchor, code: newCode } = args
      if (!anchor) {
        errors.push({ tool: toolName, index: i, message: 'Empty anchor string' })
        continue
      }

      // Find the anchor line — match trimmed lines
      const lines = code.split('\n')
      const trimmedAnchor = anchor.trim()
      const matchingIndices = lines
        .map((line, idx) => line.trim() === trimmedAnchor ? idx : -1)
        .filter(idx => idx !== -1)

      if (matchingIndices.length === 0) {
        errors.push({ tool: toolName, index: i, message: `Anchor line not found: "${truncate(anchor, 80)}"` })
        continue
      }
      if (matchingIndices.length > 1) {
        errors.push({ tool: toolName, index: i, message: `Ambiguous anchor: line appears ${matchingIndices.length} times — must be unique` })
        continue
      }

      // Insert after the matched line
      lines.splice(matchingIndices[0] + 1, 0, newCode)
      code = lines.join('\n')
      appliedCount++
    } else {
      errors.push({ tool: toolName, index: i, message: `Unknown tool: ${toolName}` })
    }
  }

  return { code, appliedCount, errors, wasFullRewrite: false }
}

// ═══════════════════════════════════════════
//   Helpers
// ═══════════════════════════════════════════

function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  let pos = 0
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++
    pos += needle.length
  }
  return count
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '...'
}
