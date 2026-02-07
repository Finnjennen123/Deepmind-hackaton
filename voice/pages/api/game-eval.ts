import type { NextApiRequest, NextApiResponse } from 'next'
import { callLLM } from '../../lib/llm'

// ═══════════════════════════════════════════
//   Teach the Bot — evaluate learner response
// ═══════════════════════════════════════════

interface TeachEvaluateRequest {
  type: 'teach-evaluate'
  topic: string
  statement: string
  isWrong: boolean
  whatsWrong?: string
  hint?: string
  userResponse: string
}

async function handleTeachEvaluate(body: TeachEvaluateRequest) {
  const { topic, statement, isWrong, whatsWrong, userResponse } = body

  const systemPrompt = `You are evaluating a learner's response in an educational game called "Teach the Bot".

A bot made this statement about ${topic}:
"${statement}"

${isWrong
    ? `This statement IS WRONG. The actual error: ${whatsWrong}`
    : `This statement is CORRECT.`
  }

The learner responded: "${userResponse}"

Your job: Evaluate whether the learner correctly handled this.
- If the statement was wrong: Did the learner identify the error and explain it reasonably well?
- If the statement was correct: Did the learner correctly confirm it (not flag a non-existent error)?

Respond with ONLY valid JSON, no markdown:
{"caught": true/false, "feedback": "1-2 sentence feedback as the teaching system"}`

  const response = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userResponse },
    ],
    tools: [],
  })

  const text = response.choices[0]?.message?.content || ''

  try {
    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Fallback if JSON parsing fails
  }

  // Fallback: guess from the text
  return {
    caught: text.toLowerCase().includes('"caught": true') || text.toLowerCase().includes('"caught":true'),
    feedback: text.slice(0, 200),
  }
}

// ═══════════════════════════════════════════
//   Post-game debrief
// ═══════════════════════════════════════════

interface DebriefRequest {
  type: 'debrief'
  game: string
  topic: string
  score: number
  totalRounds: number
  details: string // game-specific summary
}

async function handleDebrief(body: DebriefRequest) {
  const { game, topic, score, totalRounds, details } = body

  const systemPrompt = `You are a learning coach giving a brief post-game insight to a student.

Game: ${game}
Topic: ${topic}
Score: ${score}/${totalRounds}
Details: ${details}

Give a 2-3 sentence personalized insight. Be encouraging but honest. If there are patterns in their mistakes, mention them. If they did well, acknowledge what they demonstrated. Keep it conversational and specific — no generic "great job" filler.

Respond with ONLY valid JSON:
{"insight": "your 2-3 sentence insight here"}`

  const response = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Give me my debrief.' },
    ],
    tools: [],
  })

  const text = response.choices[0]?.message?.content || ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // Fallback
  }

  return { insight: text.slice(0, 300) }
}

// ═══════════════════════════════════════════
//   Diagram game evaluations
// ═══════════════════════════════════════════

interface DiagramEvalRequest {
  type: 'node-graph-eval' | 'spatial-map-eval' | 'timeline-eval' | 'flow-diagram-eval'
  game: string
  title: string
  score: number
  total: number
  details: string
}

async function handleDiagramEval(body: DiagramEvalRequest) {
  const { game, title, score, total, details } = body

  const systemPrompt = `You are a learning coach giving feedback on a diagram-based educational game.

Game: ${game}
Challenge: ${title}
Score: ${score}/${total}
Details: ${details}

Give 2-3 sentences of specific, personalized feedback. Reference the actual content they got right/wrong. Be encouraging but honest. No generic filler.

Respond with ONLY valid JSON:
{"feedback": "your 2-3 sentence feedback here"}`

  try {
    const response = await callLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Give me feedback on my performance.' },
      ],
      tools: [],
    })

    const text = response.choices[0]?.message?.content || ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {
      // Fallback
    }

    return { feedback: text.slice(0, 300) }
  } catch {
    // Fallback if LLM call fails entirely
    if (score === total) {
      return { feedback: `Perfect score on "${title}"! You clearly understand this material well.` }
    }
    return { feedback: `You got ${score} out of ${total} on "${title}". Review the incorrect answers and try again to solidify your understanding.` }
  }
}

// ═══════════════════════════════════════════
//   Handler
// ═══════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type } = req.body

    if (type === 'teach-evaluate') {
      const result = await handleTeachEvaluate(req.body)
      return res.status(200).json(result)
    }

    if (type === 'debrief') {
      const result = await handleDebrief(req.body)
      return res.status(200).json(result)
    }

    if (
      type === 'node-graph-eval' ||
      type === 'spatial-map-eval' ||
      type === 'timeline-eval' ||
      type === 'flow-diagram-eval'
    ) {
      const result = await handleDiagramEval(req.body)
      return res.status(200).json(result)
    }

    return res.status(400).json({ error: `Unknown evaluation type: ${type}` })
  } catch (error) {
    console.error('Game eval error:', error)
    return res.status(500).json({ error: 'Evaluation failed' })
  }
}
