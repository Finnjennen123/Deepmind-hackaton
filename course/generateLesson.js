/**
 * Lesson Content Generator
 *
 * Makes an API call to Gemini (via OpenRouter) to generate personalized
 * lesson content based on the learner brain data and lesson's instructional seed.
 */

const { LESSON_GENERATION_SYSTEM_PROMPT } = require('./lessonPrompt');
const { searchWeb } = require('../search/webSearch');
const { buildLessonQueries } = require('../search/buildSearchQueries');

/**
 * Generates personalized lesson content using AI
 *
 * @param {Object} brain - The complete user brain object
 * @param {Object} brain.high_level - High-level learner data (onboarding + profiling)
 * @param {Object} brain.low_level - Low-level mastery data from previous lessons
 * @param {Object} lesson - The lesson to generate content for
 * @param {string} lesson.title - Lesson title
 * @param {string} lesson.description - Lesson description
 * @param {string} lesson.instructional_seed - Main directive for content generation
 * @param {number} lesson.lesson_number - Lesson number within phase
 * @param {number} lesson.phase_number - Phase number within course
 * @param {string} lesson.phase_title - Title of the phase this lesson belongs to
 * @param {Object} options - Optional configuration
 * @param {string} options.apiKey - OpenRouter API key (defaults to env var)
 * @param {string} options.model - Model to use (defaults to gemini-2.5-flash-preview)
 *
 * @returns {Promise<Object>} The generated lesson with { content, mastery_criteria }
 */
async function generateLesson(brain, lesson, options = {}) {
  // Validate input - handle both brain.brain and direct brain
  const brainData = brain.brain || brain;

  if (!brainData || !brainData.high_level) {
    throw new Error('Brain must have a high_level property');
  }

  // Validate lesson has required fields
  if (!lesson || !lesson.instructional_seed) {
    throw new Error('Lesson must have an instructional_seed property');
  }

  if (!lesson.title || !lesson.description) {
    throw new Error('Lesson must have title and description');
  }

  // Get API key from options or environment
  const apiKey = options.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not found in environment or options');
  }

  // Model selection
  const model = options.model || "google/gemini-3-flash-preview";

  console.log('📚 Generating lesson content...');
  console.log(`   Lesson: ${lesson.title}`);
  console.log(`   Phase: ${lesson.phase_title || 'N/A'}`);
  console.log(`   Model: ${model}\n`);

  try {
    // Step 1: Search the web for current info on this specific lesson topic
    console.log('🔍 Searching web for lesson context...');
    const queries = buildLessonQueries(lesson);
    const searchResults = [];

    for (const query of queries) {
      console.log(`   Query: "${query}"`);
      const results = await searchWeb(query);
      searchResults.push(...results);
      if (queries.indexOf(query) < queries.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    console.log(`   Found ${searchResults.length} relevant web results\n`);

    // Prepare the lesson data to send
    const lessonData = {
      title: lesson.title,
      description: lesson.description,
      instructional_seed: lesson.instructional_seed,
      phase_title: lesson.phase_title,
      lesson_number: lesson.lesson_number,
      phase_number: lesson.phase_number
    };

    // Make API call to OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/your-repo", // Optional but recommended
        "X-Title": "Lesson Content Generator" // Optional but recommended
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: LESSON_GENERATION_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: JSON.stringify({
              brain: brainData,
              lesson: lessonData,
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

    // Extract and parse the lesson content
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Unexpected API response format');
    }

    const lessonContent = JSON.parse(data.choices[0].message.content);

    // Validate lesson content has required fields
    if (!lessonContent.content || !lessonContent.mastery_criteria) {
      throw new Error('Generated lesson is missing required fields (content, mastery_criteria)');
    }

    if (!Array.isArray(lessonContent.mastery_criteria)) {
      throw new Error('mastery_criteria must be an array');
    }

    console.log('✅ Lesson content generated successfully!');
    console.log(`   Content length: ${lessonContent.content.length} characters`);
    console.log(`   Mastery criteria: ${lessonContent.mastery_criteria.length} items\n`);

    return lessonContent;

  } catch (error) {
    console.error('❌ Error generating lesson content:', error.message);
    throw error;
  }
}

/**
 * Validates lesson content object
 *
 * @param {Object} lessonContent - The lesson content to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
function validateLessonContent(lessonContent) {
  const errors = [];

  if (!lessonContent.content || typeof lessonContent.content !== 'string') {
    errors.push('Missing or invalid content');
  }

  if (!Array.isArray(lessonContent.mastery_criteria)) {
    errors.push('mastery_criteria must be an array');
  } else {
    if (lessonContent.mastery_criteria.length < 2 || lessonContent.mastery_criteria.length > 5) {
      errors.push('mastery_criteria should have 2-5 items');
    }

    lessonContent.mastery_criteria.forEach((criterion, idx) => {
      if (!criterion || typeof criterion !== 'string') {
        errors.push(`Mastery criterion ${idx} is not a valid string`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  generateLesson,
  validateLessonContent
};
