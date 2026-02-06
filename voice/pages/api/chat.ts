import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import {
  ONBOARDING_PROMPT,
  PROFILING_PROMPT,
  onboardingTools,
  profilingTools,
  OnboardingResult,
  ProfilingResult,
  LearnerProfile
} from '../../lib/prompts'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ConversationState {
  messages: Message[]
  phase: 'onboarding' | 'profiling' | 'complete'
  onboardingResult?: OnboardingResult
  profilingResult?: ProfilingResult
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages: clientMessages, phase: clientPhase, onboardingResult: clientOnboardingResult } = req.body as {
      messages: Message[]
      phase?: 'onboarding' | 'profiling' | 'complete'
      onboardingResult?: OnboardingResult
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' })
    }

    // Determine current phase
    let phase = clientPhase || 'onboarding'
    let onboardingResult = clientOnboardingResult

    // Build messages with the appropriate system prompt
    const systemPrompt = phase === 'onboarding' ? ONBOARDING_PROMPT : PROFILING_PROMPT
    const tools = phase === 'onboarding' ? onboardingTools : profilingTools

    // Build the full messages array with system prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...clientMessages
    ]

    // If transitioning to profiling, add a hidden instruction
    if (phase === 'profiling' && clientMessages.length > 0) {
      // Check if we already have the transition message
      const hasTransition = clientMessages.some(m =>
        m.role === 'user' && m.content.includes('[SYSTEM: Onboarding phase complete')
      )
      if (!hasTransition && onboardingResult) {
        // Insert transition message before the last user message
        fullMessages.splice(fullMessages.length - 1, 0, {
          role: 'user',
          content: "[SYSTEM: Onboarding phase complete. You now know what they want to learn and why. Continue the conversation naturally to figure out their current level and how deep the course should go. Don't start with a new greeting - just continue the flow.]"
        })
      }
    }

    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: fullMessages,
        tools: tools,
        tool_choice: "auto",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenRouter error:', errorText)
      return res.status(500).json({ error: 'OpenRouter API error' })
    }

    const data = await response.json()
    const choice = data.choices?.[0]
    const message = choice?.message

    if (!message) {
      return res.status(500).json({ error: 'No response from model' })
    }

    // Check for tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0]
      const toolArgs = JSON.parse(toolCall.function.arguments)

      if (toolCall.function.name === 'complete_onboarding') {
        // Transition to profiling phase
        return res.status(200).json({
          type: 'phase_transition',
          newPhase: 'profiling',
          onboardingResult: toolArgs as OnboardingResult,
          // Request another turn immediately
          continueConversation: true
        })
      }

      if (toolCall.function.name === 'complete_profiling') {
        const profilingResult = toolArgs as ProfilingResult

        // Save the learner profile
        const learnerProfile: LearnerProfile = {
          subject: onboardingResult?.subject || '',
          reason: onboardingResult?.reason || '',
          summary: onboardingResult?.summary || '',
          onboarding_summary: onboardingResult?.summary || '',
          starting_level: profilingResult.starting_level,
          depth: profilingResult.depth,
          focus_areas: profilingResult.focus_areas,
          skip_areas: profilingResult.skip_areas,
          learner_context: profilingResult.learner_context,
          notes: profilingResult.notes
        }

        const profilePath = path.join(process.cwd(), 'learner_profile.json')
        fs.writeFileSync(profilePath, JSON.stringify(learnerProfile, null, 2))
        console.log('Saved learner profile to:', profilePath)

        return res.status(200).json({
          type: 'complete',
          text: profilingResult.final_message,
          learnerProfile
        })
      }
    }

    // Regular text response - stream it back
    const text = message.content || ''

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.write(text)
    res.end()

  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Error processing request' })
  }
}
