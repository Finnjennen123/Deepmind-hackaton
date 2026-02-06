/**
 * Updates the brain with generated course structure
 */

const fs = require('fs');

/**
 * Writes course structure into brain.course_structure
 *
 * @param {Object} brain - The brain object to update
 * @param {Object} structure - The generated course structure
 * @returns {Object} The updated brain
 */
function updateCourseStructure(brain, structure) {
  if (!brain || !brain.brain) {
    throw new Error('Invalid brain object');
  }

  if (!structure || !structure.phases) {
    throw new Error('Invalid course structure');
  }

  // Update the course_structure field
  brain.brain.course_structure = {
    ...structure,
    generated_at: new Date().toISOString()
  };

  return brain;
}

/**
 * Loads brain, updates with structure, and saves
 *
 * @param {string} brainPath - Path to brain JSON file
 * @param {Object} structure - The generated course structure
 * @param {string} outputPath - Where to save updated brain (defaults to same path)
 * @returns {Object} The updated brain
 */
function loadUpdateAndSave(brainPath, structure, outputPath = null) {
  // Load existing brain
  if (!fs.existsSync(brainPath)) {
    throw new Error(`Brain file not found: ${brainPath}`);
  }

  const brain = JSON.parse(fs.readFileSync(brainPath, 'utf8'));

  // Update with structure
  const updatedBrain = updateCourseStructure(brain, structure);

  // Save
  const savePath = outputPath || brainPath;
  fs.writeFileSync(savePath, JSON.stringify(updatedBrain, null, 2), 'utf8');

  console.log(`✅ Brain updated with course structure`);
  console.log(`   Saved to: ${savePath}`);
  console.log(`   Phases: ${structure.phases.length}`);
  console.log(`   Total lessons: ${structure.phases.reduce((sum, p) => sum + (p.lessons?.length || 0), 0)}`);

  return updatedBrain;
}

/**
 * Gets summary statistics about a course structure
 *
 * @param {Object} brain - Brain with course_structure filled
 * @returns {Object} Summary statistics
 */
function getCourseStats(brain) {
  if (!brain?.brain?.course_structure?.phases) {
    return { error: 'No course structure found' };
  }

  const structure = brain.brain.course_structure;
  const phases = structure.phases;

  const stats = {
    title: structure.title,
    total_phases: phases.length,
    total_lessons: phases.reduce((sum, p) => sum + (p.lessons?.length || 0), 0),
    lessons_per_phase: phases.map(p => ({
      phase: p.phase_number,
      title: p.title,
      lesson_count: p.lessons?.length || 0
    })),
    generated_at: structure.generated_at
  };

  return stats;
}

module.exports = {
  updateCourseStructure,
  loadUpdateAndSave,
  getCourseStats
};
