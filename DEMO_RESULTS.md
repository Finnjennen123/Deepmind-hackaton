# Demo Results

## What the Demo Does

The `npm run demo` command runs the **entire pipeline** in ~10 seconds:

```
Voice Input (simulated)
    ↓
Onboarding Data Extraction
    ↓
AI Identity Profiling (simulated)
    ↓
Brain Creation
    ↓
AI Course Generation
    ↓
Personalized Course Structure
```

## Sample Output

### Learner Profile

**Subject:** "How to integrate AI tools into my product management workflow"

**Why:** "I'm a PM and I keep seeing other PMs ship faster using AI"

**Profile:**
- Current level: Beginner (used ChatGPT a few times)
- Depth: Practical only, no theory
- Skip: Neural networks, AI history, ML theory
- Teach from scratch: Prompt engineering, tool evaluation, workflow integration
- Gaps: Doesn't know what tools exist, no systematic approach
- Strengths: Strong product intuition, data-literate

### Generated Course

**Title:** "The AI-Powered PM: Modernizing Your Product Workflow for Speed"

**Structure:**
- 4 Phases
- 9 Lessons total

**Phase Breakdown:**

1. **Core Mechanics: Mastering Prompt Engineering** (2 lessons)
   - Prompt Engineering for Product Managers
   - Iterative Prompting and Few-Shot Techniques

2. **The AI PM Toolstack: Beyond ChatGPT** (2 lessons)
   - Surveying the AI Tool Landscape for PMs
   - Evaluating AI Tools: Your Decision Framework

3. **Workflow Integration: Building the AI-Assisted Cycle** (3 lessons)
   - Integrating AI into Daily PM Tasks
   - Building a Repeatable AI Workflow
   - Measuring the Impact on Velocity

4. **Internal Advocacy: Proving the Value** (2 lessons)
   - Overcoming Team Skepticism
   - Becoming the AI Champion at Your Company

## Personalization Verification

✅ **Skip list respected** - No lessons on neural networks, AI history, or ML theory

✅ **Teach-from-scratch covered** - Dedicated lessons on prompt engineering, tool evaluation, workflow integration

✅ **Gaps addressed** - Lessons on tool discovery, evaluation frameworks, workflow building

✅ **Tone matches** - Direct, practical lesson titles (no academic/theoretical language)

✅ **Depth matches** - All lessons focused on doing, not theory

## Files Created

| File | Size | Contents |
|------|------|----------|
| `demo_brain_before.json` | ~2KB | Brain with profile, no course |
| `demo_brain_complete.json` | ~7KB | Complete brain with course structure |

## Inspect Results

```bash
# View full course structure
cat demo_brain_complete.json | jq .brain.course_structure

# View just phase titles
cat demo_brain_complete.json | jq '.brain.course_structure.phases[].title'

# View first phase lessons
cat demo_brain_complete.json | jq '.brain.course_structure.phases[0].lessons'

# View complete brain
cat demo_brain_complete.json | jq .
```

## Compare Different Learners

The same subject with a different learner profile produces a **different course**:

**Beginner PM (practical only):**
- Title: "The AI-Powered PM: Modernizing Your Product Workflow for Speed"
- Focus: Tools, workflows, practical application
- 4 phases, 9 lessons

**Technical PM (deep understanding):**
- Title: Would be more technical, e.g., "AI Product Architecture for PMs"
- Focus: Model selection, production considerations, system design
- Likely more phases, more technical depth

Run `npm run demo` multiple times with different profiles to see this in action.

## Next Steps

1. **Review** the generated course in `demo_brain_complete.json`

2. **Modify** the demo script to test different learner profiles:
   - Edit `demo.js`
   - Change `onboardingData` and `profilingData`
   - Run `npm run demo` again

3. **Build** the teaching agent:
   - Read course structure
   - Generate lesson content from `instructional_seed`
   - Deliver personalized lessons
   - Track mastery

4. **Compare** courses:
   ```bash
   cd course
   npm run verify  # Generates 2 courses for same subject, different learners
   ```
