# Course Structure Generator

AI-powered course structure generation that creates personalized learning paths based on complete learner profiles.

## What It Does

Takes a **user brain** (from onboarding + profiling) and generates a custom course structure:
- **Phases**: Major thematic sections that build on each other
- **Lessons**: Specific topics within each phase
- **Instructional Seeds**: Internal guidance for future content generation

The structure is NOT generic — it's shaped by EVERYTHING we know about the learner.

## How Personalization Works

The AI reads the complete `brain.high_level` and uses ALL of it:

| Brain Field | How It Shapes the Course |
|-------------|--------------------------|
| `subject` | Determines what phases exist |
| `why` | Determines angle and focus |
| `current_level` | Determines where course starts |
| `skip` | Topics that won't appear |
| `teach_from_scratch` | Topics that get dedicated lessons |
| `depth` | How granular and how many lessons |
| `gaps` | Specific areas that need coverage |
| `strengths` | Things to build on, not re-teach |
| `background` | Shapes examples and framing |
| `tone` | Affects lesson titles and style |

**Same subject + different profile = different structure.**

## Usage

### Generate Structure from Brain

```bash
cd course
npm run generate -- --brain ../brain/user_brain.json

# Or with custom output path
node generate.js --brain ../brain/user_brain.json --output ./updated_brain.json

# Save structure separately
node generate.js --brain ../brain/user_brain.json --structure-only ./structure.json
```

### Use Programmatically

```javascript
const { generateCourseStructure } = require('./generateStructure');
const { updateCourseStructure } = require('../brain/updateCourseStructure');

// Load brain
const brain = require('../brain/user_brain.json');

// Generate structure
const structure = await generateCourseStructure(brain);

// Update brain
const updatedBrain = updateCourseStructure(brain, structure);

// Save
fs.writeFileSync('./brain_with_structure.json', JSON.stringify(updatedBrain, null, 2));
```

## Output Structure

```json
{
  "title": "Course title reflecting subject and learner's angle",
  "phases": [
    {
      "phase_number": 1,
      "title": "Phase Title",
      "description": "What learner can do after this phase",
      "lessons": [
        {
          "lesson_number": 1,
          "title": "Specific Lesson Title",
          "description": "What this lesson covers",
          "instructional_seed": "Internal guidance for content generator"
        }
      ]
    }
  ],
  "generated_at": "2025-02-06T10:30:00Z"
}
```

## Testing

Run the test suite to see personalization in action:

```bash
npm test
```

The tests:
1. Generate a structure for a beginner PM learning AI tools
2. Generate a structure for a technical PM with the same subject
3. Compare them to verify they're different (proving personalization)

### What Good Tests Check

- ✅ Skip items are absent (e.g., no "What is AI?" lesson if it's in the skip list)
- ✅ Teach-from-scratch items are present (each gets a dedicated lesson)
- ✅ Gaps are addressed (each gap maps to at least one lesson)
- ✅ Depth matches profile (practical learners get practical structure, no theory-heavy phases)
- ✅ Tone matches (casual learners get casual titles, professional learners get professional titles)
- ✅ **SAME subject + DIFFERENT profile = DIFFERENT structures** (the key test!)

## Configuration

### Environment Variables

```bash
OPENROUTER_API_KEY=your_key_here
```

### Model Selection

Default: `google/gemini-2.0-flash-exp:free`

Change in code:
```javascript
const structure = await generateCourseStructure(brain, {
  model: "google/gemini-2.5-flash-preview"
});
```

## Files

```
course/
├── generateStructure.js    # Core API logic
├── structurePrompt.js      # System prompt for AI
├── generate.js             # CLI tool
├── test.js                 # Test suite
├── package.json            # Package config
└── README.md               # This file
```

## Integration with Brain

The course structure gets written to `brain.course_structure`:

**Before:**
```json
{
  "brain": {
    "high_level": { /* filled */ },
    "course_structure": {},
    "low_level": {}
  }
}
```

**After:**
```json
{
  "brain": {
    "high_level": { /* filled */ },
    "course_structure": {
      "title": "...",
      "phases": [...],
      "generated_at": "..."
    },
    "low_level": {}
  }
}
```

## Next Steps

After generating the course structure:
1. **Teaching Agent** reads `brain.course_structure` and delivers lessons
2. **Mastery Tracker** writes to `brain.low_level` after each lesson
3. **Adaptation Engine** adjusts structure based on actual performance

## Example Flow

```
User Brain (high_level filled)
    ↓
generateCourseStructure(brain)
    ↓
AI reads complete profile
    ↓
Generates personalized phases + lessons
    ↓
updateCourseStructure(brain, structure)
    ↓
Brain now has course_structure filled
    ↓
Ready for teaching phase
```
