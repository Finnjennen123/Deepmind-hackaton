#!/usr/bin/env node

/**
 * COMPLETE PIPELINE DEMO
 *
 * Runs the entire learning system end-to-end:
 * 1. Creates onboarding data (simulated)
 * 2. Creates profiling data (simulated)
 * 3. Generates brain
 * 4. Generates course structure
 * 5. Shows results
 *
 * Run: node demo.js
 */

require('dotenv').config();
const { createBrain, saveBrain } = require('./brain/createBrain');
const { generateCourseStructure } = require('./course/generateStructure');
const { updateCourseStructure, getCourseStats } = require('./brain/updateCourseStructure');
const fs = require('fs');

console.clear();

async function runFullPipeline() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║        AI-POWERED PERSONALIZED LEARNING SYSTEM             ║');
  console.log('║                  COMPLETE PIPELINE DEMO                    ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ============================================================
  // PHASE 1: VOICE ONBOARDING (Simulated)
  // ============================================================
  console.log('┌────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 1: Voice Onboarding                                  │');
  console.log('└────────────────────────────────────────────────────────────┘\n');

  console.log('🎤 User speaks: "I want to learn how to integrate AI tools');
  console.log('   into my product management workflow because I\'m a PM and');
  console.log('   I keep seeing other PMs ship faster using AI."\n');

  const onboardingData = {
    subject: "how to integrate AI tools into my product management workflow",
    why: "I'm a PM and I keep seeing other PMs ship faster using AI. I feel like I'm falling behind and want to catch up.",
    summary: "PM wants to learn AI integration for faster product shipping"
  };

  console.log('✅ Onboarding Complete\n');
  console.log('   📄 Extracted:');
  console.log(`      Subject: ${onboardingData.subject}`);
  console.log(`      Why: ${onboardingData.why}\n`);

  await sleep(1000);

  // ============================================================
  // PHASE 2: IDENTITY PROFILING (Simulated)
  // ============================================================
  console.log('┌────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 2: AI Identity Profiling                             │');
  console.log('└────────────────────────────────────────────────────────────┘\n');

  console.log('🤖 AI asks strategic questions to understand the learner...\n');

  const profilingData = {
    current_level: "beginner - has used ChatGPT but no systematic AI tool usage",
    vocabulary: "non-technical, business-oriented. Knows PM jargon but not AI/ML terminology",
    skip: ["basic explanation of what AI is", "history of AI", "how neural networks work"],
    teach_from_scratch: ["prompt engineering", "AI tool evaluation frameworks", "workflow automation"],
    depth: "practical and applied, not theoretical. Wants to DO things, not understand how models work",
    tone: "casual, direct, no hand-holding. Treat them like a smart person who just hasn't learned this yet",
    background: "3 years as PM at mid-size SaaS company. Comfortable with data and analytics. Uses Notion, Linear, Figma daily",
    gaps: [
      "doesn't know which AI tools exist beyond ChatGPT",
      "no framework for evaluating when AI is useful vs overkill",
      "never built an AI-assisted workflow"
    ],
    strengths: [
      "strong product thinking",
      "already data-literate",
      "high motivation and clear use case"
    ],
    focus_areas: "tool selection, workflow integration, prompt engineering, measuring AI impact on velocity",
    learner_context: "Works on a product team that's skeptical of AI. Wants to become the internal expert and champion"
  };

  console.log('✅ Profiling Complete\n');
  console.log('   📊 Profile Summary:');
  console.log(`      Current Level: ${profilingData.current_level}`);
  console.log(`      Depth Needed: ${profilingData.depth}`);
  console.log(`      Gaps Identified: ${profilingData.gaps.length}`);
  console.log(`      Strengths Found: ${profilingData.strengths.length}\n`);

  await sleep(1000);

  // ============================================================
  // PHASE 3: BRAIN CREATION
  // ============================================================
  console.log('┌────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 3: Brain Creation                                    │');
  console.log('└────────────────────────────────────────────────────────────┘\n');

  console.log('🧠 Combining onboarding + profiling into unified brain...\n');

  const brain = createBrain(onboardingData, profilingData);

  console.log('✅ Brain Created\n');
  console.log('   📦 Brain Structure:');
  console.log(`      high_level.onboarding: ${Object.keys(brain.brain.high_level.onboarding).length} fields`);
  console.log(`      high_level.profiling: ${Object.keys(brain.brain.high_level.profiling).length} fields`);
  console.log(`      course_structure: ${Object.keys(brain.brain.course_structure).length} fields (empty)`);
  console.log(`      low_level: ${Object.keys(brain.brain.low_level).length} fields (empty)\n`);

  // Save intermediate brain
  saveBrain(brain, './demo_brain_before.json');
  console.log('   💾 Saved: demo_brain_before.json\n');

  await sleep(1000);

  // ============================================================
  // PHASE 4: COURSE STRUCTURE GENERATION
  // ============================================================
  console.log('┌────────────────────────────────────────────────────────────┐');
  console.log('│ PHASE 4: AI Course Structure Generation                    │');
  console.log('└────────────────────────────────────────────────────────────┘\n');

  console.log('🎓 Sending complete learner brain to AI...');
  console.log('   Model: google/gemini-3-flash-preview');
  console.log('   Input: brain.high_level (onboarding + profiling)\n');

  try {
    const structure = await generateCourseStructure(brain);

    console.log('✅ Course Structure Generated\n');

    // Update brain with structure
    const finalBrain = updateCourseStructure(brain, structure);

    // Save final brain
    saveBrain(finalBrain, './demo_brain_complete.json');
    console.log('   💾 Saved: demo_brain_complete.json\n');

    await sleep(500);

    // ============================================================
    // RESULTS SUMMARY
    // ============================================================
    console.log('┌────────────────────────────────────────────────────────────┐');
    console.log('│ RESULTS                                                    │');
    console.log('└────────────────────────────────────────────────────────────┘\n');

    const stats = getCourseStats(finalBrain);

    console.log('📚 Generated Course:\n');
    console.log(`   Title: "${stats.title}"\n`);
    console.log(`   📊 Structure:`);
    console.log(`      Total Phases: ${stats.total_phases}`);
    console.log(`      Total Lessons: ${stats.total_lessons}\n`);

    console.log('   📖 Phase Breakdown:\n');
    stats.lessons_per_phase.forEach(phase => {
      console.log(`      Phase ${phase.phase}: ${phase.title}`);
      console.log(`      └─ ${phase.lesson_count} lessons`);
    });

    console.log('\n   🎯 Sample Lessons:\n');
    const firstPhase = structure.phases[0];
    firstPhase.lessons.slice(0, 2).forEach(lesson => {
      console.log(`      • ${lesson.title}`);
      console.log(`        └─ ${lesson.description}`);
    });

    // ============================================================
    // PERSONALIZATION VERIFICATION
    // ============================================================
    console.log('\n┌────────────────────────────────────────────────────────────┐');
    console.log('│ PERSONALIZATION CHECK                                      │');
    console.log('└────────────────────────────────────────────────────────────┘\n');

    console.log('   Verifying the course is personalized for THIS learner:\n');

    // Check skip items
    const skipItems = profilingData.skip;
    const hasSkipped = structure.phases.some(phase =>
      phase.lessons.some(lesson =>
        skipItems.some(skip =>
          lesson.title.toLowerCase().includes(skip.toLowerCase())
        )
      )
    );
    console.log(`   ${hasSkipped ? '❌' : '✅'} Skip list respected (no lessons on: ${skipItems.join(', ')})`);

    // Check teach-from-scratch items
    const teachItems = profilingData.teach_from_scratch;
    const hasPromptEngineering = structure.phases.some(phase =>
      phase.lessons.some(lesson =>
        lesson.title.toLowerCase().includes('prompt')
      )
    );
    console.log(`   ${hasPromptEngineering ? '✅' : '❌'} Prompt engineering covered (from teach-from-scratch list)`);

    // Check tone
    const isActionOriented = structure.phases[0].lessons[0].title.match(/build|create|integrate|set up|design/i);
    console.log(`   ${isActionOriented ? '✅' : '⚠️ '} Action-oriented titles (matches "practical" depth preference)`);

    // Check gaps addressed
    const hasToolSelection = structure.phases.some(phase =>
      phase.lessons.some(lesson =>
        lesson.title.toLowerCase().includes('tool') ||
        lesson.description.toLowerCase().includes('tool selection')
      )
    );
    console.log(`   ${hasToolSelection ? '✅' : '❌'} Tool selection covered (addresses identified gap)`);

    // ============================================================
    // FILES CREATED
    // ============================================================
    console.log('\n┌────────────────────────────────────────────────────────────┐');
    console.log('│ FILES CREATED                                              │');
    console.log('└────────────────────────────────────────────────────────────┘\n');

    console.log('   📁 Output Files:\n');
    console.log('      • demo_brain_before.json      (brain with high_level only)');
    console.log('      • demo_brain_complete.json    (brain with course_structure)\n');

    console.log('   🔍 To inspect:\n');
    console.log('      cat demo_brain_complete.json | jq .brain.course_structure\n');

    // ============================================================
    // SUCCESS
    // ============================================================
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║                    ✅ DEMO COMPLETE!                        ║');
    console.log('║                                                            ║');
    console.log('║  The entire pipeline ran successfully. A personalized     ║');
    console.log('║  course was generated based on the learner profile.       ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Next Steps:\n');
    console.log('  1. Review the generated course in demo_brain_complete.json');
    console.log('  2. Run with different learner profiles to see personalization');
    console.log('  3. Build the teaching agent to deliver actual lessons\n');

  } catch (error) {
    console.error('\n❌ Error during course generation:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check API key
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ Error: OPENROUTER_API_KEY not found in environment');
  console.error('\nPlease create a .env file in the project root with:');
  console.error('OPENROUTER_API_KEY=your_key_here\n');
  process.exit(1);
}

// Run demo
runFullPipeline().catch(error => {
  console.error('\n❌ Demo failed:', error);
  process.exit(1);
});
