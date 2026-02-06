
const { MentorAgent } = require('./index');

// Mock Lesson Data
const MOCK_LESSON = {
  title: "Introduction to Photosynthesis",
  content_text: "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar. It takes place in the chloroplasts, which contain chlorophyll.",
  mastery_criteria: [
    "Define the inputs and outputs of photosynthesis",
    "Identify where photosynthesis occurs in the cell"
  ]
};

async function dryRun() {
  console.log("🚀 Starting Dry Run...");
  const agent = new MentorAgent();
  
  // 1. Generate Tests
  console.log('\n1. Generating Tests...');
  const games = await agent.generateTests(MOCK_LESSON);
  console.log('✅ Games Generated:', Object.keys(games));

  if (!games.QuizMaster || !games.FeynmanBoard) {
    throw new Error("Missing required games in output");
  }

  // 2. Simulate Bad Answers (to trigger remediation)
  console.log('\n2. Simulating User Failure...');
  const badAnswers = {
    quiz_master: [{ question: "q1", selected_index: 0, correct_index: 1 }], // Intentional wrong
    feynman_board: { prompt: "Explain it", user_explanation: "I don't know, magic?" }
  };

  // 3. Evaluate
  console.log('\n3. Evaluating...');
  const result = await agent.evaluate(MOCK_LESSON, badAnswers);
  console.log('✅ Evaluation Result:', result);

  if (result.passed === true) {
    console.warn("⚠️ Warning: User passed with bad answers. Check Evaluator Prompt.");
  }

  if (result.gaps && result.gaps.length > 0) {
    // 4. Remediate
    console.log('\n4. Generating Remediation...');
    const remediation = await agent.remediate(MOCK_LESSON, result.gaps);
    console.log('✅ Remediation Generated:', remediation.substring(0, 100) + "...");
  }

  console.log("\n✨ Dry Run Complete!");
}

dryRun().catch(err => {
  console.error("❌ Dry Run Failed:", err);
  process.exit(1);
});
