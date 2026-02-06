/**
 * Personalization Verification Script
 *
 * This script proves that the system generates DIFFERENT course structures
 * for DIFFERENT learners, even when they're learning the SAME subject.
 */

require('dotenv').config({ path: '../.env' });
const { generateCourseStructure, validateCourseStructure } = require('./generateStructure');
const { createBrain } = require('../brain/createBrain');
const fs = require('fs');

async function verifyPersonalization() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('       PERSONALIZATION VERIFICATION TEST');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('This test generates courses for TWO different learners');
  console.log('with the SAME subject. If personalization works, the');
  console.log('structures should be meaningfully different.\n');

  // ============================================================
  // LEARNER A: Non-technical PM, wants practical AI tools
  // ============================================================
  console.log('👤 LEARNER A: Non-Technical PM\n');

  const brainA = createBrain(
    {
      subject: "AI tools and techniques for product management",
      why: "I'm falling behind other PMs who use AI - need to catch up fast"
    },
    {
      current_level: "beginner - used ChatGPT a few times, that's it",
      vocabulary: "non-technical, business-oriented",
      skip: ["how neural networks work", "machine learning theory", "AI history"],
      teach_from_scratch: ["prompt engineering", "tool evaluation", "workflow integration"],
      depth: "practical and applied only - no theory",
      tone: "casual and direct, like talking to a friend",
      background: "3 years as PM, uses Notion/Linear/Figma daily",
      gaps: ["doesn't know what tools exist", "no systematic approach", "unsure when AI helps vs. hurts"],
      strengths: ["strong product intuition", "data-literate", "fast learner"]
    }
  );

  const structureA = await generateCourseStructure(brainA);
  const validationA = validateCourseStructure(structureA);

  if (!validationA.valid) {
    console.error('❌ Structure A validation failed:', validationA.errors);
    return;
  }

  console.log(`✅ Structure A generated: ${structureA.phases.length} phases, ${structureA.phases.reduce((s, p) => s + p.lessons.length, 0)} lessons`);
  console.log(`   Title: "${structureA.title}"\n`);

  // ============================================================
  // LEARNER B: Technical PM, wants to build AI-first products
  // ============================================================
  console.log('👤 LEARNER B: Technical PM\n');

  const brainB = createBrain(
    {
      subject: "AI tools and techniques for product management",
      why: "I want to build an AI-first product and need deep understanding"
    },
    {
      current_level: "intermediate - has integrated AI APIs, understands basic ML concepts",
      vocabulary: "technical, comfortable with code",
      skip: ["what is ChatGPT", "basic prompting"],
      teach_from_scratch: ["AI product strategy", "model selection", "production considerations", "cost optimization"],
      depth: "deep and comprehensive, include theory when it matters for decisions",
      tone: "professional and thorough, comfortable with technical depth",
      background: "5 years as technical PM, Python experience, shipped API products",
      gaps: ["hasn't built AI-first products", "unclear on model evaluation", "no fine-tuning experience"],
      strengths: ["technical fluency", "API experience", "system thinking"]
    }
  );

  const structureB = await generateCourseStructure(brainB);
  const validationB = validateCourseStructure(structureB);

  if (!validationB.valid) {
    console.error('❌ Structure B validation failed:', validationB.errors);
    return;
  }

  console.log(`✅ Structure B generated: ${structureB.phases.length} phases, ${structureB.phases.reduce((s, p) => s + p.lessons.length, 0)} lessons`);
  console.log(`   Title: "${structureB.title}"\n`);

  // ============================================================
  // COMPARISON
  // ============================================================
  console.log('═══════════════════════════════════════════════════════');
  console.log('                    COMPARISON');
  console.log('═══════════════════════════════════════════════════════\n');

  // Compare titles
  console.log('📋 Course Titles:\n');
  console.log(`   Learner A: "${structureA.title}"`);
  console.log(`   Learner B: "${structureB.title}"`);

  if (structureA.title === structureB.title) {
    console.log('   ⚠️  IDENTICAL - May indicate insufficient personalization\n');
  } else {
    console.log('   ✅ DIFFERENT - Good!\n');
  }

  // Compare phase counts
  console.log('📊 Structure:\n');
  console.log(`   Learner A: ${structureA.phases.length} phases`);
  console.log(`   Learner B: ${structureB.phases.length} phases\n`);

  // Compare first phase titles
  console.log('🎯 Phase 1 Comparison:\n');
  console.log(`   Learner A: "${structureA.phases[0].title}"`);
  console.log(`   Learner B: "${structureB.phases[0].title}"`);

  if (structureA.phases[0].title === structureB.phases[0].title) {
    console.log('   ⚠️  IDENTICAL\n');
  } else {
    console.log('   ✅ DIFFERENT\n');
  }

  // Compare lesson topics
  console.log('📚 Sample Lesson Titles:\n');
  console.log('   Learner A (first 3 lessons):');
  structureA.phases[0].lessons.slice(0, 3).forEach(l =>
    console.log(`   - ${l.title}`)
  );

  console.log('\n   Learner B (first 3 lessons):');
  structureB.phases[0].lessons.slice(0, 3).forEach(l =>
    console.log(`   - ${l.title}`)
  );

  // Check for skip compliance
  console.log('\n🚫 Skip List Compliance:\n');

  const skipA = brainA.brain.high_level.profiling.skip || [];
  const hasSkippedA = structureA.phases.some(phase =>
    phase.lessons.some(lesson =>
      skipA.some(skip =>
        lesson.title.toLowerCase().includes(skip.toLowerCase().replace(/"/g, ''))
      )
    )
  );
  console.log(`   Learner A skip items present: ${hasSkippedA ? '❌ FAILED' : '✅ PASSED'}`);

  const skipB = brainB.brain.high_level.profiling.skip || [];
  const hasSkippedB = structureB.phases.some(phase =>
    phase.lessons.some(lesson =>
      skipB.some(skip =>
        lesson.title.toLowerCase().includes(skip.toLowerCase().replace(/"/g, ''))
      )
    )
  );
  console.log(`   Learner B skip items present: ${hasSkippedB ? '❌ FAILED' : '✅ PASSED'}\n`);

  // Save comparison report
  const comparison = {
    same_subject: "AI tools and techniques for product management",
    learner_a: {
      profile: "Non-technical PM, beginner, wants practical only",
      structure: structureA
    },
    learner_b: {
      profile: "Technical PM, intermediate, wants deep understanding",
      structure: structureB
    },
    differences: {
      titles_different: structureA.title !== structureB.title,
      phase_count_different: structureA.phases.length !== structureB.phases.length,
      first_phase_different: structureA.phases[0].title !== structureB.phases[0].title
    }
  };

  fs.writeFileSync(
    './personalization_comparison.json',
    JSON.stringify(comparison, null, 2),
    'utf8'
  );

  console.log('═══════════════════════════════════════════════════════');
  console.log('                 VERIFICATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📄 Full comparison saved to: personalization_comparison.json\n');

  if (structureA.title !== structureB.title) {
    console.log('✅ PERSONALIZATION VERIFIED');
    console.log('   Different learners get different courses!\n');
  } else {
    console.log('⚠️  PERSONALIZATION NEEDS IMPROVEMENT');
    console.log('   Structures are too similar\n');
  }
}

// Check API key
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not found');
  process.exit(1);
}

// Run verification
verifyPersonalization().catch(console.error);
