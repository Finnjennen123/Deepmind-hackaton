# AI-Powered Personalized Learning System

A complete pipeline that transforms voice input into fully personalized courses, powered by AI at every step.

## What This System Does

1. **Listens** to what you want to learn (voice onboarding)
2. **Understands** who you are as a learner (AI profiling)
3. **Creates** a learner brain (unified profile)
4. **Generates** a personalized course structure (AI-driven)
5. **Delivers** customized lessons (coming next)

## The Key Insight

**Same subject + different learner = different course**

Traditional courses are one-size-fits-all. This system generates a unique course for EACH learner based on:
- What they want to learn
- WHY they want to learn it
- Where they're starting from
- What they already know
- What they need to skip
- How deep they want to go
- Their learning style and tone preference

## Quick Start

### Setup

```bash
# Install dependencies
cd brain && npm install
cd ../course && npm install

# Set API key
echo "OPENROUTER_API_KEY=your_key" > .env
```

### Generate a Complete Brain + Course

```bash
# Option 1: Use existing data from onboarding/profiling agents
cd brain
npm run generate  # Creates brain from agent outputs

cd ../course
npm run generate  # Generates course structure

# Option 2: See it work programmatically
cd course
npm test
```

### Verify Personalization

```bash
cd course
npm run verify
```

This generates courses for two different learners learning the same subject. If personalization works, they should be meaningfully different.

## System Architecture

```
Voice Input
    ↓
┌─────────────────────────────────────┐
│  Phase 1: Voice Onboarding          │
│  "I want to learn X because Y"      │
└────────────┬────────────────────────┘
             ↓
     onboarding_result.json
     { subject, why }
             ↓
┌─────────────────────────────────────┐
│  Phase 2: AI Profiling              │
│  Deep questions to understand       │
│  learner identity                   │
└────────────┬────────────────────────┘
             ↓
     learner_profile.json
     { level, gaps, strengths, depth... }
             ↓
┌─────────────────────────────────────┐
│  Phase 3: Brain Creation            │
│  Combine onboarding + profiling     │
└────────────┬────────────────────────┘
             ↓
     user_brain.json
     { high_level: { onboarding, profiling } }
             ↓
┌─────────────────────────────────────┐
│  Phase 4: Course Generation (AI)    │
│  Generate phases + lessons based    │
│  on COMPLETE learner profile        │
└────────────┬────────────────────────┘
             ↓
     course_structure (in brain)
     { phases: [...], lessons: [...] }
             ↓
┌─────────────────────────────────────┐
│  Phase 5: Teaching (NEXT)           │
│  Deliver personalized lessons       │
└─────────────────────────────────────┘
```

## Project Structure

```
.
├── onboarding-agent/          # Phase 1: Voice onboarding
│   ├── index.js
│   └── onboarding_result.json
│
├── profiling-agent/           # Phase 2: Identity profiling
│   ├── index.js
│   └── learner_profile.json
│
├── brain/                     # Phase 3: Brain management
│   ├── createBrain.js         # Combines onboarding + profiling
│   ├── updateCourseStructure.js
│   ├── generate-brain.js      # CLI tool
│   └── user_brain.json        # The complete brain
│
├── course/                    # Phase 4: Course generation
│   ├── generateStructure.js   # AI course generation
│   ├── structurePrompt.js     # System prompt
│   ├── generate.js            # CLI tool
│   ├── test.js                # Tests
│   └── verify-personalization.js  # Proves personalization works
│
└── SYSTEM_OVERVIEW.md         # Detailed architecture docs
```

## Example Output

### Input: User Brain

```json
{
  "high_level": {
    "onboarding": {
      "subject": "history of modern tech founders",
      "why": "to gain practical business knowledge for my startup"
    },
    "profiling": {
      "starting_level": "complete beginner",
      "depth": "solid working knowledge",
      "focus_areas": "fundraising, product-market fit, tactical lessons",
      "skip_areas": "biographical details, pre-modern history",
      "learner_context": "Current startup founder"
    }
  }
}
```

