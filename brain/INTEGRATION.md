# Brain Integration Guide

## Overview

The User Brain is the central data store that bridges Phase 1 (Onboarding) and Phase 2 (Profiling), preparing the system for Phase 3 (Course Generation).

## Files

```
brain/
├── createBrain.js           # Core brain creation logic
├── generate-brain.js        # CLI tool for generating brains
├── test.js                  # Test suite with examples
├── example-pipeline.js      # Complete pipeline demonstration
├── package.json             # Package configuration
├── README.md                # Documentation
├── INTEGRATION.md           # This file
├── user_brain.json          # Generated from actual project data
└── example_brain.json       # Generated from example data
```

## Quick Start

### 1. Generate Brain from Existing Agent Outputs

```bash
cd brain
npm run generate

# Or with custom paths:
node generate-brain.js \
  --onboarding ../onboarding-agent/onboarding_result.json \
  --profiling ../profiling-agent/learner_profile.json \
  --output ./my_brain.json
```

### 2. Use in Code

```javascript
const { createBrain, loadBrainFromFiles, saveBrain } = require('./createBrain');

// Option A: Create from data objects
const brain = createBrain(onboardingData, profilingData);

// Option B: Load from files
const brain = loadBrainFromFiles(
  './onboarding_result.json',
  './learner_profile.json'
);

// Save the brain
saveBrain(brain, './user_brain.json');
```

## Integration Points

### Input Sources

**Phase 1: Onboarding Agent**
- Location: `../onboarding-agent/onboarding_result.json`
- Required fields:
  - `subject` - what the user wants to learn
  - `why` or `reason` - why they want to learn it
- Optional fields:
  - `summary` - high-level summary

**Phase 2: Profiling Agent**
- Location: `../profiling-agent/learner_profile.json`
- Dynamic fields (AI decides what to collect):
  - `current_level` / `starting_level`
  - `vocabulary`
  - `skip` / `skip_areas`
  - `teach_from_scratch`
  - `depth`
  - `tone`
  - `background`
  - `gaps`
  - `strengths`
  - `focus_areas`
  - `learner_context`
  - `notes`
  - ... and any other fields the profiling AI adds

### Output Structure

```json
{
  "brain": {
    "high_level": {
      "onboarding": {
        "subject": "string",
        "why": "string",
        "summary": "string (optional)"
      },
      "profiling": {
        "// dynamic fields from profiling agent"
      },
      "generated_at": "ISO timestamp"
    },
    "course_structure": {
      "// empty for now, filled by course generation"
    },
    "low_level": {
      "// empty for now, filled by mastery tracking"
    }
  }
}
```

### Output Consumers

**Phase 3: Course Generation (next to build)**
- Reads: `brain.high_level` (both onboarding + profiling)
- Writes to: `brain.course_structure`
- Purpose: Generate personalized course phases/chapters

**Phase 4: Teaching Agent (future)**
- Reads: `brain.high_level` + `brain.course_structure`
- Writes to: `brain.low_level`
- Purpose: Deliver lessons and track mastery

**Phase 5: Adaptation Engine (future)**
- Reads: `brain.low_level`
- Updates: `brain.course_structure` (adjusts based on performance)
- Purpose: Adapt course to actual user performance

## Data Flow

```
Onboarding Agent → onboarding_result.json ─┐
                                            ├─→ Brain Creation → user_brain.json → Course Generation
Profiling Agent → learner_profile.json ────┘
```

## Testing

Run the test suite:

```bash
npm test
```

See the complete pipeline in action:

```bash
node example-pipeline.js
```

## Error Handling

The brain creator validates:
- Both inputs are valid objects
- `subject` field exists in onboarding data
- `why` or `reason` field exists in onboarding data

Missing profiling fields are acceptable - the profiling data is dynamic.

## Next Steps

1. Build Course Generation Agent
   - Input: `brain.high_level` (complete onboarding + profiling)
   - Output: `brain.course_structure` (phases, chapters, learning objectives)
   - Use the complete profile to personalize depth, tone, and content

2. Build Teaching Agent
   - Input: `brain.high_level` + `brain.course_structure`
   - Output: Delivered lessons + updates to `brain.low_level`

3. Build Adaptation Engine
   - Input: `brain.low_level` (mastery scores, struggles)
   - Output: Adjusted course structure based on performance
