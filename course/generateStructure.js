/**
 * Course Structure Generator
 *
 * Makes an API call to Gemini (via OpenRouter) to generate a personalized
 * course structure based on the learner brain data.
 */

const { COURSE_STRUCTURE_SYSTEM_PROMPT } = require('./structurePrompt');
const { searchWeb } = require('../search/webSearch');
const { buildStructureQueries } = require('../search/buildSearchQueries');

/**
 * Generates a personalized course structure using AI
 *
 * @param {Object} brain - The complete user brain object
 * @param {Object} brain.high_level - High-level learner data (onboarding + profiling)
 * @param {Object} options - Optional configuration
 * @param {string} options.apiKey - OpenRouter API key (defaults to env var)
 * @param {string} options.model - Model to use (defaults to gemini-2.5-flash-preview)
 *
 * @returns {Promise<Object>} The generated course structure
 */
async function generateCourseStructure(brain, options = {}) {
  // Validate input - handle both brain.high_level and brain.brain.high_level
  const brainData = brain.brain || brain;

  if (!brainData || !brainData.high_level) {
    throw new Error('Brain must have a high_level property');
  }

  // Get API key from options or environment
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not found in environment or options');
  }

  // Model selection
  const model = options.model || "google/gemini-3-flash-preview";

  console.log('🎓 Generating course structure...');
  console.log(`   Subject: ${brainData.high_level.onboarding.subject}`);
  console.log(`   Model: ${model}\n`);

  try {
    // Step 1: Search the web for current info on the subject
    console.log('🔍 Searching web for latest context...');
    const queries = buildStructureQueries(brainData.high_level);
    const searchResults = [];

    // Execute searches (limit to first query for speed if needed, or all)
    for (const query of queries) {
      console.log(`   Query: "${query}"`);
      const results = await searchWeb(query);
      searchResults.push(...results);
      // Wait a bit to be nice to the API if doing multiple
      if (queries.indexOf(query) < queries.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    console.log(`   Found ${searchResults.length} relevant web results\n`);

    // Make API call to OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/your-repo", // Optional but recommended
        "X-Title": "Course Structure Generator" // Optional but recommended
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: COURSE_STRUCTURE_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: JSON.stringify({
              learner_brain: brainData.high_level,
              web_research: searchResults
            })
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}\n${errorData}`);
    }

    const data = await response.json();

    // Extract and parse the structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Unexpected API response format');
    }

    const structure = JSON.parse(data.choices[0].message.content);

    // Validate structure has required fields
    if (!structure.title || !structure.phases || !Array.isArray(structure.phases)) {
      throw new Error('Generated structure is missing required fields (title, phases)');
    }

    console.log('✅ Course structure generated successfully!');
    console.log(`   Title: ${structure.title}`);
    console.log(`   Phases: ${structure.phases.length}`);
    console.log(`   Total lessons: ${structure.phases.reduce((sum, p) => sum + (p.lessons?.length || 0), 0)}\n`);

    return structure;

  } catch (error) {
    console.error('❌ Error generating course structure:', error.message);
    throw error;
  }
}

/**
 * Validates a course structure object
 *
 * @param {Object} structure - The structure to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
function validateCourseStructure(structure) {
  const errors = [];

  if (!structure.title || typeof structure.title !== 'string') {
    errors.push('Missing or invalid title');
  }

  if (!Array.isArray(structure.phases)) {
    errors.push('Phases must be an array');
  } else {
    structure.phases.forEach((phase, phaseIdx) => {
      if (!phase.phase_number || typeof phase.phase_number !== 'number') {
        errors.push(`Phase ${phaseIdx}: missing or invalid phase_number`);
      }
      if (!phase.title || typeof phase.title !== 'string') {
        errors.push(`Phase ${phaseIdx}: missing or invalid title`);
      }
      if (!phase.description || typeof phase.description !== 'string') {
        errors.push(`Phase ${phaseIdx}: missing or invalid description`);
      }
      if (!Array.isArray(phase.lessons)) {
        errors.push(`Phase ${phaseIdx}: lessons must be an array`);
      } else {
        phase.lessons.forEach((lesson, lessonIdx) => {
          if (!lesson.lesson_number || typeof lesson.lesson_number !== 'number') {
            errors.push(`Phase ${phaseIdx}, Lesson ${lessonIdx}: missing or invalid lesson_number`);
          }
          if (!lesson.title || typeof lesson.title !== 'string') {
            errors.push(`Phase ${phaseIdx}, Lesson ${lessonIdx}: missing or invalid title`);
          }
          if (!lesson.description || typeof lesson.description !== 'string') {
            errors.push(`Phase ${phaseIdx}, Lesson ${lessonIdx}: missing or invalid description`);
          }
          if (!lesson.instructional_seed || typeof lesson.instructional_seed !== 'string') {
            errors.push(`Phase ${phaseIdx}, Lesson ${lessonIdx}: missing or invalid instructional_seed`);
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  generateCourseStructure,
  validateCourseStructure
};
