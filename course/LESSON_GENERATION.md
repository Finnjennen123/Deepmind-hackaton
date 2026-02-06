# Lesson Content Generation

Generate personalized lesson content on-demand based on the learner's brain and lesson's instructional seed.

## Why Generate On-Click?

Two critical reasons:

1. **Quality**: Generating all lesson content at once would fatigue the model and produce worse quality
2. **Adaptivity**: Later lessons can adapt based on mastery data from previous lessons. A lesson generated AFTER the user struggled will be different than one generated after they breezed through it.

## How It Works

### The Flow

```
User clicks lesson
    ↓
Load full brain JSON (high_level + low_level)
    ↓
Get lesson's instructional_seed
    ↓
Make API call to Gemini
    ↓
Return { content, mastery_criteria }
    ↓
Display to user
```

### What Gets Passed to the API

```javascript
const lessonContent = await generateLesson(brain, lesson);
```

**Brain includes:**
- `high_level.onboarding`: What they want to learn and why
- `high_level.profiling`: Their level, vocabulary, gaps, strengths, background, depth, tone, skip list, teach-from-scratch list
- `low_level`: Mastery data from previous lessons (may be empty early in the course)

**Lesson includes:**
- `title`: The lesson title
- `description`: What this lesson covers
- `instructional_seed`: The main directive - tells AI exactly what to teach and at what angle
- `phase_title`: Which phase this belongs to
- `phase_number` and `lesson_number`: Position in the course

### What Gets Returned

```json
{
  "content": "Full lesson content as markdown string",
  "mastery_criteria": [
    "Can explain the Context-Task-Constraint framework",
    "Knows how to structure a prompt for PRD generation",
    "Understands when to use few-shot examples"
  ]
}
```

## Files

### Core Files

- **`lessonPrompt.js`** - System prompt for lesson generation
- **`generateLesson.js`** - Main function that makes the API call

### Testing & Examples

- **`test-lesson-generation.js`** - Comprehensive test with quality checks
- **`example-integration.js`** - Shows how to integrate into your app

## Usage

### Basic Usage

```javascript
const { generateLesson } = require('./course/generateLesson');

// When user clicks a lesson
const lessonContent = await generateLesson(brain, lesson);

// Display to user
console.log(lessonContent.content);
console.log(lessonContent.mastery_criteria);
```

### Full Integration Example

```javascript
async function onLessonClick(userId, phaseNumber, lessonNumber) {
  // 1. Load user's brain from database
  const brain = await db.getBrain(userId);

  // 2. Find the specific lesson
  const phase = brain.course_structure.phases.find(p => p.phase_number === phaseNumber);
  const lesson = phase.lessons.find(l => l.lesson_number === lessonNumber);

  // Add phase context
  lesson.phase_title = phase.title;
  lesson.phase_number = phase.phase_number;

  // 3. Generate content (or retrieve from cache)
  let lessonContent = await cache.get(`lesson_${userId}_${phaseNumber}_${lessonNumber}`);

  if (!lessonContent) {
    lessonContent = await generateLesson(brain, lesson);
    await cache.set(`lesson_${userId}_${phaseNumber}_${lessonNumber}`, lessonContent);
  }

  // 4. Return to frontend
  return {
    lesson: {
      title: lesson.title,
      description: lesson.description,
      phase_title: lesson.phase_title
    },
    content: lessonContent.content,
    mastery_criteria: lessonContent.mastery_criteria
  };
}
```

## Testing

### Run the test suite:

```bash
cd course
npm run test-lesson
```

This will:
- Load a brain from `brain/user_brain.json`
- Generate content for a test lesson
- Run quality checks
- Save output to `generated-lesson-output.json`

### Quality Checks

The test verifies:

✅ **Follows instructional seed** - Content matches the lesson's directive
✅ **Appropriate depth** - Matches learner's preferred depth (practical vs theoretical)
✅ **Matches tone** - Casual vs professional based on profiling
✅ **Uses learner background** - Makes content relatable using their context
✅ **Focused on one topic** - Doesn't wander, stays on the lesson's topic
✅ **Concrete mastery criteria** - 2-5 testable criteria, specific and actionable

## System Prompt Design

The lesson generation prompt is designed to:

1. **Follow the instructional seed** - This is the main directive
2. **Match learner profile** - Tone, depth, vocabulary, background
3. **Leverage strengths** - Use what they know as bridges
4. **Address gaps** - Focus on what they need to learn
5. **Adapt to mastery data** - If `low_level` has data, adjust accordingly
6. **Teach, don't lecture** - Mentor tone, not textbook
7. **Stay focused** - One lesson, one topic

## Mastery Criteria

Each lesson generates 2-5 mastery criteria that:

- Define what "understood this lesson" means
- Are concrete and testable (not vague like "understands AI")
- Can be turned into quiz questions
- Determine if learner can move forward

### Good Examples:
- "Can explain the Context-Task-Constraint framework"
- "Knows when to use few-shot examples vs zero-shot"
- "Can identify 3 PM tasks where AI tools add value"

### Bad Examples:
- "Understands AI" (too vague)
- "Knows about prompts" (not testable)
- "Has learned the material" (meaningless)

## API Configuration

### Model

Default: `google/gemini-2.5-flash-preview`

This can be overridden:

```javascript
const lessonContent = await generateLesson(brain, lesson, {
  model: "google/gemini-3-flash-preview"
});
```

### Environment Variables

Required: `OPENROUTER_API_KEY`

Set in your `.env` file:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

## Best Practices

### DO:
✅ Generate lessons on-demand when user clicks
✅ Cache generated lessons to avoid redundant API calls
✅ Pass the FULL brain (high_level + low_level) even if low_level is empty
✅ Include phase context (phase_title, phase_number) in lesson data
✅ Use mastery criteria to build quizzes and track progress

### DON'T:
❌ Generate all lessons upfront (wastes money and reduces quality)
❌ Skip low_level in the brain data (it needs to be there for later)
❌ Force personalization where it doesn't add value
❌ Make mastery criteria vague or untestable

## Future Enhancements

As the system evolves, lesson generation will automatically adapt because:

1. **low_level mastery data** - Later lessons will see previous performance
2. **No code changes needed** - The prompt already handles empty or populated low_level
3. **Adaptive difficulty** - If user struggles, future lessons slow down and reinforce

The system is designed to get smarter as it learns about the user.

## Example Output

See `generated-lesson-output.json` after running the test for a complete example of generated content.

## Troubleshooting

### "OPENROUTER_API_KEY not found"
Make sure you have a `.env` file in the root directory with your API key.

### "Brain must have a high_level property"
Ensure you're passing the brain data in the correct structure: `{ high_level: {...}, low_level: {...} }`

### "Generated lesson is missing required fields"
The API returned invalid JSON. Check your system prompt or model configuration.

### Content is too generic / not personalized
- Check that the brain profiling data is detailed enough
- Verify the instructional_seed is specific and clear
- Make sure you're passing the full brain, not just high_level

## Support

For issues or questions:
- Check the test output for quality validation
- Review the example-integration.js for correct usage patterns
- Ensure your brain data has complete profiling information