### Output: Personalized Course

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
          "description": "Study Marc Andreessen's market creation",
          "instructional_seed": "Focus on finding early signals rather than technical specs"
        }
      ]
    }
  ]
}
```

Notice how the course is:
- Titled for a founder (not generic)
- Focused on strategy (not biography)
- Starts with opportunity identification (actionable)
- Uses founder-relevant examples (Netscape, not academia)

## How Personalization Works

Every field in the brain matters:

| Field | Effect on Course |
|-------|-----------------|
| `subject` | What the course is about |
| `why` | Shapes the angle and focus |
| `current_level` | Where to start (skip basics or start from zero) |
| `skip` | Topics that won't appear |
| `teach_from_scratch` | Topics that get dedicated lessons |
| `depth` | How granular, how many lessons |
| `gaps` | Weaknesses that need addressing |
| `strengths` | Things to build on, not re-teach |
| `background` | Shapes examples and framing |
| `tone` | Affects titles and style |

## Testing Personalization

The key test: **Do different learners get different courses?**

```bash
cd course
npm run verify
```

This generates two courses for the same subject but different learners:
- **Learner A**: Beginner PM, wants practical tools only
- **Learner B**: Technical PM, wants deep AI product knowledge

The structures should be meaningfully different in:
- ✅ Course titles
- ✅ Phase topics
- ✅ Lesson granularity
- ✅ Tone and terminology
- ✅ What's included vs. skipped

## API Requirements

**OpenRouter API Key** required for:
- Identity profiling (Gemini)
- Course structure generation (Gemini)

Add to `.env`:
```
OPENROUTER_API_KEY=your_key_here
```

Get a key at: https://openrouter.ai

## What's Built

✅ **Phase 1**: Voice onboarding
✅ **Phase 2**: AI identity profiling
✅ **Phase 3**: Brain creation and management
✅ **Phase 4**: AI-powered course structure generation

## What's Next

🚧 **Phase 5**: Teaching agent
- Read course structure
- Generate actual lesson content from `instructional_seed`
- Deliver lessons interactively
- Track mastery and write to `brain.low_level`

🚧 **Phase 6**: Adaptation engine
- Read performance data from `brain.low_level`
- Adjust future lessons based on struggles
- Personalize delivery dynamically

## Key Design Principles

1. **Brain is the single source of truth** - Everything reads from it
2. **Dynamic profiling** - AI decides what to ask based on the learner
3. **Complete context** - Course generation sees onboarding + profiling together
4. **Instructional seeds** - Structure guides future content generation
5. **Testable personalization** - Different profiles = different courses

## Documentation

- **SYSTEM_OVERVIEW.md** - Complete architecture and data flow
- **brain/README.md** - Brain structure and usage
- **brain/INTEGRATION.md** - How phases connect
- **course/README.md** - Course generation details

## Running the Full Pipeline

```bash
# 1. Onboarding (run manually or use existing data)
cd onboarding-agent
node index.js

# 2. Profiling (run manually or use existing data)
cd profiling-agent
node index.js

# 3. Create brain
cd brain
npm run generate

# 4. Generate course
cd course
npm run generate

# 5. View result
cat ../brain/user_brain.json
```

Result: A complete `user_brain.json` with:
- `high_level` filled (onboarding + profiling)
- `course_structure` filled (personalized phases + lessons)
- `low_level` empty (ready for teaching phase)

## Example Use Cases

**Use Case 1: Product Manager Learning AI**
- Subject: "AI tools for PMs"
- Profile: Non-technical, beginner, wants practical only
- Result: 5-phase course on tool selection, workflows, no theory

**Use Case 2: Founder Learning Tech History**
- Subject: "History of tech founders"
- Profile: Startup founder, wants tactical lessons
- Result: 4-phase course on strategy, fundraising, PMF (no biography)

**Use Case 3: Developer Learning Product**
- Subject: "Product management"
- Profile: Engineer, wants to transition to PM
- Result: Course that leverages technical background, focuses on business skills

Each learner gets a completely different course structure, even if the subject is similar.

## Contributing

See individual module READMEs for development details:
- `brain/README.md` - Brain system
- `course/README.md` - Course generation

## License

MIT
