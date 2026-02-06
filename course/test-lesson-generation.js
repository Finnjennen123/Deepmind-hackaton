/**
 * Test script for lesson content generation
 *
 * Run with: node course/test-lesson-generation.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { generateLesson } = require('./generateLesson');
const fs = require('fs');
const path = require('path');

async function testLessonGeneration() {
  console.log('🧪 Testing Lesson Content Generation\n');
  console.log('=' .repeat(60));
  console.log('\n');

  // Load the brain data
  const brainPath = path.join(__dirname, '../brain/user_brain.json');
  let brainData;

  try {
    const brainContent = fs.readFileSync(brainPath, 'utf8');
    brainData = JSON.parse(brainContent);
    console.log('✅ Loaded brain data');
    console.log(`   Subject: ${brainData.brain.high_level.onboarding.subject}`);
    console.log(`   Level: ${brainData.brain.high_level.profiling.current_level || brainData.brain.high_level.profiling.starting_level}`);
    console.log('\n');
  } catch (error) {
    console.error('❌ Failed to load brain data:', error.message);
    process.exit(1);
  }

  // Test lesson - you can modify this to test different lessons
  const testLesson = {
    title: "Prompt Engineering for Product Managers",
    description: "Learn the frameworks for building context-rich prompts specifically for PM tasks.",
    instructional_seed: "Teach the 'Context-Task-Constraint' framework for prompts, using specific SaaS examples like PRD drafting and user story refinement. Focus on precision and output formatting without the fluff of basic AI intros.",
    phase_title: "Core Mechanics: Mastering Prompt Engineering",
    phase_number: 1,
    lesson_number: 1
  };

  console.log('📝 Test Lesson:');
  console.log(`   Title: ${testLesson.title}`);
  console.log(`   Phase: ${testLesson.phase_title}`);
  console.log(`   Seed: ${testLesson.instructional_seed}`);
  console.log('\n');
  console.log('=' .repeat(60));
  console.log('\n');

  try {
    // Generate the lesson
    const lessonContent = await generateLesson(brainData.brain, testLesson);

    console.log('=' .repeat(60));
    console.log('\n📖 GENERATED LESSON CONTENT:\n');
    console.log('=' .repeat(60));
    console.log('\n');
    console.log(lessonContent.content);
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('\n🎯 MASTERY CRITERIA:\n');
    lessonContent.mastery_criteria.forEach((criterion, idx) => {
      console.log(`   ${idx + 1}. ${criterion}`);
    });
    console.log('\n');
    console.log('=' .repeat(60));
    console.log('\n');

    // Quality checks
    console.log('🔍 QUALITY CHECKS:\n');

    const profiling = brainData.brain.high_level.profiling || {};
    const checks = {
      'Follows instructional seed': testLesson.instructional_seed.toLowerCase().includes('context-task-constraint') &&
                                     lessonContent.content.toLowerCase().includes('context'),
      'Appropriate depth': profiling.depth ?
                          (profiling.depth.toLowerCase().includes('practical') &&
                          !lessonContent.content.toLowerCase().includes('theoretical')) : true,
      'Matches tone': profiling.tone ?
                     (profiling.tone.toLowerCase().includes('casual') &&
                     !lessonContent.content.match(/herein|thereof|furthermore/i)) : true,
      'Uses learner background': profiling.background ?
                                (lessonContent.content.toLowerCase().includes('notion') ||
                                 lessonContent.content.toLowerCase().includes('linear') ||
                                 lessonContent.content.toLowerCase().includes('saas')) : true,
      'Focused on one topic': lessonContent.content.split('\n').length < 200, // Reasonable length
      'Has concrete mastery criteria': lessonContent.mastery_criteria.length >= 2 &&
                                       lessonContent.mastery_criteria.length <= 5 &&
                                       !lessonContent.mastery_criteria.some(c => c.toLowerCase().includes('understands ai'))
    };

    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`   ${passed ? '✅' : '⚠️'}  ${check}`);
    });

    console.log('\n');
    console.log('=' .repeat(60));
    console.log('\n');

    // Save the generated lesson to a file
    const outputPath = path.join(__dirname, 'generated-lesson-output.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      lesson: testLesson,
      generated_content: lessonContent,
      generated_at: new Date().toISOString()
    }, null, 2));

    console.log(`✅ Saved generated lesson to: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testLessonGeneration();
