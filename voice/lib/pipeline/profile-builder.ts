// Convert a LearnerProfile (from voice onboarding) to a DigitalCloneProfile (for game pipeline)

import type { LearnerProfile } from '../prompts'
import type { DigitalCloneProfile } from './types'
import { MOCK_COURSE } from '../mock-course'

function mapLevel(startingLevel: string): 'beginner' | 'intermediate' | 'advanced' {
  const lower = startingLevel.toLowerCase()
  if (lower.includes('advanced') || lower.includes('expert')) return 'advanced'
  if (lower.includes('intermediate') || lower.includes('some')) return 'intermediate'
  return 'beginner'
}

function splitList(str: string | undefined): string[] {
  if (!str) return []
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

export function buildDigitalCloneProfile(
  learner: LearnerProfile,
  name?: string
): DigitalCloneProfile {
  const phaseTitles = MOCK_COURSE.phases.flatMap(p => p.parts.map(pt => pt.title))

  return {
    name: name || 'Learner',
    subject: learner.subject,
    level: mapLevel(learner.starting_level),
    context: [learner.learner_context, learner.reason].filter(Boolean).join('. ') || learner.summary,

    knownStrengths: splitList(learner.skip_areas),
    knownGaps: splitList(learner.focus_areas),
    misconceptions: [],

    preferredModalities: ['hands-on', 'visual'],
    responseToChallenge: 'Engages thoughtfully with challenging material',
    engagementTriggers: ['real-world applications', 'interactive exercises'],

    recentPerformance: [],

    currentModule: phaseTitles[0] || learner.subject,
    modulesCompleted: [],
    upcomingTopics: phaseTitles.slice(1),
  }
}
