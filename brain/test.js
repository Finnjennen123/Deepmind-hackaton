/**
 * Test file for the user brain creation
 */

const { createBrain, loadBrainFromFiles, saveBrain } = require('./createBrain');

// Test 1: Create brain from example data
console.log('=== Test 1: Create brain from example data ===\n');

const testOnboarding = {
  subject: "machine learning for making better product decisions",
  why: "I'm a PM and my company is pushing AI-first. I want to understand the fundamentals so I can evaluate what's actually possible.",
  summary: "Product manager wants to learn ML fundamentals to evaluate AI capabilities for product decisions"
};

const testProfiling = {
  current_level: "beginner - has heard ML terms but can't explain any of them",
  vocabulary: "business-oriented, not technical",
  skip: ["what is AI broadly"],
  teach_from_scratch: ["supervised vs unsupervised learning", "how to read model outputs", "when ML is overkill"],
  depth: "conceptual with practical examples, not mathematical",
  tone: "direct and respectful, no jargon without explanation",
  background: "5 years in product, strong with analytics dashboards, uses SQL",
  gaps: ["no idea how ML models are trained", "can't evaluate ML proposals from engineering"],
  strengths: ["data-literate", "strong critical thinking", "clear goal"]
};

const brain1 = createBrain(testOnboarding, testProfiling);
console.log(JSON.stringify(brain1, null, 2));

// Test 2: Load brain from actual project files
console.log('\n\n=== Test 2: Load brain from actual project files ===\n');

try {
  const brain2 = loadBrainFromFiles(
    '../onboarding-agent/onboarding_result.json',
    '../profiling-agent/learner_profile.json'
  );

  console.log(JSON.stringify(brain2, null, 2));

  // Save the brain
  saveBrain(brain2, './user_brain.json');

} catch (error) {
  console.error('Error loading from files:', error.message);
}
