/**
 * Example: Complete Pipeline Integration
 *
 * This demonstrates how the brain fits into the full learning system:
 * 1. Onboarding → 2. Profiling → 3. Brain Creation → 4. Course Generation (future)
 */

const { createBrain, saveBrain } = require('./createBrain');

// Simulate the complete pipeline
async function runPipeline() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('         COMPLETE LEARNING SYSTEM PIPELINE');
  console.log('═══════════════════════════════════════════════════════\n');

  // ============================================================
  // PHASE 1: VOICE ONBOARDING
  // ============================================================
  console.log('📢 PHASE 1: Voice Onboarding');
  console.log('   User speaks their learning goal...\n');

  // Simulated output from onboarding-agent
  const onboardingOutput = {
    subject: "how to integrate AI tools into my product management workflow",
    why: "I'm a PM and I keep seeing other PMs ship faster using AI. I feel like I'm falling behind and I want to be the person who actually knows this stuff.",
    summary: "PM wants to learn AI integration for product workflows to keep pace with peers"
  };

  console.log('   ✅ Onboarding complete!');
  console.log(`   Subject: ${onboardingOutput.subject}`);
  console.log(`   Why: ${onboardingOutput.why}\n`);

  // ============================================================
  // PHASE 2: IDENTITY PROFILING
  // ============================================================
  console.log('🔍 PHASE 2: Identity Profiling');
  console.log('   AI probes to understand the learner...\n');

  // Simulated output from profiling-agent
  const profilingOutput = {
    current_level: "beginner - knows AI exists, has used ChatGPT, but no systematic understanding",
    vocabulary: "non-technical, business-oriented. Knows PM jargon but not AI/ML terminology",
    skip: ["basic explanation of what AI is", "history of AI"],
    teach_from_scratch: ["prompt engineering", "AI tool evaluation frameworks", "workflow automation"],
    depth: "practical and applied, not theoretical. Wants to DO things, not understand how models work",
    tone: "casual, direct, no hand-holding but also not condescending. Treat them like a smart person who just hasn't learned this yet",
    background: "3 years as PM at mid-size SaaS. Comfortable with data and analytics. Uses Notion, Linear, Figma daily",
    gaps: ["doesn't know which AI tools exist beyond ChatGPT", "no framework for evaluating when AI is useful vs overkill", "never built an AI-assisted workflow"],
    strengths: ["strong product thinking", "already data-literate", "high motivation and clear use case"],
    focus_areas: "tool selection, workflow integration, prompt engineering, measuring AI impact on velocity",
    learner_context: "Works on a product team that's skeptical of AI. Wants to become the internal expert and champion"
  };

  console.log('   ✅ Profiling complete!');
  console.log(`   Current level: ${profilingOutput.current_level}`);
  console.log(`   Depth needed: ${profilingOutput.depth}`);
  console.log(`   Key gaps: ${profilingOutput.gaps.length} identified`);
  console.log(`   Key strengths: ${profilingOutput.strengths.length} identified\n`);

  // ============================================================
  // PHASE 3: BRAIN CREATION
  // ============================================================
  console.log('🧠 PHASE 3: Brain Creation');
  console.log('   Combining onboarding + profiling into unified brain...\n');

  const brain = createBrain(onboardingOutput, profilingOutput);

  console.log('   ✅ Brain created!');
  console.log(`   Generated at: ${brain.brain.high_level.generated_at}`);
  console.log(`   Onboarding fields: ${Object.keys(brain.brain.high_level.onboarding).length}`);
  console.log(`   Profiling fields: ${Object.keys(brain.brain.high_level.profiling).length}\n`);

  // Save for next phase
  saveBrain(brain, './example_brain.json');

  // ============================================================
  // PHASE 4: COURSE GENERATION (FUTURE)
  // ============================================================
  console.log('📚 PHASE 4: Course Generation (future)');
  console.log('   AI reads the complete high_level (onboarding + profiling)');
  console.log('   and generates a personalized course structure...\n');

  console.log('   Input to course generator:');
  console.log('   - Subject: ' + brain.brain.high_level.onboarding.subject);
  console.log('   - Why: ' + brain.brain.high_level.onboarding.why);
  console.log('   - Current level: ' + brain.brain.high_level.profiling.current_level);
  console.log('   - Depth: ' + brain.brain.high_level.profiling.depth);
  console.log('   - Skip: ' + brain.brain.high_level.profiling.skip.join(', '));
  console.log('   - Focus areas: ' + brain.brain.high_level.profiling.focus_areas);
  console.log('   - Learner context: ' + brain.brain.high_level.profiling.learner_context + '\n');

  console.log('   → Course generator will create phases/chapters tailored to THIS learner');
  console.log('   → Structure will be written to brain.course_structure\n');

  // ============================================================
  // PHASE 5: TEACHING + MASTERY TRACKING (FUTURE)
  // ============================================================
  console.log('🎓 PHASE 5: Teaching + Mastery Tracking (future)');
  console.log('   As the user learns, their mastery data gets written to brain.low_level');
  console.log('   This enables adaptive teaching that responds to actual performance\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('                   PIPELINE COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('The brain is now ready for course generation!');
  console.log('Next step: Build the course generation agent that reads brain.high_level\n');
}

// Run the example
runPipeline().catch(console.error);
