/**
 * Creates the User Brain - a centralized data store for everything we know about the learner.
 *
 * The brain combines:
 * - Phase 1 (Onboarding): subject + why
 * - Phase 2 (Profiling): current level, vocabulary, gaps, strengths, depth, tone, etc.
 *
 * Later phases will fill in:
 * - course_structure: the generated course phases and chapters
 * - low_level: per-chapter mastery data (scores, struggles, gaps)
 */

/**
 * Creates a user brain from onboarding and profiling data
 *
 * @param {Object} onboardingData - Data from Phase 1 voice onboarding
 * @param {string} onboardingData.subject - What the user wants to learn
 * @param {string} onboardingData.reason - Why they want to learn it (can also be 'why')
 * @param {string} [onboardingData.summary] - Optional summary from onboarding
 *
 * @param {Object} profilingData - Data from Phase 2 identity profiling
 * @param {string} [profilingData.starting_level] - Current level on the subject
 * @param {string} [profilingData.vocabulary] - Language/terminology comfort
 * @param {Array|string} [profilingData.skip] - What can be skipped
 * @param {Array|string} [profilingData.teach_from_scratch] - What needs to be taught from scratch
 * @param {string} [profilingData.depth] - How deep the course should go
 * @param {string} [profilingData.tone] - Teaching tone and style
 * @param {string} [profilingData.background] - Relevant background/experience
 * @param {Array|string} [profilingData.gaps] - Identified knowledge gaps
 * @param {Array|string} [profilingData.strengths] - Identified strengths
 * @param {string} [profilingData.focus_areas] - Key areas to focus on
 * @param {string} [profilingData.skip_areas] - Areas to skip
 * @param {string} [profilingData.learner_context] - Additional context about the learner
 * @param {string} [profilingData.notes] - Additional notes
 * ... and any other fields the profiling AI decided to collect
 *
 * @returns {Object} The complete user brain structure
 */
function createBrain(onboardingData, profilingData) {
  // Validate inputs
  if (!onboardingData || typeof onboardingData !== 'object') {
    throw new Error('onboardingData must be a valid object');
  }

  if (!profilingData || typeof profilingData !== 'object') {
    throw new Error('profilingData must be a valid object');
  }

  const subject = onboardingData.subject;
  const why = onboardingData.why || onboardingData.reason; // Handle both field names

  if (!subject) {
    throw new Error('onboardingData must include a subject field');
  }

  if (!why) {
    throw new Error('onboardingData must include a why or reason field');
  }

  // Create the brain structure
  const brain = {
    brain: {
      high_level: {
        onboarding: {
          subject: subject,
          why: why,
          ...(onboardingData.summary && { summary: onboardingData.summary })
        },
        profiling: {
          ...profilingData
        },
        generated_at: new Date().toISOString()
      },
      course_structure: {
        // Will be filled by course generation phase
        // Structure: { phases: [...], total_chapters: N, etc. }
      },
      low_level: {
        // Will be filled after each chapter
        // Structure: { chapters: { "chapter_id": { mastery_score, gaps, struggles, ... } } }
      }
    }
  };

  return brain;
}

/**
 * Loads brain from existing onboarding and profiling files
 *
 * @param {string} onboardingPath - Path to onboarding_result.json
 * @param {string} profilingPath - Path to learner_profile.json
 * @returns {Object} The complete user brain structure
 */
function loadBrainFromFiles(onboardingPath, profilingPath) {
  const fs = require('fs');

  if (!fs.existsSync(onboardingPath)) {
    throw new Error(`Onboarding file not found: ${onboardingPath}`);
  }

  if (!fs.existsSync(profilingPath)) {
    throw new Error(`Profiling file not found: ${profilingPath}`);
  }

  const onboardingData = JSON.parse(fs.readFileSync(onboardingPath, 'utf8'));
  const profilingData = JSON.parse(fs.readFileSync(profilingPath, 'utf8'));

  return createBrain(onboardingData, profilingData);
}

/**
 * Saves brain to a JSON file
 *
 * @param {Object} brain - The brain object to save
 * @param {string} outputPath - Path where to save the brain
 */
function saveBrain(brain, outputPath) {
  const fs = require('fs');
  fs.writeFileSync(outputPath, JSON.stringify(brain, null, 2), 'utf8');
  console.log(`Brain saved to ${outputPath}`);
}

module.exports = {
  createBrain,
  loadBrainFromFiles,
  saveBrain
};
