# Learning System Overview

Complete pipeline for AI-powered personalized learning, from onboarding to course delivery.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LEARNING SYSTEM FLOW                      │
└─────────────────────────────────────────────────────────────┘

Phase 1: Voice Onboarding
┌──────────────────────────┐
│  User speaks learning    │
│  goal in natural voice   │
└──────────┬───────────────┘
           │
           ├─→ onboarding_result.json
           │   { subject, why, summary }
           ▼

Phase 2: Identity Profiling
┌──────────────────────────┐
│  AI probes to understand │
│  learner profile deeply  │
└──────────┬───────────────┘
           │
           ├─→ learner_profile.json
           │   { current_level, gaps, strengths,
           │     depth, tone, skip, teach_from_scratch }
           ▼

Phase 3: Brain Creation
┌──────────────────────────┐
│  Combine onboarding +    │
│  profiling into unified  │
│  learner brain           │
└──────────┬───────────────┘
           │
           ├─→ user_brain.json
           │   { brain: {
           │       high_level: { onboarding, profiling },
           │       course_structure: {},
           │       low_level: {}
           │   }}
           ▼

Phase 4: Course Structure Generation
┌──────────────────────────┐
│  AI generates personalized│
│  course phases & lessons │
│  based on complete brain  │
└──────────┬───────────────┘
           │
           ├─→ Updates brain.course_structure
           │   { title, phases: [
           │       { phase_number, title, description,
           │         lessons: [ { lesson_number, title,
           │                      description, instructional_seed } ]
           │       }
           │   ]}
           ▼

Phase 5: Teaching (NEXT)
┌──────────────────────────┐
│  Deliver lessons based   │
│  on structure, track     │
│  mastery                 │
└──────────────────────────┘
```

## Data Flow

### Input: Raw User Intent
```
"I want to learn the history of tech founders so I can
 apply those lessons to my startup"
```

### Step 1: Structured Onboarding
```json
{
  "subject": "history of modern tech founders and entrepreneurs",
  "why": "to gain practical business-building knowledge for their own startup",
  "summary": "Founder wants to study tech entrepreneur strategies"
}
```

### Step 2: Deep Profiling
```json
{
  "starting_level": "complete beginner - no prior knowledge",
  "depth": "solid working knowledge",
  "focus_areas": "fundraising, product-market fit, tactical lessons",
  "skip_areas": "deep biographical details, pre-modern history",
  "learner_context": "Current startup founder looking for actionable insights"
}
```

### Step 3: Unified Brain
```json
{
  "brain": {
    "high_level": {
      "onboarding": { /* subject, why */ },
      "profiling": { /* 9+ personalization fields */ }
    }
  }
}
```

### Step 4: Personalized Course Structure
```json
{
  "title": "Founder's Playbook: Strategic History of Modern Tech Titans",
  "phases": [
    {
      "phase_number": 1,
      "title": "The Dawn of the Digital Ecosystem",
      "lessons": [
        {
          "lesson_number": 1,
          "title": "Identifying Opportunity: Netscape and the Consumer Internet",
          "instructional_seed": "Focus on early market signals rather than technical specs"
        }
      ]
    }
  ]
}
```

## Module Structure

```
Deepmind-hackaton/
├── onboarding-agent/          # Phase 1: Voice onboarding
│   ├── index.js               # Main agent logic
│   └── onboarding_result.json # Output
│
├── profiling-agent/           # Phase 2: Identity profiling
│   ├── index.js               # Conversational profiling agent
│   └── learner_profile.json   # Output
│
├── brain/                     # Phase 3: Brain creation & management
│   ├── createBrain.js         # Combines onboarding + profiling
│   ├── updateCourseStructure.js # Adds course structure to brain
│   ├── generate-brain.js      # CLI: create brain from files
│   └── user_brain.json        # The complete brain
│
├── course/                    # Phase 4: Course structure generation
│   ├── generateStructure.js   # AI-powered structure generation
│   ├── structurePrompt.js     # System prompt for AI
│   ├── generate.js            # CLI: generate course structure
│   └── test.js                # Personalization verification tests
│
└── SYSTEM_OVERVIEW.md         # This file
```

## How Personalization Works

The brain-driven approach ensures every course is unique to the learner:

| Brain Field | Impact on Course Structure |
|-------------|---------------------------|
| `subject` | Determines what phases exist |
| `why` | Shapes the angle and focus of content |
| `current_level` | Controls where course starts (skip basics vs. start from zero) |
| `skip` | Topics that won't appear in the course |
| `teach_from_scratch` | Topics that get dedicated lessons |
| `depth` | Controls granularity and lesson count |
| `gaps` | Ensures specific weaknesses are addressed |
| `strengths` | Leveraged, not re-taught |
| `background` | Shapes examples and framing |
| `tone` | Affects lesson titles and teaching style |

**Example: Same subject, different learners = different courses**

**Learner A:** Beginner PM, wants practical AI tools knowledge
- Course: 5 phases, casual tone, tool-focused, no theory
- Titles: "Build Your First AI Workflow", "When NOT to Use AI"

**Learner B:** Technical PM, wants to build AI-first products
- Course: 4 phases, technical tone, deep on architecture, includes theory
- Titles: "AI Product Architecture Patterns", "Model Selection Tradeoffs"

## Running the System

### Complete Pipeline

```bash
# 1. Run voice onboarding (manual for now)
cd onboarding-agent
node index.js

# 2. Run profiling (manual for now)
cd profiling-agent
node index.js

# 3. Create brain
cd brain
npm run generate

# 4. Generate course structure
cd course
npm run generate

# Result: brain/user_brain.json now has complete high_level + course_structure
```

### Quick Test

```bash
cd course
npm test
```

This runs the full pipeline programmatically with test data.

## API Requirements

**OpenRouter API Key** required for:
- Profiling agent (Gemini)
- Course structure generation (Gemini)

Set in `.env`:
```
OPENROUTER_API_KEY=your_key_here
```

## Next Phase: Teaching Agent

After course structure is generated, the next step is to build:

**Teaching Agent** that:
- Reads `brain.high_level` (for tone, depth, examples)
- Reads `brain.course_structure` (for what to teach)
- Generates actual lesson content using `instructional_seed`
- Delivers lessons interactively
- Tracks mastery and writes to `brain.low_level`

**Adaptation Engine** that:
- Reads `brain.low_level` (performance data)
- Adjusts `brain.course_structure` based on struggles
- Personalizes future lessons dynamically

## Key Design Principles

1. **Single Source of Truth**: The brain is the only data store. Everything reads from it.

2. **Dynamic Profiling**: Profiling fields aren't hardcoded. The AI decides what matters for THIS learner.

3. **Complete Context**: Course generation gets BOTH onboarding AND profiling. That's what enables true personalization.

4. **Instructional Seeds**: Course structure doesn't contain teaching content, just guidance for future content generation.

5. **Testable Personalization**: Different profiles with the same subject should produce meaningfully different courses.

## Validation Checklist

✅ **Brain Creation**
- Combines onboarding + profiling correctly
- Validates required fields (subject, why)
- Timestamps generation

✅ **Course Structure Generation**
- Uses complete `brain.high_level` as input
- Respects skip list (absent topics)
- Covers teach-from-scratch items (dedicated lessons)
- Addresses gaps (lessons for weaknesses)
- Matches depth preference
- Matches tone in titles
- Validates structure completeness

✅ **Personalization**
- Same subject + different profile = different structure
- All brain fields influence output
- No generic, one-size-fits-all courses
