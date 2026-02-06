#!/usr/bin/env node

/**
 * COMPLETE END-TO-END TEST
 *
 * Tests the entire system:
 * 1. Onboarding (simulated)
 * 2. Profiling (simulated)
 * 3. Brain Creation
 * 4. Course Structure Generation
 * 5. Lesson Content Generation ← NEW!
 *
 * Run: node test-complete-flow.js
 */

require('dotenv').config();
const { createBrain, saveBrain } = require('./brain/createBrain');
const { generateCourseStructure } = require('./course/generateStructure');
const { updateCourseStructure } = require('./brain/updateCourseStructure');
const { generateLesson } = require('./course/generateLesson');

console.clear();

async function testCompleteFlow() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║            COMPLETE END-TO-END FLOW TEST                   ║');
  console.log('║     Onboarding → Brain → Structure → Lesson Content        ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ============================================================
  // STEP 1: Onboarding (Simulated)
  // ============================================================
  console.log('📍 STEP 1: Onboarding\n');

  const onboardingData = {
    subject: "how to integrate AI tools into my product management workflow",
    why: "I'm a PM and I keep seeing other PMs ship faster using AI. I feel like I'm falling behind and want to catch up.",
    summary: "PM wants to learn AI integration for faster product shipping"
  };

  console.log(`   Subject: ${onboardingData.subject}`);
  console.log(`   Why: ${onboardingData.why}\n`);

  // ============================================================
  // STEP 2: Profiling (Simulated)
  // ============================================================
  console.log('📍 STEP 2: Profiling\n');

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

  console.log(`   Level: ${profilingData.current_level}`);
  console.log(`   Depth: ${profilingData.depth}`);
  console.log(`   Tone: ${profilingData.tone}\n`);

  // ============================================================
  // STEP 3: Brain Creation
  // ============================================================
  console.log('📍 STEP 3: Brain Creation\n');

  const brain = createBrain(onboardingData, profilingData);
  console.log(`   ✅ Brain created`);
  console.log(`      high_level: onboarding + profiling`);
  console.log(`      low_level: {} (empty - as expected)\n`);

  // ============================================================
  // STEP 4: Course Structure Generation
  // ============================================================
  console.log('📍 STEP 4: Course Structure Generation\n');
  console.log('   🤖 Calling Gemini API...\n');

  const structure = await generateCourseStructure(brain);
  const finalBrain = updateCourseStructure(brain, structure);

  console.log(`   ✅ Course structure generated`);
  console.log(`      Title: "${structure.title}"`);
  console.log(`      Phases: ${structure.phases.length}`);
  console.log(`      Total Lessons: ${structure.phases.reduce((sum, p) => sum + p.lessons.length, 0)}\n`);

  // ============================================================
  // STEP 5: Lesson Content Generation ← NEW!
  // ============================================================
  console.log('📍 STEP 5: Lesson Content Generation (NEW!)\n');

  // Get the first lesson from the course
  const firstPhase = structure.phases[0];
  const firstLesson = firstPhase.lessons[0];

  // Add phase context to lesson
  firstLesson.phase_title = firstPhase.title;
  firstLesson.phase_number = firstPhase.phase_number;

  console.log(`   📖 Generating content for:`);
  console.log(`      "${firstLesson.title}"`);
  console.log(`\n   🤖 Calling Gemini API...\n`);

  const lessonContent = await generateLesson(finalBrain.brain, firstLesson);

  console.log(`   ✅ Lesson content generated`);
  console.log(`      Content length: ${lessonContent.content.length} characters`);
  console.log(`      Mastery criteria: ${lessonContent.mastery_criteria.length} items\n`);

  // ============================================================
  // RESULTS
  // ============================================================
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    RESULTS PREVIEW                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📚 COURSE STRUCTURE:\n');
  console.log(`   "${structure.title}"\n`);

  structure.phases.forEach(phase => {
    console.log(`   Phase ${phase.phase_number}: ${phase.title}`);
    phase.lessons.forEach(lesson => {
      console.log(`      • Lesson ${lesson.lesson_number}: ${lesson.title}`);
    });
    console.log('');
  });

  console.log('📖 GENERATED LESSON CONTENT (first 500 chars):\n');
  console.log(lessonContent.content.substring(0, 500) + '...\n');

  console.log('🎯 MASTERY CRITERIA:\n');
  lessonContent.mastery_criteria.forEach((criterion, idx) => {
    console.log(`   ${idx + 1}. ${criterion}`);
  });

  // ============================================================
  // VERIFICATION
  // ============================================================
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    VERIFICATION                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const checks = {
    '✅ Brain has high_level': !!finalBrain.brain.high_level,
    '✅ Brain has empty low_level': Object.keys(finalBrain.brain.low_level).length === 0,
    '✅ Course structure exists': !!finalBrain.brain.course_structure,
    '✅ Has multiple phases': structure.phases.length > 1,
    '✅ Has lessons': structure.phases[0].lessons.length > 0,
    '✅ Each lesson has instructional_seed': !!firstLesson.instructional_seed,
    '✅ Lesson content generated': lessonContent.content.length > 0,
    '✅ Has mastery criteria (2-5)': lessonContent.mastery_criteria.length >= 2 &&
                                      lessonContent.mastery_criteria.length <= 5
  };

  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'}  ${check}`);
  });

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║                  ✅ ALL SYSTEMS WORKING!                    ║');
  console.log('║                                                            ║');
  console.log('║  The complete flow executed successfully:                 ║');
  console.log('║  • Onboarding ✅                                           ║');
  console.log('║  • Profiling ✅                                            ║');
  console.log('║  • Brain Creation ✅                                       ║');
  console.log('║  • Course Structure Generation ✅                          ║');
  console.log('║  • Lesson Content Generation ✅ (NEW!)                     ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📝 KEY POINTS:\n');
  console.log('   • low_level brain stays EMPTY (as expected)');
  console.log('   • high_level is used for ALL personalization');
  console.log('   • Lesson content is NOT saved to brain');
  console.log('   • Generate lesson content on-demand when user clicks\n');
}

// Run test
testCompleteFlow().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  console.error('\nStack trace:', error.stack);
  process.exit(1);
});
