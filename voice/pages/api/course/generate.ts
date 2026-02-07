import type { NextApiRequest, NextApiResponse } from 'next';
import { COURSE_STRUCTURE_SYSTEM_PROMPT, LearnerProfile } from '../../../lib/prompts';
import { callLLM } from '../../../lib/llm';
import { searchWeb, SearchResult } from '../../../lib/web-search';

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const profile = req.body as LearnerProfile;
    
    if (!profile.subject) {
      return res.status(400).json({ error: 'Missing subject in learner profile' });
    }

    console.log('[COURSE_GEN] Starting generation for subject:', profile.subject);

    // 1. Perform web search to get latest context
    // SKIP SEARCH to speed up generation for now
    let searchResults: SearchResult[] = [];
    /*
    try {
      console.log('[COURSE_GEN] Searching web for:', profile.subject);
      searchResults = await searchWeb(profile.subject);
    } catch (e) {
      console.warn('[COURSE_GEN] Web search failed, proceeding without:', e);
    }
    */

    // 2. Prepare the prompt inputs
    const brain = {
      subject: profile.subject,
      reason: profile.reason,
      summary: profile.summary,
      starting_level: profile.starting_level,
      depth: profile.depth,
      focus_areas: profile.focus_areas,
      skip_areas: profile.skip_areas,
      learner_context: profile.learner_context,
      notes: profile.notes
    };

    const searchContext = searchResults.map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippets.join(' ')}`).join('\n\n');

    const userMessage = `
Here is the LEARNER BRAIN:
${JSON.stringify(brain, null, 2)}

Here is the WEB RESEARCH:
${searchContext}

Design the course structure now.
    `.trim();

    // 3. Call LLM
    console.log('[COURSE_GEN] Calling LLM...');
    // console.log('[COURSE_GEN] Brain context:', JSON.stringify(brain, null, 2)); // Add this log
    const response = await callLLM({
      messages: [
        { role: 'system', content: COURSE_STRUCTURE_SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error('No content received from LLM');
    }

    let courseStructure;
    try {
      courseStructure = JSON.parse(content);
    } catch (e) {
      console.error('[COURSE_GEN] Failed to parse JSON:', content);
      return res.status(500).json({ error: 'Failed to parse generated course structure' });
    }

    console.log('[COURSE_GEN] Success!');
    
    // Adapt to UI Course type
    const uiCourse = {
      title: courseStructure.title,
      subject: profile.subject,
      phases: courseStructure.phases.map((p: any, i: number) => ({
        id: `phase_${i + 1}`,
        title: p.title,
        description: p.description,
        parts: p.lessons.map((l: any, j: number) => ({
          id: `part_${i + 1}_${j + 1}`,
          title: l.title,
          content: '', // Will be generated later
          mastery_criteria: '', // Will be generated later
          status: (i === 0 && j === 0) ? 'not_started' : 'locked',
          instructional_seed: l.instructional_seed
        }))
      }))
    };

    // ── SAVE TO BRAIN FILE (per user request) ──
    try {
      // Construct the full brain object
      const brainData = {
        brain: {
          high_level: {
            onboarding: {
              subject: profile.subject,
              why: profile.reason,
              summary: profile.summary
            },
            profiling: {
              starting_level: profile.starting_level,
              depth: profile.depth,
              focus_areas: profile.focus_areas,
              skip_areas: profile.skip_areas,
              learner_context: profile.learner_context,
              notes: profile.notes
            },
            generated_at: new Date().toISOString()
          },
          course_structure: courseStructure, // Keep the original structure for the brain file
          low_level: {}
        }
      };

      const brainPath = path.join(process.cwd(), '..', 'brain', 'user_brain.json');
      // Note: in dev mode, process.cwd() might be project_root/voice, so we go up one level
      // Wait, standard next.js dev runs in project_root if started via "cd voice && npm run dev"?
      // Let's make it robust:
      let baseDir = process.cwd();
      if (baseDir.endsWith('/voice')) {
        baseDir = path.join(baseDir, '..');
      }
      const robustBrainPath = path.join(baseDir, 'brain', 'user_brain.json');
      
      // Ensure directory exists
      const brainDir = path.dirname(robustBrainPath);
      if (!fs.existsSync(brainDir)) {
        fs.mkdirSync(brainDir, { recursive: true });
      }

      fs.writeFileSync(robustBrainPath, JSON.stringify(brainData, null, 2));
      console.log('[COURSE_GEN] Saved brain to:', robustBrainPath);
    } catch (err) {
      console.error('[COURSE_GEN] Failed to save brain file:', err);
      // Don't fail the request just because file save failed
    }

    // Return the structure
    return res.status(200).json(uiCourse);

  } catch (error: any) {
    console.error('[COURSE_GEN] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
