#!/usr/bin/env node

/**
 * CLI tool to generate user brain from onboarding and profiling outputs
 *
 * Usage:
 *   node generate-brain.js
 *   node generate-brain.js --onboarding ../onboarding-agent/onboarding_result.json --profiling ../profiling-agent/learner_profile.json --output ./brain.json
 */

const { loadBrainFromFiles, saveBrain } = require('./createBrain');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

// Default paths
const onboardingPath = getArg('--onboarding', '../onboarding-agent/onboarding_result.json');
const profilingPath = getArg('--profiling', '../profiling-agent/learner_profile.json');
const outputPath = getArg('--output', './user_brain.json');

console.log('🧠 Generating User Brain...\n');
console.log(`📂 Onboarding data: ${onboardingPath}`);
console.log(`📂 Profiling data: ${profilingPath}`);
console.log(`📂 Output path: ${outputPath}\n`);

try {
  // Load and create brain
  const brain = loadBrainFromFiles(
    path.resolve(__dirname, onboardingPath),
    path.resolve(__dirname, profilingPath)
  );

  // Save brain
  saveBrain(brain, path.resolve(__dirname, outputPath));

  console.log('\n✅ User Brain generated successfully!\n');
  console.log('Brain summary:');
  console.log(`  Subject: ${brain.brain.high_level.onboarding.subject}`);
  console.log(`  Why: ${brain.brain.high_level.onboarding.why}`);
  console.log(`  Generated at: ${brain.brain.high_level.generated_at}`);

  // Count profiling fields
  const profilingKeys = Object.keys(brain.brain.high_level.profiling);
  console.log(`  Profiling fields: ${profilingKeys.length} (${profilingKeys.join(', ')})`);

} catch (error) {
  console.error('❌ Error generating brain:', error.message);
  console.error('\nUsage:');
  console.error('  node generate-brain.js [options]');
  console.error('\nOptions:');
  console.error('  --onboarding <path>  Path to onboarding_result.json (default: ../onboarding-agent/onboarding_result.json)');
  console.error('  --profiling <path>   Path to learner_profile.json (default: ../profiling-agent/learner_profile.json)');
  console.error('  --output <path>      Output path for user_brain.json (default: ./user_brain.json)');
  process.exit(1);
}
