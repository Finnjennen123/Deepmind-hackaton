#!/usr/bin/env node

/**
 * Main course structure generation script
 *
 * Usage:
 *   node generate.js --brain ../brain/user_brain.json
 *   node generate.js --brain ../brain/user_brain.json --output ./course_structure.json
 */

require('dotenv').config({ path: '../.env' });
const { generateCourseStructure, validateCourseStructure } = require('./generateStructure');
const { loadUpdateAndSave, getCourseStats } = require('../brain/updateCourseStructure');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const brainPath = getArg('--brain', '../brain/user_brain.json');
const outputPath = getArg('--output', null); // null means update brain in-place
const structureOnlyPath = getArg('--structure-only', null); // Save just structure to separate file

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('         COURSE STRUCTURE GENERATION');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check API key
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY not found in environment');
    console.error('   Please add it to your .env file\n');
    process.exit(1);
  }

  // Load brain
  console.log(`📂 Loading brain from: ${brainPath}\n`);

  const brainFullPath = path.resolve(__dirname, brainPath);
  if (!fs.existsSync(brainFullPath)) {
    console.error(`❌ Brain file not found: ${brainFullPath}`);
    process.exit(1);
  }

  const brain = JSON.parse(fs.readFileSync(brainFullPath, 'utf8'));

  // Display learner info
  console.log('👤 Learner Profile:');
  console.log(`   Subject: ${brain.brain.high_level.onboarding.subject}`);
  console.log(`   Why: ${brain.brain.high_level.onboarding.why}`);
  console.log(`   Level: ${brain.brain.high_level.profiling.current_level || brain.brain.high_level.profiling.starting_level || 'not specified'}`);
  console.log(`   Depth: ${brain.brain.high_level.profiling.depth || 'not specified'}\n`);

  try {
    // Generate structure
    const structure = await generateCourseStructure(brain);

    // Validate
    console.log('🔍 Validating structure...');
    const validation = validateCourseStructure(structure);

    if (!validation.valid) {
      console.error('❌ Structure validation failed:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      process.exit(1);
    }

    console.log('✅ Structure validation passed\n');

    // Save structure-only if requested
    if (structureOnlyPath) {
      const structPath = path.resolve(__dirname, structureOnlyPath);
      fs.writeFileSync(structPath, JSON.stringify(structure, null, 2), 'utf8');
      console.log(`📄 Structure saved to: ${structPath}\n`);
    }

    // Update brain
    console.log('💾 Updating brain with course structure...\n');
    const updatedBrain = loadUpdateAndSave(brainFullPath, structure, outputPath ? path.resolve(__dirname, outputPath) : null);

    // Display summary
    console.log('\n📊 Course Summary:');
    const stats = getCourseStats(updatedBrain);
    console.log(`   Title: ${stats.title}`);
    console.log(`   Total Phases: ${stats.total_phases}`);
    console.log(`   Total Lessons: ${stats.total_lessons}`);
    console.log('\n   Breakdown:');
    stats.lessons_per_phase.forEach(p => {
      console.log(`   Phase ${p.phase}: ${p.title} (${p.lesson_count} lessons)`);
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('              GENERATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Next steps:');
    console.log('1. Review the generated course structure in the brain file');
    console.log('2. Build the teaching agent that delivers lessons based on this structure\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
