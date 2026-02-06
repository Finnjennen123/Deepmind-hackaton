/**
 * Test file for course structure generation
 */

require('dotenv').config({ path: '../.env' });
const { generateCourseStructure, validateCourseStructure } = require('./generateStructure');
const { updateCourseStructure } = require('../brain/updateCourseStructure');
const { createBrain } = require('../brain/createBrain');

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('    COURSE STRUCTURE GENERATION - TEST SUITE');
  console.log('═══════════════════════════════════════════════════════\n');

  // ============================================================
  // TEST 1: Generate structure for PM learning AI tools
  // ============================================================
  console.log('📝 TEST 1: PM Learning AI Tools Integration\n');

  const testBrain1 = createBrain(
    {
      subject: "how to integrate AI tools into my product management workflow",
      why: "I'm a PM and I keep seeing other PMs ship faster using AI. I feel like I'm falling behind.",
      summary: "PM wants to learn AI integration for faster shipping"
    },
    {
      current_level: "beginner - has used ChatGPT but no systematic AI tool usage",
      vocabulary: "non-technical, business-oriented",
      skip: ["basic explanation of what AI is", "history of AI"],
      teach_from_scratch: ["prompt engineering", "AI tool evaluation frameworks", "workflow automation"],
      depth: "practical and applied, not theoretical",
      tone: "casual, direct, treat them like a smart person who just hasn't learned this yet",
      background: "3 years as PM at SaaS company, uses Notion, Linear, Figma daily",
      gaps: ["doesn't know which AI tools exist beyond ChatGPT", "no framework for evaluating when AI is useful vs overkill", "never built an AI-assisted workflow"],
      strengths: ["strong product thinking", "data-literate", "high motivation"]
    }
  );

  try {
    const structure1 = await generateCourseStructure(testBrain1);

    // Validate
    const validation1 = validateCourseStructure(structure1);
    if (!validation1.valid) {
      console.error('❌ Validation failed:', validation1.errors);
    } else {
      console.log('✅ Structure validation passed\n');
    }

    // Update brain
    const updatedBrain1 = updateCourseStructure(testBrain1, structure1);

    console.log('Course Structure:');
    console.log(JSON.stringify(structure1, null, 2));
    console.log('\n');

    // Verify personalization
    console.log('🔍 Checking Personalization:\n');

    // Check skip items are absent
    const hasSkippedContent = structure1.phases.some(phase =>
      phase.lessons.some(lesson =>
        lesson.title.toLowerCase().includes('what is ai') ||
        lesson.title.toLowerCase().includes('history of ai')
      )
    );
    console.log(`   Skip list respected: ${hasSkippedContent ? '❌ NO' : '✅ YES'}`);

    // Check teach_from_scratch items are present
    const hasPromptEngineering = structure1.phases.some(phase =>
      phase.lessons.some(lesson =>
        lesson.title.toLowerCase().includes('prompt')
      )
    );
    const hasEvaluation = structure1.phases.some(phase =>
      phase.lessons.some(lesson =>
        lesson.title.toLowerCase().includes('evaluat')
      )
    );
    console.log(`   Prompt engineering covered: ${hasPromptEngineering ? '✅ YES' : '❌ NO'}`);
    console.log(`   Evaluation framework covered: ${hasEvaluation ? '✅ YES' : '❌ NO'}`);

    // Check tone matches (casual titles)
    const titleTone = structure1.phases[0]?.title || '';
    console.log(`   First phase title: "${titleTone}"`);
    console.log(`   Tone appears casual/direct: ${titleTone.length < 50 ? '✅ YES' : '⚠️  MAYBE'}\n`);

  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }

  // ============================================================
  // TEST 2: Generate structure for different learner
  // (Same subject, different profile = different structure)
  // ============================================================
  console.log('\n📝 TEST 2: Same Subject, Different Learner Profile\n');

  const testBrain2 = createBrain(
    {
      subject: "how to integrate AI tools into my product management workflow",
      why: "I want to build an AI-first product and need deep understanding of capabilities",
      summary: "Technical PM wants deep AI knowledge for building AI products"
    },
    {
      current_level: "intermediate - has built with AI APIs, understands basic ML concepts",
      vocabulary: "comfortable with technical terminology, some programming background",
      skip: ["what is ChatGPT", "basic prompt engineering"],
      teach_from_scratch: ["AI product strategy", "model selection and tradeoffs", "building reliable AI features"],
      depth: "deep and comprehensive, including some theory when it matters for decisions",
      tone: "professional and thorough, comfortable with technical depth",
      background: "5 years as technical PM, has shipped API integrations, comfortable with Python",
      gaps: ["hasn't shipped an AI-first product", "unclear on model evaluation in production", "no experience with fine-tuning or RAG"],
      strengths: ["technical fluency", "API experience", "strong system thinking"]
    }
  );

  try {
    const structure2 = await generateCourseStructure(testBrain2);

    console.log('Course Structure (Technical PM):');
    console.log(JSON.stringify(structure2, null, 2));
    console.log('\n');

    // Compare structures
    console.log('🔍 Comparing Structures:\n');
    console.log(`   Brain 1 (beginner PM): ${testBrain1.brain.course_structure?.phases?.length || 'N/A'} phases`);
    console.log(`   Brain 2 (technical PM): ${structure2.phases.length} phases`);

    const brain1Title = testBrain1.brain.course_structure?.title || 'N/A';
    const brain2Title = structure2.title;
    console.log(`\n   Brain 1 title: "${brain1Title}"`);
    console.log(`   Brain 2 title: "${brain2Title}"`);

    if (brain1Title !== brain2Title) {
      console.log('   ✅ Titles are different (good - shows personalization)');
    } else {
      console.log('   ⚠️  Titles are identical (may indicate insufficient personalization)');
    }

  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('                  TESTS COMPLETE');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Check for API key
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY not found in environment');
  console.error('   Please add it to your .env file\n');
  process.exit(1);
}

// Run tests
runTests().catch(console.error);
