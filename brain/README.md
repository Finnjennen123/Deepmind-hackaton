# User Brain

The **User Brain** is the centralized data store for everything we know about a learner FOR THIS COURSE. All downstream phases (course generation, teaching, adaptation) read from this brain.

## What's Inside

```json
{
  "brain": {
    "high_level": {
      "onboarding": {
        "subject": "what the user wants to learn",
        "why": "real motivation behind learning it"
      },
      "profiling": {
        "current_level": "where they stand now",
        "vocabulary": "language comfort level",
        "skip": "what can be skipped",
        "teach_from_scratch": "what needs full explanation",
        "depth": "how deep the course should go",
        "tone": "teaching style that fits",
        "background": "relevant experience",
        "gaps": "identified weaknesses",
        "strengths": "identified strengths"
      },
      "generated_at": "timestamp"
    },
    "course_structure": {
      "// filled by course generation phase"
    },
    "low_level": {
      "// filled after each chapter - mastery scores, struggles, etc."
    }
  }
}
```

## Usage

### Create Brain Programmatically

```javascript
const { createBrain } = require('./createBrain');

const onboarding = {
  subject: "how to integrate AI into my workflow",
  why: "I'm falling behind other PMs who use AI"
};

const profiling = {
  current_level: "beginner",
  vocabulary: "non-technical, business-oriented",
  depth: "practical and applied, not theoretical",
  tone: "casual, direct"
};

const brain = createBrain(onboarding, profiling);
```

### Load From Existing Files

```javascript
const { loadBrainFromFiles, saveBrain } = require('./createBrain');

const brain = loadBrainFromFiles(
  '../onboarding-agent/onboarding_result.json',
  '../profiling-agent/learner_profile.json'
);

saveBrain(brain, './user_brain.json');
```

### Run Tests

```bash
npm test
```

## Design Principles

1. **Complete Foundation**: The `high_level` section combines BOTH onboarding (what/why) AND profiling (current level, gaps, strengths, tone, etc.). This complete picture enables truly personalized course generation.

2. **Dynamic Profiling**: The profiling section is flexible - the AI decides what fields matter for THIS user on THIS subject. Common fields include current_level, vocabulary, gaps, strengths, depth, tone, background, but it's not rigid.

3. **Future-Ready**: `course_structure` and `low_level` are empty initially but ready to be filled as the course progresses.

4. **Single Source of Truth**: Everything downstream reads from this brain. No scattered data, no multiple sources of truth.

## Next Steps

After the brain is created:
- **Course Generation** reads `high_level` (both onboarding + profiling) to generate personalized phases/chapters → fills `course_structure`
- **Teaching Phase** reads `high_level` + `course_structure` to adapt delivery
- **Mastery Tracking** writes to `low_level` after each chapter (scores, gaps, struggles)
- **Adaptation Engine** reads `low_level` to adjust future chapters based on actual performance
