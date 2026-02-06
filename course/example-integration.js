/**
 * Example Integration: How to use lesson generation in your application
 *
 * This shows the flow when a user clicks on a lesson
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { generateLesson } = require('./generateLesson');
const fs = require('fs');
const path = require('path');

/**
 * Simulates what happens when a user clicks on a lesson
 *
 * In a real application:
 * 1. User clicks a lesson in the UI
 * 2. Frontend sends a request to your backend
 * 3. Backend calls this function
 * 4. Returns the generated content to display
 */
async function onLessonClick(userId, phaseNumber, lessonNumber) {
  console.log(`\n🎯 User clicked lesson ${phaseNumber}.${lessonNumber}`);

  // Step 1: Load the user's brain
  // In a real app, this would be from a database
  const brainPath = path.join(__dirname, '../brain/user_brain.json');
  const brainData = JSON.parse(fs.readFileSync(brainPath, 'utf8'));
  const brain = brainData.brain;

  console.log(`📚 Loaded brain for user (subject: ${brain.high_level.onboarding.subject})`);

  // Step 2: Find the specific lesson from the course structure
  const phase = brain.course_structure.phases.find(p => p.phase_number === phaseNumber);
  if (!phase) {
    throw new Error(`Phase ${phaseNumber} not found`);
  }

  const lesson = phase.lessons.find(l => l.lesson_number === lessonNumber);
  if (!lesson) {
    throw new Error(`Lesson ${lessonNumber} not found in phase ${phaseNumber}`);
  }

  // Add phase info to lesson (needed for generation)
  lesson.phase_title = phase.title;
  lesson.phase_number = phase.phase_number;

  console.log(`📖 Found lesson: "${lesson.title}"`);
  console.log(`🌱 Instructional seed: ${lesson.instructional_seed.substring(0, 80)}...`);

  // Step 3: Generate the lesson content
  console.log(`\n🤖 Generating personalized content...\n`);

  const lessonContent = await generateLesson(brain, lesson);

  // Step 4: Return the content
  // In a real app, you would:
  // - Store this in a cache (so you don't regenerate on every view)
  // - Return it to the frontend as JSON
  // - Maybe track that this lesson was opened (for analytics)

  return {
    lesson: {
      title: lesson.title,
      description: lesson.description,
      phase_title: lesson.phase_title,
      phase_number: lesson.phase_number,
      lesson_number: lesson.lesson_number
    },
    content: lessonContent.content,
    mastery_criteria: lessonContent.mastery_criteria,
    generated_at: new Date().toISOString()
  };
}

/**
 * Example: Get lesson for a specific phase/lesson combination
 */
async function exampleUsage() {
  try {
    // Simulate user clicking on Phase 1, Lesson 1
    const result = await onLessonClick('user123', 1, 1);

    console.log('\n✅ SUCCESS! Here\'s what you would return to the frontend:\n');
    console.log('=' .repeat(60));
    console.log('\nLESSON METADATA:');
    console.log(JSON.stringify(result.lesson, null, 2));

    console.log('\n' + '=' .repeat(60));
    console.log('\nLESSON CONTENT (first 500 chars):');
    console.log(result.content.substring(0, 500) + '...');

    console.log('\n' + '=' .repeat(60));
    console.log('\nMASTERY CRITERIA:');
    result.mastery_criteria.forEach((criterion, idx) => {
      console.log(`  ${idx + 1}. ${criterion}`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('\n💡 In your app, this would be:');
    console.log('   1. Cached for fast retrieval on subsequent views');
    console.log('   2. Sent to the frontend as JSON');
    console.log('   3. Displayed in your lesson viewer component');
    console.log('   4. Used to track lesson progress and enable quizzes\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Example: Generate content for all lessons in a phase
 * (Use this sparingly - better to generate on-demand)
 */
async function generateAllLessonsInPhase(phaseNumber) {
  console.log(`\n🚀 Generating all lessons in Phase ${phaseNumber}...\n`);

  const brainPath = path.join(__dirname, '../brain/user_brain.json');
  const brainData = JSON.parse(fs.readFileSync(brainPath, 'utf8'));
  const brain = brainData.brain;

  const phase = brain.course_structure.phases.find(p => p.phase_number === phaseNumber);
  if (!phase) {
    throw new Error(`Phase ${phaseNumber} not found`);
  }

  const results = [];

  for (const lesson of phase.lessons) {
    console.log(`📖 Generating: ${lesson.title}`);

    lesson.phase_title = phase.title;
    lesson.phase_number = phase.phase_number;

    const content = await generateLesson(brain, lesson);
    results.push({
      lesson: lesson.title,
      content: content
    });

    console.log(`✅ Done (${content.content.length} chars)\n`);
  }

  console.log(`\n🎉 Generated ${results.length} lessons for phase "${phase.title}"\n`);
  return results;
}

// Run the example
if (require.main === module) {
  exampleUsage().catch(console.error);
}

module.exports = {
  onLessonClick,
  generateAllLessonsInPhase
};
