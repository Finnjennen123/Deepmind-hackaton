// Prompt templates for the game generation pipeline
// Four prompts: Spec (A), Build (B), Critic (C), Revision (D)

import type { DigitalCloneProfile, GameSpec, RendererType, CriticResult } from './types'
import { getRendererCatalog, getRendererSchema } from './renderer-schemas'

// ═══════════════════════════════════════════
//   Prompt A: Game Spec Generator
// ═══════════════════════════════════════════

export function buildSpecPrompt(profile: DigitalCloneProfile, topic?: string): {
  system: string
  user: string
} {
  const catalog = getRendererCatalog()

  const system = `You are an expert educational game designer. Your job is to design a specific, targeted learning game for a student based on their digital profile.

## Design Principles
1. **Frontier testing**: Target the edge of what the student knows. Don't test what they've mastered; probe where their understanding breaks down.
2. **Signal density**: Every interaction should reveal something about the student's understanding. No filler rounds.
3. **Engagement through agency**: Give the student meaningful choices, not just recall questions.
4. **Misconception targeting**: If the profile lists specific misconceptions, design the game to surface and challenge them.

## Available Game Templates

${catalog}

## Output Format

Respond with ONLY valid JSON matching this schema:
{
  "id": "unique-kebab-case-id",
  "title": "Creative Game Title",
  "gameType": "one of the template types above, or 'custom'",
  "concept": "1-2 sentence description of the game idea",
  "pedagogicalGoal": "What understanding does this game test?",
  "whyThisGame": "Why is this mechanic the best choice for this student and topic? (chain of thought)",
  "difficulty": 1-5,
  "rounds": [
    {
      "roundNumber": 1,
      "focus": "What this round specifically tests",
      "contentSeed": "Brief description of the content for this round"
    }
  ],
  "completionRequirements": [
    {
      "id": "req-1",
      "description": "What constitutes success",
      "pseudocode": "score >= 3 out of 5"
    }
  ],
  "customRendererDescription": "ONLY if gameType is 'custom': detailed description of UI, interactions, state transitions"
}

## Few-Shot Examples

### Example 1
**Input profile**: Python beginner who struggles with mutable vs immutable types. Misconception: "lists and tuples are the same thing."
**Input topic**: Python data structures

**Output**:
{
  "id": "reference-trap-python",
  "title": "Reference Trap",
  "gameType": "predictionBet",
  "concept": "Present Python code snippets that exploit reference semantics and mutability. Student predicts output, revealing whether they understand aliasing vs copying.",
  "pedagogicalGoal": "Test whether the student understands that assignment creates references (not copies) for mutable objects, and that mutable/immutable types behave differently.",
  "whyThisGame": "Prediction Bet is ideal here because the student has a specific misconception about mutability. By asking them to predict output of reference-heavy code, we force them to use (and expose) their mental model. The confidence bet reveals how sure they are of their wrong model.",
  "difficulty": 2,
  "rounds": [
    { "roundNumber": 1, "focus": "List aliasing via assignment", "contentSeed": "x = [1,2,3]; y = x; y.append(4); print(x)" },
    { "roundNumber": 2, "focus": "Tuple immutability", "contentSeed": "t = (1,2,3); t[0] = 99" },
    { "roundNumber": 3, "focus": "String immutability vs list mutability", "contentSeed": "s = 'hello'; s[0] = 'H' vs l = list('hello'); l[0] = 'H'" }
  ],
  "completionRequirements": [
    { "id": "req-1", "description": "Student correctly predicts at least 2 of 3 outcomes", "pseudocode": "correctPredictions >= 2" },
    { "id": "req-2", "description": "Student shows calibration improvement", "pseudocode": "later confidence ratings more accurate than earlier ones" }
  ]
}

### Example 2
**Input profile**: WW2 history intermediate learner. Knows broad events but lacks understanding of strategic decision-making.
**Input topic**: Eastern Front strategy

**Output**:
{
  "id": "barbarossa-decision-tree",
  "title": "The Führer's Gambit",
  "gameType": "flowDiagram",
  "concept": "Step through Hitler's key strategic decisions during Operation Barbarossa. At each decision node, choose what happened historically and understand why.",
  "pedagogicalGoal": "Understand that WW2 outcomes were shaped by specific strategic decisions, not just inevitable forces. Grasp why the Eastern Front campaign failed.",
  "whyThisGame": "Flow Diagram lets the student literally walk through the decision tree, experiencing the strategic tradeoffs. This is better than a simple quiz because it shows how earlier decisions constrained later options.",
  "difficulty": 3,
  "rounds": [
    { "roundNumber": 1, "focus": "The decision to divert from Moscow to Kiev", "contentSeed": "Initial advance, Army Group Center vs Ukraine diversion" },
    { "roundNumber": 2, "focus": "Pushing toward Moscow in winter", "contentSeed": "October 1941 decision to continue despite weather" }
  ],
  "completionRequirements": [
    { "id": "req-1", "description": "Student correctly identifies historical decisions at each node", "pseudocode": "correctDecisions >= 3 out of 4" }
  ]
}

### Example 3
**Input profile**: ML intermediate who understands supervised learning but is fuzzy on when models overfit vs underfit.
**Input topic**: Model evaluation and selection

**Output**:
{
  "id": "ml-diagnostic-sort",
  "title": "Model Doctor",
  "gameType": "sortBattle",
  "concept": "Given descriptions of model behaviors and training outcomes, sort them into diagnostic categories: overfitting, underfitting, or good fit.",
  "pedagogicalGoal": "Test whether the student can distinguish overfitting from underfitting based on symptoms, not just definitions.",
  "whyThisGame": "Sort Battle works well because the student needs to CLASSIFY symptoms, which is exactly the skill gap. Many of the symptoms are subtle (e.g., 'training loss still decreasing but validation loss increasing' could be misclassified by someone who only knows the textbook definition).",
  "difficulty": 3,
  "rounds": [
    { "roundNumber": 1, "focus": "Classic overfitting vs underfitting symptoms", "contentSeed": "Training/test accuracy gaps, model complexity indicators" },
    { "roundNumber": 2, "focus": "Subtle cases and remedies", "contentSeed": "Sort remedies (more data, regularization, simpler model) into which problem they fix" },
    { "roundNumber": 3, "focus": "Real-world scenarios", "contentSeed": "Given a description of a model's behavior on a dataset, diagnose the issue" }
  ],
  "completionRequirements": [
    { "id": "req-1", "description": "Student correctly sorts at least 70% of items", "pseudocode": "correctPlacements / totalItems >= 0.7" }
  ]
}`

  const performanceSection = profile.recentPerformance.length > 0
    ? `\n\nRecent game performance:\n${profile.recentPerformance.map(p =>
        `- ${p.game}: ${p.score}/${p.maxScore}${p.notableErrors.length > 0 ? ` (errors: ${p.notableErrors.join(', ')})` : ''}`
      ).join('\n')}`
    : ''

  const topicInstruction = topic
    ? `\n\nThe teacher has specifically requested a game about: "${topic}"`
    : `\n\nChoose the most impactful topic based on the student's gaps and upcoming modules.`

  const user = `Design a game for this student:

Name: ${profile.name}
Subject: ${profile.subject}
Level: ${profile.level}
Context: ${profile.context}

Known strengths: ${profile.knownStrengths.join(', ')}
Known gaps: ${profile.knownGaps.join(', ')}
Misconceptions: ${profile.misconceptions.join(', ') || 'None identified yet'}

Learning style: ${profile.preferredModalities.join(', ')}
Response to challenge: ${profile.responseToChallenge}
Engagement triggers: ${profile.engagementTriggers.join(', ')}

Current module: ${profile.currentModule}
Completed modules: ${profile.modulesCompleted.join(', ')}
Upcoming topics: ${profile.upcomingTopics.join(', ')}${performanceSection}${topicInstruction}`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Prompt B: Config Builder
// ═══════════════════════════════════════════

export function buildConfigPrompt(spec: GameSpec): {
  system: string
  user: string
} {
  if (spec.gameType === 'custom') {
    return buildCustomCodePrompt(spec)
  }

  const schema = getRendererSchema(spec.gameType as RendererType)

  const system = `You are a game content builder. Given a game specification, produce a valid JSON config array that can be directly rendered by the game engine.

## Rules
1. Output ONLY a valid JSON array matching the config schema below. No markdown, no explanation.
2. Every field must be populated. No nulls or empty strings.
3. Content must be factually accurate and educationally sound.
4. Difficulty should match the spec's difficulty level (1=easy, 5=hard).
5. Create exactly ${spec.rounds.length} round(s) in the array.
6. For reference-based fields (IDs, indices), ensure all cross-references are valid.

## Config Schema

${schema}`

  const user = `Build the config for this game:

Title: ${spec.title}
Type: ${spec.gameType}
Concept: ${spec.concept}
Pedagogical goal: ${spec.pedagogicalGoal}
Difficulty: ${spec.difficulty}/5

Rounds:
${spec.rounds.map(r => `- Round ${r.roundNumber}: ${r.focus}\n  Content seed: ${r.contentSeed}`).join('\n')}`

  return { system, user }
}

function buildCustomCodePrompt(spec: GameSpec): {
  system: string
  user: string
} {
  const system = `You are a React component builder for an educational game engine. Write a self-contained React functional component that implements the described game mechanic.

## Runtime Environment
Your code runs inside a sandboxed \`new Function()\` context. The following globals are injected automatically:
- **React** — the full React object (React.createElement is used by JSX)
- **THEME** — a color palette object, already injected as a global. See keys below. Do NOT redefine or redeclare THEME — it is already available.
- **Destructured hooks**: useState, useEffect, useRef, useCallback, useMemo, useReducer, useLayoutEffect, Fragment

You MAY write \`import\` statements for React — they are harmless and will be stripped. Do NOT import anything else; there are no other modules available. Do NOT write \`const THEME = ...\` or \`import { THEME } from ...\` — THEME is pre-injected and ready to use.

## THEME Keys (light cream/orange theme — pre-injected global, e.g. \`THEME.accent\`)
bg (#faf9f7), surface (#f5f3f0), surfaceLight (#ece9e4), border (#ece9e4),
borderHover (#d9d4cd), accent (#ff6b00 orange), accentHover (#e55a00),
text (#1a1a1a dark), textMuted (#999), correct (#00c864 green), correctBg (#ecfdf5),
incorrect (#f44336 red), incorrectBg (#ffebee), warning (#ff9800), warningBg (#fff5eb), white (#ffffff)

## Available CSS Classes (from games.css)
Layout: game-container, game-title, game-subtitle, game-stats, game-actions, round-indicator
Buttons: btn-primary, btn-secondary
Stats: stat, stat-value, stat-label
Feedback: prediction-result correct, prediction-result incorrect, diagram-feedback correct/incorrect/info
Inputs: teach-input, teach-submit, generate-input

## Constraints
1. The component must accept a single prop: \`{ rounds: any[] }\`
2. Use THEME for colors — reference it directly (e.g., \`THEME.accent\`), it is a global
3. NO fetch calls, NO external dependencies, NO network access
4. Maximum 500 lines of code
5. The component should hardcode its game content based on the round descriptions provided — do NOT rely on the rounds prop containing structured data
6. Include round navigation (next round, reset) following the same pattern as existing games
7. The component must be playable and have clear win/lose feedback
8. Use font-family: 'Inter', sans-serif
9. Use border-radius: 10-14px for cards, 10px for buttons
10. Use subtle borders (1px solid THEME.border) not heavy outlines
11. Use subtle shadows (0 1px 3px rgba(0,0,0,0.06)) for cards
12. Primary buttons: dark bg (#1a1a1a), white text. NOT orange bg.
13. Keep the design minimal and warm — this is a learning app, not a gaming app

## Common Pitfalls — AVOID These
- Use \`className\`, never \`class\`, for JSX attributes
- Return a single root element (wrap in \`<div>\` or \`<Fragment>\` if needed)
- Do NOT use \`window\`, \`document\`, or DOM APIs directly
- Do NOT import external libraries — only React is available
- Do NOT use TypeScript syntax (interfaces, type annotations) — write plain JavaScript
- Do NOT use optional chaining on potentially undefined arrays without fallback
- Do NOT declare \`const THEME = { ... }\` — THEME is already a global, just use it directly

## Output Format
Output ONLY the component code as a single default-exported React functional component. No markdown fences. Start with imports.

Example structure:
import React, { useState } from 'react'

export default function CustomGame({ rounds }) {
  // ... state, logic, render
}`

  const user = `Build a React component for this game:

Title: ${spec.title}
Concept: ${spec.concept}
Pedagogical goal: ${spec.pedagogicalGoal}
Difficulty: ${spec.difficulty}/5

Game mechanic description:
${spec.customRendererDescription}

Round content to hardcode into the component:
${spec.rounds.map(r => `- Round ${r.roundNumber}: ${r.focus}\n  Content: ${r.contentSeed}`).join('\n')}

IMPORTANT: Hardcode the round content directly into the component's state or constants. The \`rounds\` prop may be empty — do not depend on it for game data.`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Custom Game: Merged Design + Build Prompt
// ═══════════════════════════════════════════

export function buildCustomGamePrompt(profile: DigitalCloneProfile, topic?: string): {
  system: string
  user: string
} {
  const system = `You are an expert educational game designer AND React developer. Your job is to design AND build a complete, novel, interactive learning game as a single React component.

## CRITICAL: Be Creative
Do NOT make a standard multiple-choice quiz. Do NOT make "pick the right answer from 3 options."
Invent a novel game mechanic. Think: drag-to-sort, spatial puzzles, timed challenges, matching games, interactive diagrams, code-tracing simulations, fill-in-the-blank with validation, debate simulators, categorization with drag targets, sequencing challenges, etc.

## Runtime Environment
Your code runs inside a sandboxed \`new Function()\` context. The following globals are injected automatically:
- **React** — the full React object (React.createElement is used by JSX)
- **THEME** — a color palette object, already injected as a global. Do NOT redefine or redeclare THEME.
- **Destructured hooks**: useState, useEffect, useRef, useCallback, useMemo, useReducer, useLayoutEffect, Fragment

You MAY write \`import\` statements for React — they are harmless and will be stripped. Do NOT import anything else. Do NOT write \`const THEME = ...\` — THEME is pre-injected.

## THEME Keys (light cream/orange theme — reference directly, e.g. THEME.accent)
bg (#faf9f7), surface (#f5f3f0), surfaceLight (#ece9e4), border (#ece9e4),
borderHover (#d9d4cd), accent (#ff6b00 orange), accentHover (#e55a00),
text (#1a1a1a dark), textMuted (#999), correct (#00c864 green), correctBg (#ecfdf5),
incorrect (#f44336 red), incorrectBg (#ffebee), warning (#ff9800), warningBg (#fff5eb), white (#ffffff)

## Available CSS Classes (from games.css)
Layout: game-container, game-title, game-subtitle, game-stats, game-actions, round-indicator
Buttons: btn-primary, btn-secondary
Stats: stat, stat-value, stat-label
Feedback: prediction-result correct, prediction-result incorrect

## Constraints
1. The component must accept a single prop: \`{ rounds: any[] }\`
2. Use THEME for ALL colors — reference it directly (e.g., \`THEME.accent\`), it is a global
3. NO fetch calls, NO external dependencies, NO network access
4. Maximum 500 lines of code
5. Hardcode ALL game content directly in the component — do NOT rely on the rounds prop for data
6. Include round/level navigation and clear win/lose/score feedback
7. The component must be playable and self-contained
8. Use \`className\`, never \`class\`, for JSX attributes
9. Return a single root element
10. Do NOT use \`window\`, \`document\`, or DOM APIs directly
11. Do NOT use TypeScript syntax — write plain JavaScript
12. Do NOT use optional chaining on potentially undefined arrays without fallback
13. Use font-family: 'Inter', sans-serif
14. Use border-radius: 10-14px for cards, 10px for buttons
15. Use subtle borders (1px solid THEME.border) not heavy outlines
16. Use subtle shadows (0 1px 3px rgba(0,0,0,0.06)) for cards
17. Primary buttons: dark bg (#1a1a1a), white text. NOT orange bg.
18. Keep the design minimal and warm — this is a learning app, not a gaming app

## ERRORS THAT WILL REJECT YOUR CODE — Read carefully
1. **FUNCTION SIGNATURE**: Your component MUST be \`export default function GameName({ rounds })\` — the \`{ rounds }\` destructured prop is REQUIRED. Code without it is automatically rejected.
2. **STRING QUOTES**: Use backtick template literals for ANY string containing apostrophes or quotes. NEVER write \`'it's'\` — write \`\\\`it's\\\`\` instead. This is the #1 cause of syntax errors.
3. **THEME**: Do NOT write \`const THEME = {...}\` anywhere. THEME is a pre-injected global. Redeclaring it will crash the game. NEVER define your own THEME object.
4. **NO BROWSER APIs**: Do NOT use \`window.location\`, \`window.alert\`, \`document.*\`, or any browser globals. To "restart" the game, reset state with setState instead.
5. **ARRAY SAFETY**: Before calling \`.map()\`, \`.forEach()\`, \`.filter()\` on any variable, ensure it is initialized as an array. Use \`useState([])\` not \`useState(null)\`.

## Output Format
Output ONLY the component code. No markdown fences, no explanation, no \`\`\` markers. Start DIRECTLY with the import statement:

import React, { useState } from 'react'

export default function YourGameName({ rounds }) {
  // ... your code here
}

## Few-Shot Examples

### Example 1: Drag-and-Sort Challenge
\`\`\`
import React, { useState } from 'react'

export default function SortingLab({ rounds }) {
  const levels = [
    {
      title: "Sort by Execution Order",
      instruction: "Drag these JavaScript operations into the order they execute",
      items: ["console.log('start')", "setTimeout(() => console.log('timeout'), 0)", "Promise.resolve().then(() => console.log('promise'))", "console.log('end')"],
      correctOrder: [0, 3, 2, 1],
      explanation: "Synchronous code runs first, then microtasks (promises), then macrotasks (setTimeout)"
    },
    {
      title: "Sort by Memory Size",
      instruction: "Order these data types from smallest to largest typical memory footprint",
      items: ["boolean", "number (float64)", "empty string", "empty array", "object with 10 keys"],
      correctOrder: [0, 2, 1, 3, 4],
      explanation: "Booleans are 4 bytes, empty strings ~40 bytes, floats 8 bytes, arrays have overhead, objects scale with properties"
    }
  ]

  const [level, setLevel] = useState(0)
  const [items, setItems] = useState(levels[0].items.map((text, i) => ({ text, id: i })))
  const [dragIdx, setDragIdx] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const current = levels[level]

  const moveItem = (fromIdx, toIdx) => {
    if (submitted) return
    const next = [...items]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setItems(next)
  }

  const checkAnswer = () => {
    const isCorrect = items.every((item, idx) => item.id === current.correctOrder[idx])
    if (isCorrect) setScore(s => s + 1)
    setSubmitted(true)
  }

  const nextLevel = () => {
    const next = level + 1
    if (next < levels.length) {
      setLevel(next)
      setItems(levels[next].items.map((text, i) => ({ text, id: i })))
      setSubmitted(false)
    }
  }

  const isCorrect = submitted && items.every((item, idx) => item.id === current.correctOrder[idx])
  const done = level >= levels.length - 1 && submitted

  return (
    <div className="game-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="game-title" style={{ margin: 0 }}>{current.title}</h2>
        <div className="game-stats">
          <div className="stat"><span className="stat-value">{score}</span><span className="stat-label">Score</span></div>
          <div className="stat"><span className="stat-value">{level + 1}/{levels.length}</span><span className="stat-label">Level</span></div>
        </div>
      </div>
      <p className="game-subtitle">{current.instruction}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '1.5rem 0' }}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            draggable={!submitted}
            onDragStart={() => setDragIdx(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIdx !== null) moveItem(dragIdx, idx); setDragIdx(null) }}
            style={{
              padding: '12px 16px',
              background: submitted
                ? (item.id === current.correctOrder[idx] ? THEME.correctBg : THEME.incorrectBg)
                : (dragIdx === idx ? THEME.surfaceLight : THEME.surface),
              border: \`1px solid \${submitted ? (item.id === current.correctOrder[idx] ? THEME.correct : THEME.incorrect) : THEME.border}\`,
              borderRadius: '10px',
              cursor: submitted ? 'default' : 'grab',
              color: THEME.text,
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ color: THEME.textMuted, fontWeight: 600, minWidth: '24px' }}>{idx + 1}.</span>
            <code style={{ fontFamily: 'monospace' }}>{item.text}</code>
          </div>
        ))}
      </div>
      {submitted && (
        <div className={isCorrect ? "prediction-result correct" : "prediction-result incorrect"} style={{ marginBottom: '1rem' }}>
          <strong>{isCorrect ? "Correct!" : "Not quite."}</strong> {current.explanation}
        </div>
      )}
      <div className="game-actions">
        {!submitted && <button className="btn-primary" onClick={checkAnswer}>Check Order</button>}
        {submitted && !done && <button className="btn-primary" onClick={nextLevel}>Next Level</button>}
        {done && <p style={{ color: THEME.accent, fontWeight: 600 }}>Complete! Final score: {score}/{levels.length}</p>}
      </div>
    </div>
  )
}
\`\`\`

### Example 2: Interactive Matching Game
\`\`\`
import React, { useState, useCallback } from 'react'

export default function MatchingPairs({ rounds }) {
  const levels = [
    {
      title: "Match the Logical Fallacy",
      instruction: "Connect each argument to the fallacy it commits",
      left: [
        "Everyone is buying crypto, so it must be a good investment",
        "You can't prove ghosts don't exist, so they must be real",
        "My grandfather smoked and lived to 95, so smoking isn't harmful",
        "If we allow students to redo tests, next they'll want to skip them entirely"
      ],
      right: [
        "Bandwagon fallacy",
        "Argument from ignorance",
        "Anecdotal evidence",
        "Slippery slope"
      ],
      correctPairs: { 0: 0, 1: 1, 2: 2, 3: 3 }
    },
    {
      title: "Match the Time Complexity",
      instruction: "Match each operation to its Big-O complexity",
      left: [
        "Binary search on sorted array",
        "Iterating through a linked list",
        "Hash table lookup (average)",
        "Sorting with merge sort"
      ],
      right: [
        "O(log n)",
        "O(n)",
        "O(1)",
        "O(n log n)"
      ],
      correctPairs: { 0: 0, 1: 1, 2: 2, 3: 3 }
    }
  ]

  const [level, setLevel] = useState(0)
  const [selectedLeft, setSelectedLeft] = useState(null)
  const [matches, setMatches] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const current = levels[level]

  const handleLeftClick = (idx) => {
    if (submitted) return
    setSelectedLeft(selectedLeft === idx ? null : idx)
  }

  const handleRightClick = useCallback((idx) => {
    if (submitted || selectedLeft === null) return
    setMatches(prev => ({ ...prev, [selectedLeft]: idx }))
    setSelectedLeft(null)
  }, [submitted, selectedLeft])

  const checkAnswers = () => {
    let correct = 0
    for (const [left, right] of Object.entries(current.correctPairs)) {
      if (matches[left] === right) correct++
    }
    setScore(s => s + correct)
    setSubmitted(true)
  }

  const nextLevel = () => {
    const next = level + 1
    if (next < levels.length) {
      setLevel(next)
      setMatches({})
      setSelectedLeft(null)
      setSubmitted(false)
    }
  }

  const allMatched = Object.keys(matches).length === current.left.length
  const done = level >= levels.length - 1 && submitted

  return (
    <div className="game-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="game-title" style={{ margin: 0 }}>{current.title}</h2>
        <div className="game-stats">
          <div className="stat"><span className="stat-value">{score}</span><span className="stat-label">Score</span></div>
          <div className="stat"><span className="stat-value">{level + 1}/{levels.length}</span><span className="stat-label">Level</span></div>
        </div>
      </div>
      <p className="game-subtitle">{current.instruction}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '1.5rem 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {current.left.map((item, idx) => {
            const isMatched = idx in matches
            const isSelected = selectedLeft === idx
            const isCorrect = submitted && matches[idx] === current.correctPairs[idx]
            return (
              <div key={idx} onClick={() => handleLeftClick(idx)} style={{
                padding: '12px',
                background: submitted ? (isCorrect ? THEME.correctBg : (isMatched ? THEME.incorrectBg : THEME.surface)) : (isSelected ? THEME.surfaceLight : THEME.surface),
                border: \`1px solid \${isSelected ? THEME.accent : (submitted ? (isCorrect ? THEME.correct : THEME.incorrect) : THEME.border)}\`,
                borderRadius: '10px',
                cursor: submitted ? 'default' : 'pointer',
                color: THEME.text,
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                transition: 'all 0.15s ease',
              }}>
                {item}
                {isMatched && <span style={{ float: 'right', color: THEME.accent }}>{current.right[matches[idx]]}</span>}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {current.right.map((item, idx) => {
            const isTarget = Object.values(matches).includes(idx)
            return (
              <div key={idx} onClick={() => handleRightClick(idx)} style={{
                padding: '12px',
                background: isTarget ? THEME.surfaceLight : THEME.surface,
                border: \`1px solid \${isTarget ? THEME.accent : THEME.border}\`,
                borderRadius: '10px',
                cursor: submitted ? 'default' : 'pointer',
                color: THEME.text,
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}>
                {item}
              </div>
            )
          })}
        </div>
      </div>
      <div className="game-actions">
        {!submitted && <button className="btn-primary" onClick={checkAnswers} disabled={!allMatched}>Check Matches</button>}
        {submitted && !done && <button className="btn-primary" onClick={nextLevel}>Next Level</button>}
        {done && <p style={{ color: THEME.accent, fontWeight: 600 }}>Complete! Final score: {score}/{current.left.length * levels.length}</p>}
      </div>
    </div>
  )
}
\`\`\`

## Design Principles
1. **Frontier testing**: Target the edge of what the student knows. Probe where understanding breaks down.
2. **Signal density**: Every interaction should reveal something about understanding. No filler.
3. **Engagement through agency**: Give meaningful choices, not just recall questions.
4. **Misconception targeting**: If the profile lists specific misconceptions, design the game to surface and challenge them.`

  const performanceSection = profile.recentPerformance.length > 0
    ? `\n\nRecent game performance:\n${profile.recentPerformance.map(p =>
        `- ${p.game}: ${p.score}/${p.maxScore}${p.notableErrors.length > 0 ? ` (errors: ${p.notableErrors.join(', ')})` : ''}`
      ).join('\n')}`
    : ''

  const topicInstruction = topic
    ? `\nTopic requested by teacher: "${topic}"`
    : `\nChoose the most impactful topic based on the student's gaps and upcoming modules.`

  const user = `Design and build a complete, novel, interactive educational game for this student.

## Student Profile
Name: ${profile.name}
Subject: ${profile.subject}
Level: ${profile.level}
Context: ${profile.context}

Known strengths: ${profile.knownStrengths.join(', ')}
Known gaps: ${profile.knownGaps.join(', ')}
Misconceptions: ${profile.misconceptions.join(', ') || 'None identified yet'}

Learning style: ${profile.preferredModalities.join(', ')}
Response to challenge: ${profile.responseToChallenge}
Engagement triggers: ${profile.engagementTriggers.join(', ')}

Current module: ${profile.currentModule}
Upcoming topics: ${profile.upcomingTopics.join(', ')}${performanceSection}${topicInstruction}

## Requirements
1. Invent a CREATIVE game mechanic — NOT a standard multiple-choice quiz
2. Hardcode 3-5 rounds/levels of content directly in the component
3. Content should target the student's known gaps and misconceptions
4. Include scoring, feedback, and round progression
5. Output ONLY the React component code — no explanation`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Prompt C: Critic
// ═══════════════════════════════════════════

export function buildCriticPrompt(spec: GameSpec, config: unknown, isCustomCode: boolean): {
  system: string
  user: string
} {
  const system = `You are a quality assurance critic for educational games. Evaluate the given game config on 4 dimensions, each scored 0-3.

## Rubric

### 1. Structural Correctness (0-3)
- 0: Missing required fields, broken references, crashes
- 1: Has structure but with errors (wrong indices, missing IDs)
- 2: Structurally valid with minor issues
- 3: Perfect structure, all cross-references valid

### 2. Content Accuracy (0-3)
- 0: Contains factual errors or wrong answers marked as correct
- 1: Mostly accurate but some answers are debatable or wrong
- 2: Accurate with minor imprecisions
- 3: All content is factually correct and precisely stated

### 3. Playability (0-3)
- 0: Unplayable (no challenge nodes, impossible to complete)
- 1: Playable but confusing or frustrating UX
- 2: Plays well with minor issues
- 3: Smooth, engaging experience

### 4. Educational Value (0-3)
- 0: Doesn't test the stated pedagogical goal
- 1: Loosely related to the goal
- 2: Tests the goal but could be more targeted
- 3: Precisely targets the pedagogical goal, every round adds signal

## Pass Criteria
- ALL dimensions must score >= 2
- Total score must be >= 10 out of 12

## Output Format
Respond with ONLY valid JSON:
{
  "pass": true/false,
  "totalScore": number,
  "dimensions": [
    { "name": "structural_correctness", "score": 0-3, "feedback": "specific feedback" },
    { "name": "content_accuracy", "score": 0-3, "feedback": "specific feedback" },
    { "name": "playability", "score": 0-3, "feedback": "specific feedback" },
    { "name": "educational_value", "score": 0-3, "feedback": "specific feedback" }
  ],
  "revisionInstructions": "If fail: specific, actionable list of what to fix. If pass: omit this field."
}`

  const configStr = isCustomCode
    ? `[Custom React Component Code]\n${config}`
    : JSON.stringify(config, null, 2)

  const user = `Evaluate this game:

## Game Spec
Title: ${spec.title}
Type: ${spec.gameType}
Concept: ${spec.concept}
Pedagogical Goal: ${spec.pedagogicalGoal}
Difficulty: ${spec.difficulty}/5

## Generated Config
${configStr}

Check carefully:
- Are all "correct" answers actually correct?
- Do all cross-references (IDs, indices) resolve?
- Is the difficulty appropriate?
- Does every round contribute to the pedagogical goal?`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Prompt D: Revision
// ═══════════════════════════════════════════

export function buildRevisionPrompt(
  spec: GameSpec,
  currentConfig: unknown,
  criticResult: CriticResult,
  isCustomCode: boolean
): {
  system: string
  user: string
} {
  const system = isCustomCode
    ? `You are fixing a React component for an educational game. Apply ONLY the specific fixes listed below. Do not change anything else. Output the complete fixed component code. No markdown fences.`
    : `You are fixing a game config JSON. Apply ONLY the specific fixes listed below. Do not change anything else. Output ONLY the fixed JSON array. No markdown, no explanation.`

  const configStr = isCustomCode
    ? `${currentConfig}`
    : JSON.stringify(currentConfig, null, 2)

  const user = `Fix this game config:

## Game Spec
Title: ${spec.title}
Type: ${spec.gameType}

## Current Config
${configStr}

## Critic Scores
${criticResult.dimensions.map(d => `- ${d.name}: ${d.score}/3 — ${d.feedback}`).join('\n')}

## Required Fixes
${criticResult.revisionInstructions}

Apply ONLY these fixes. Do not change anything else.`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Custom Game: Fix Prompt (uses edit tools)
// ═══════════════════════════════════════════

export function buildCustomFixPrompt(
  currentCode: string,
  errorMessage: string,
): {
  system: string
  user: string
} {
  const system = `You are fixing a React component for an educational game. You have three editing tools available:

1. **search_replace** — Find exact text and replace it. Use for targeted edits and deletions.
2. **insert_after** — Insert new code after a matched anchor line.
3. **full_rewrite** — Replace the entire component. Use ONLY when you need more than 5 individual edits.

## Runtime Environment
- THEME is a pre-injected global. Do NOT declare \`const THEME = ...\`.
- THEME keys (light cream/orange palette): bg (#faf9f7), surface (#f5f3f0), surfaceLight (#ece9e4), border (#ece9e4), borderHover (#d9d4cd), accent (#ff6b00 orange), accentHover (#e55a00), text (#1a1a1a dark), textMuted (#999), correct (#00c864 green), correctBg (#ecfdf5), incorrect (#f44336 red), incorrectBg (#ffebee), warning (#ff9800), warningBg (#fff5eb), white (#ffffff)
- React hooks (useState, useEffect, etc.) are destructured globals.
- The component receives \`{ rounds: any[] }\` as its prop.

## Rules
- Fix ONLY the error described below. Do not change anything else.
- Do NOT output any text explanation — use ONLY the tools.
- Preserve indentation exactly when writing search/replace text.`

  const numberedCode = currentCode
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
    .join('\n')

  const user = `Fix this React component. It has the following error:

## Error
${errorMessage}

## Current Code (with line numbers for reference)
${numberedCode}

Use the editing tools to fix ONLY this error.`

  return { system, user }
}

// ═══════════════════════════════════════════
//   Prompt D (tool-aware): Revision for custom code
// ═══════════════════════════════════════════

function addLineNumbers(code: string): string {
  return code
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
    .join('\n')
}

export function buildRevisionPromptWithTools(
  spec: GameSpec,
  currentCode: string,
  criticResult: CriticResult,
): {
  system: string
  user: string
} {
  const system = `You are fixing a React component for an educational game. You have three editing tools available:

1. **search_replace** — Find exact text and replace it. Use for targeted edits and deletions. The search text must match exactly (including whitespace/indentation). It must appear exactly once in the code.
2. **insert_after** — Insert new code after a matched anchor line. The anchor is matched by trimming whitespace. It must appear exactly once.
3. **full_rewrite** — Replace the entire component. Use ONLY when you need more than 5 individual edits. If you use this, all other edits are ignored.

## Rules
- Prefer search_replace for most fixes — it is the most precise
- Use insert_after when adding new code blocks (functions, state declarations, JSX sections)
- Use full_rewrite ONLY as a last resort for extensive changes
- Do NOT output any text explanation — use ONLY the tools
- Preserve indentation exactly when writing search/replace text
- Each search_replace match must be unique in the code — include enough surrounding context to disambiguate`

  const numberedCode = addLineNumbers(currentCode)

  const user = `Fix this React component:

## Game Spec
Title: ${spec.title}
Concept: ${spec.concept}

## Current Code (with line numbers for reference)
${numberedCode}

## Critic Scores
${criticResult.dimensions.map(d => `- ${d.name}: ${d.score}/3 — ${d.feedback}`).join('\n')}

## Required Fixes
${criticResult.revisionInstructions}

Use the editing tools to apply ONLY these fixes. Do not change anything else.`

  return { system, user }
}
