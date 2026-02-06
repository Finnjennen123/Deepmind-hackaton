# Quick Start Guide

## 1-Minute Overview

This system creates **personalized courses** based on complete learner profiles. Different learners learning the same subject get different courses.

## 🚀 Test Everything (Easiest Way)

```bash
npm run demo
```

This single command runs the **complete pipeline**:
- ✅ Phase 1: Voice Onboarding (simulated)
- ✅ Phase 2: AI Profiling (simulated)
- ✅ Phase 3: Brain Creation
- ✅ Phase 4: AI Course Generation
- ✅ Shows personalized results
- ✅ Validates personalization worked

**Output:**
- `demo_brain_before.json` - Brain with profile only
- `demo_brain_complete.json` - Brain with generated course

Takes ~10 seconds. No manual input needed.

---

## Essential Commands

### Generate Brain from Existing Data

```bash
cd brain
npm run generate
```

Creates `user_brain.json` from `onboarding_result.json` + `learner_profile.json`

### Generate Course Structure

```bash
cd course
npm run generate
```

Uses AI to create personalized course phases + lessons, updates `brain/user_brain.json`

### Verify Personalization Works

```bash
cd course
npm run verify
```

Generates two different courses for the same subject with different learners - proves personalization

### Run Full Test Suite

```bash
cd course
npm test
```

Tests the complete pipeline with example data

## What You'll See

After running the full pipeline, `brain/user_brain.json` will contain:

```json
{
  "brain": {
    "high_level": {
      "onboarding": { /* what + why */ },
      "profiling": { /* level, gaps, depth, tone, etc. */ }
    },
    "course_structure": {
      "title": "Personalized Course Title",
      "phases": [
        {
          "phase_number": 1,
          "title": "Phase Title",
          "lessons": [
            {
              "lesson_number": 1,
              "title": "Specific Lesson Title",
              "description": "What this lesson covers",
              "instructional_seed": "How to teach this lesson"
            }
          ]
        }
      ]
    }
  }
}
```

## Key Files

| File | What It Is |
|------|-----------|
| `onboarding-agent/onboarding_result.json` | Phase 1 output: subject + why |
| `profiling-agent/learner_profile.json` | Phase 2 output: deep learner profile |
| `brain/user_brain.json` | Combined brain + generated course |
| `course/personalization_comparison.json` | Proof that personalization works |

## Prerequisites

```bash
# Install dependencies
cd brain && npm install
cd ../course && npm install

# Set API key in .env at project root
echo "OPENROUTER_API_KEY=your_key_here" > .env
```

## Expected Results

### Brain Creation
- ✅ Combines onboarding + profiling
- ✅ Validates required fields
- ✅ Creates unified data structure

### Course Generation
- ✅ Generates 3-6 phases (varies by learner)
- ✅ Each phase has 2-5 lessons (varies by depth)
- ✅ Respects skip list (excluded topics)
- ✅ Covers teach-from-scratch items
- ✅ Addresses identified gaps
- ✅ Matches learner's depth preference
- ✅ Matches learner's tone

### Personalization Verification
- ✅ Different titles for different learners
- ✅ Different phase structures
- ✅ Different lesson topics
- ✅ Different granularity based on depth

## Troubleshooting

**API Error 404 "No endpoints found"**
- Model name might be wrong
- Try: `google/gemini-3-flash-preview`
- Or check OpenRouter for current models

**"Brain must have high_level property"**
- Brain structure has changed
- Should be auto-handled, but check `generateStructure.js`

**"OPENROUTER_API_KEY not found"**
- Create `.env` file in project root
- Add: `OPENROUTER_API_KEY=your_key`

## Next Steps

After generating course structure:
1. Review the generated phases/lessons in `brain/user_brain.json`
2. Build teaching agent to deliver actual lesson content
3. Add mastery tracking to `brain.low_level`
4. Build adaptation engine to adjust based on performance

## Full Documentation

- `README.md` - Complete system overview
- `SYSTEM_OVERVIEW.md` - Detailed architecture
- `brain/README.md` - Brain module docs
- `brain/INTEGRATION.md` - How phases connect
- `course/README.md` - Course generation docs
