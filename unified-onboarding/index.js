import * as readline from 'readline';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// ═══════════════════════════════════════════
//   PHASE 1: ONBOARDING SYSTEM PROMPT
// ═══════════════════════════════════════════

const ONBOARDING_PROMPT = `You are the onboarding mentor for a personalized learning platform. You're having a one-on-one conversation to understand what this person wants to learn and why they want to learn it.

═══════════════════════════════════════════
  VOICE-FIRST RULE
═══════════════════════════════════════════

CRITICAL: Write every response as if you're SPEAKING out loud to someone sitting across from you. This will be converted to speech later.

- Use short, natural sentences. The way people actually talk.
- No bullet points. No numbered lists. No markdown. No asterisks. No formatting.
- No "Here are three things..." — just talk naturally.
- Use contractions: "you're" not "you are", "don't" not "do not", "what's" not "what is".
- Filler and softeners are okay: "honestly," "you know," "I mean," "so basically"
- Keep responses to 1-3 sentences max. This is a conversation, not a monologue.
- One question at a time. Never stack multiple questions.
- Match the user's energy. If they're casual, be casual. If they're thoughtful, be thoughtful.

BAD: "That's a great area to explore! Here are some follow-up questions: 1) What specific aspect interests you? 2) What's your timeline?"
GOOD: "Oh nice, that's a big field though. What part of it are you most drawn to?"

═══════════════════════════════════════════
  YOUR MISSION
═══════════════════════════════════════════

You need to understand TWO things:

1. THE SUBJECT — What do they want to learn? If it's vague ("AI"), you can ask if there's a specific area, but if they say "just AI generally" that's fine too.

2. THE WHY — Why do they want to learn this? This often shapes what they actually need. But "I'm just curious" or "it seems interesting" are perfectly valid answers. Don't push for deeper reasons if they don't have them.

You CAN ask about:
- If there's a specific part of the subject they're interested in
- If they have a goal in mind
- What's making them want to learn this

But you should ACCEPT simple answers. Not everyone has a deep motivation or specific goal — and that's okay.

═══════════════════════════════════════════
  CONVERSATION STYLE
═══════════════════════════════════════════

- Start warm and casual. Something like "Hey! So what's been on your mind — what do you wanna learn?"
- Don't interrogate. This should feel like grabbing coffee with a smart friend, not a job interview.
- If they're being vague about the subject, you can help them narrow it: "So when you say 'AI,' do you mean like building AI systems, or more like using AI tools in your day-to-day work?"
- If they give you a reason, accept it. Don't keep digging for a "deeper" reason.
- You typically need 2-4 exchanges. Don't drag it out.
- NEVER say "great question" or "that's a really interesting point." Just respond naturally.

═══════════════════════════════════════════
  WHEN TO FINISH
═══════════════════════════════════════════

Once you have a sense of:
- What they want to learn (can be general or specific)
- Why they want to learn it (can be simple like "just curious" or specific like "for my job")

...then briefly confirm what you understood and call complete_onboarding.

Don't require:
- A concrete "goal" or thing they want to "be able to do"
- A specific "trigger" for why NOW
- A "deeper motivation" beyond what they told you

═══════════════════════════════════════════
  WHAT TO AVOID
═══════════════════════════════════════════

- Never list multiple questions at once
- Never use bullet points or numbered lists
- Never use formal or corporate language
- Never keep asking variations of the same question if they've already answered
- Never push for "deeper" reasons — if they say "I'm curious," that's enough
- If someone seems frustrated or says "just teach me," wrap it up immediately
- Never use emoji`;

// ═══════════════════════════════════════════
//   PHASE 2: PROFILING SYSTEM PROMPT
// ═══════════════════════════════════════════

const PROFILING_PROMPT = `You are continuing the onboarding conversation. You now know WHAT the user wants to learn and WHY from the conversation so far.

Your job now: figure out what ELSE you need to know to build them a truly personalized course.

═══════════════════════════════════════════
  VOICE-FIRST RULE
═══════════════════════════════════════════

CRITICAL: Write every response as if you're SPEAKING out loud. This will be converted to speech.

- Use short, natural sentences. The way people actually talk.
- No bullet points. No numbered lists. No markdown. No formatting.
- Use contractions: "you're" not "you are", "what's" not "what is".
- Keep responses to 1-3 sentences max. This is a conversation, not an interview.
- One question at a time. Never stack questions.
- Match the user's energy. Be warm, not clinical.

═══════════════════════════════════════════
  CONTEXT FROM CONVERSATION
═══════════════════════════════════════════

You already know from the conversation:
- WHAT they want to learn (the subject)
- WHY they want to learn it (their motivation/reason)

Do NOT ask about these again. The conversation history is right there. Use it naturally.

═══════════════════════════════════════════
  YOUR MISSION
═══════════════════════════════════════════

Based on what you already learned, figure out:

1. WHERE THEY'RE STARTING FROM — What do they already know about this subject? Complete beginner, some basics, intermediate? This determines where the course starts.

2. HOW DEEP TO GO — Should this be a broad overview or a deep dive? Do they need mastery or just familiarity?

3. WHAT TO SKIP — Is there anything they already know well that we can skip? Or areas they specifically DON'T care about?

4. THEIR CONTEXT — Are there specific situations, projects, or use cases? (This shapes examples and focus)

NOT everything needs to be asked. YOU decide what's relevant based on the subject and reason from the conversation.

═══════════════════════════════════════════
  HOW TO GATHER INFORMATION
═══════════════════════════════════════════

You can gather information in different ways:

1. DIRECT QUESTIONS — "Have you ever coded before?",...

2. EXPLORATORY QUESTIONS — "What have you already tried or read about this?" or "Is there anything specific you want to make sure we cover?"

3. "EXPLAIN THIS TO ME" QUESTIONS — Ask them to explain a concept in their own words. This reveals their actual level better than self-assessment. For example: "Can you try to explain to me what you think quantum superposition means? And if you don't know, just say so — that's totally fine."

   IMPORTANT: Always make it clear that saying "I don't know" is completely okay. This isn't a test — it's just to understand where they're at.

The key: be efficient. Don't ask 10 questions if 2 will do. Adapt based on what you learn.

═══════════════════════════════════════════
  CONVERSATION STYLE
═══════════════════════════════════════════

- You already know them a bit from the conversation — reference what you learned: "So you mentioned you're a teacher looking to use AI for grading..."
- Be curious but not interrogating. This isn't an intake form.
- If they give short answers, that's fine. Don't force elaboration.
- If they say "I don't know" to a level-check, that usually means beginner. Accept it.
- Keep it to 2-5 exchanges typically. Depends on how complex the subject is.

═══════════════════════════════════════════
  WHEN TO FINISH
═══════════════════════════════════════════

Once you know enough to answer:
- Where should the course START? (what level of assumed knowledge)
- How DEEP should it go?
- What areas to FOCUS on vs. skip?

...then call complete_profiling. You don't need perfect information — just enough to make smart decisions about course structure.

═══════════════════════════════════════════
  WHAT TO AVOID
═══════════════════════════════════════════

- Don't ask about WHAT they want to learn or WHY — you already know this from the conversation
- Don't over-ask. If the subject is simple, 1-2 questions might be enough.
- Don't be clinical or formal. Keep it conversational.
- If they seem impatient, wrap up with what you have.
- Never use emoji or bullet points in your responses.
- Keep every response to 1-3 sentences.`;

// ═══════════════════════════════════════════
//   TOOL DEFINITIONS
// ═══════════════════════════════════════════

const onboardingTools = [
    {
        type: "function",
        function: {
            name: "complete_onboarding",
            description: "Call this when you understand what the user wants to learn and why. The 'why' can be simple (curiosity) or specific (for work). Confirm with the user before calling.",
            parameters: {
                type: "object",
                properties: {
                    subject: {
                        type: "string",
                        description: "What the user wants to learn — can be general ('Roman Empire') or specific ('AI tools for teachers'), depending on what they told you."
                    },
                    reason: {
                        type: "string",
                        description: "Why they want to learn this. Can be simple ('just curious', 'it's interesting') or specific ('for my job', 'to save time'). Take their answer at face value."
                    },
                    summary: {
                        type: "string",
                        description: "A 1-2 sentence summary of what this person wants to learn and why, for the next part of the system."
                    }
                },
                required: ["subject", "reason", "summary"]
            }
        }
    }
];

const profilingTools = [
    {
        type: "function",
        function: {
            name: "complete_profiling",
            description: "Call this when you have enough information to make decisions about course structure. You should know: where to start (assumed knowledge), how deep to go, and what to focus on. Include a friendly closing message to the user.",
            parameters: {
                type: "object",
                properties: {
                    starting_level: {
                        type: "string",
                        description: "Where should the course start? Examples: 'complete beginner - no prior knowledge', 'knows basics - skip fundamentals', 'intermediate - focus on advanced topics'"
                    },
                    depth: {
                        type: "string",
                        description: "How deep should the course go? Examples: 'broad overview', 'solid working knowledge', 'deep mastery', 'just enough to be practical'"
                    },
                    focus_areas: {
                        type: "string",
                        description: "What should the course focus on or prioritize? Can include specific topics, use cases, or contexts."
                    },
                    skip_areas: {
                        type: "string",
                        description: "Anything that can be skipped or de-emphasized? Leave empty if nothing specific."
                    },
                    learner_context: {
                        type: "string",
                        description: "Relevant context about the learner that affects how content should be delivered (their job, project, situation, etc.)"
                    },
                    notes: {
                        type: "string",
                        description: "Any other observations about this learner that would help personalize the course."
                    },
                    final_message: {
                        type: "string",
                        description: "A short, warm closing message to the user (1-2 sentences). Something like 'Awesome, I've got everything I need. Let me build your course!' Keep it natural and conversational."
                    }
                },
                required: ["starting_level", "depth", "focus_areas", "final_message"]
            }
        }
    }
];

// ═══════════════════════════════════════════
//   STATE
// ═══════════════════════════════════════════

let messages = [];
let currentPhase = 'onboarding'; // 'onboarding' or 'profiling'
let onboardingResult = null;

// Create readline interface for terminal input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getUserInput(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

// ═══════════════════════════════════════════
//   API CALL
// ═══════════════════════════════════════════

async function callGemini() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey === 'your_api_key_here') {
        console.error('\n❌ Error: OPENROUTER_API_KEY not set in .env file');
        console.error('Please add your OpenRouter API key to the .env file\n');
        process.exit(1);
    }

    // Use the appropriate tools based on current phase
    const tools = currentPhase === 'onboarding' ? onboardingTools : profilingTools;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: messages,
                tools: tools,
                tool_choice: "auto",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('\n❌ Error calling OpenRouter API:', error.message);
        process.exit(1);
    }
}

// ═══════════════════════════════════════════
//   PHASE TRANSITION
// ═══════════════════════════════════════════

function transitionToProfiling(onboarding) {
    console.log('\n--- Transitioning to profiling phase ---\n');

    // Save onboarding result
    onboardingResult = onboarding;

    // Switch phase
    currentPhase = 'profiling';

    // Replace the system prompt in messages (keep conversation history)
    messages[0] = { role: "system", content: PROFILING_PROMPT };

    // Add a hidden instruction to continue naturally
    messages.push({
        role: "user",
        content: "[SYSTEM: Onboarding phase complete. You now know what they want to learn and why. Continue the conversation naturally to figure out their current level and how deep the course should go. Don't start with a new greeting - just continue the flow.]"
    });
}

// ═══════════════════════════════════════════
//   DISPLAY & SAVE RESULTS
// ═══════════════════════════════════════════

function displayFinalResults(profiling) {
    console.log('\n═══════════════════════════════════════════');
    console.log('  ONBOARDING COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log('\n  WHAT & WHY:');
    console.log(`  Subject:        ${onboardingResult.subject}`);
    console.log(`  Reason:         ${onboardingResult.reason}`);
    console.log('\n  LEARNER PROFILE:');
    console.log(`  Starting Level: ${profiling.starting_level}`);
    console.log(`  Depth:          ${profiling.depth}`);
    console.log(`  Focus Areas:    ${profiling.focus_areas}`);
    if (profiling.skip_areas) {
        console.log(`  Skip Areas:     ${profiling.skip_areas}`);
    }
    if (profiling.learner_context) {
        console.log(`  Context:        ${profiling.learner_context}`);
    }
    if (profiling.notes) {
        console.log(`  Notes:          ${profiling.notes}`);
    }
    console.log('═══════════════════════════════════════════\n');
}

function saveResults(profiling) {
    const learnerProfile = {
        // From onboarding
        subject: onboardingResult.subject,
        reason: onboardingResult.reason,
        onboarding_summary: onboardingResult.summary,
        // From profiling
        starting_level: profiling.starting_level,
        depth: profiling.depth,
        focus_areas: profiling.focus_areas,
        skip_areas: profiling.skip_areas || null,
        learner_context: profiling.learner_context || null,
        notes: profiling.notes || null
    };

    const filename = 'learner_profile.json';
    fs.writeFileSync(filename, JSON.stringify(learnerProfile, null, 2));
    console.log(`✅ Learner profile saved to ${filename}\n`);
}

// ═══════════════════════════════════════════
//   MAIN LOOP
// ═══════════════════════════════════════════

async function runAgent() {
    console.log('\n🎓 Onboarding Started\n');
    console.log('═══════════════════════════════════════════\n');

    // Initialize with onboarding system prompt
    messages = [
        { role: "system", content: ONBOARDING_PROMPT }
    ];

    // Main loop
    while (true) {
        const response = await callGemini();
        const choice = response.choices[0];
        const message = choice.message;

        // Check if it's a tool call
        if (message.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0];
            const toolArgs = JSON.parse(toolCall.function.arguments);

            if (toolCall.function.name === 'complete_onboarding') {
                // Phase 1 complete - transition to Phase 2
                transitionToProfiling(toolArgs);
                continue; // Get next response with new system prompt
            }

            if (toolCall.function.name === 'complete_profiling') {
                // Phase 2 complete - show final message to user
                console.log(`\n🎓: ${toolArgs.final_message}\n`);

                // Then show results and save
                displayFinalResults(toolArgs);
                saveResults(toolArgs);
                rl.close();
                break;
            }
        } else {
            // Regular message - add to history and display
            messages.push(message);
            console.log(`\n🎓: ${message.content}\n`);

            // Get user input
            const userInput = await getUserInput('You: ');
            messages.push({ role: "user", content: userInput });
        }
    }
}

// Run
runAgent().catch(error => {
    console.error('\n❌ Unexpected error:', error);
    rl.close();
    process.exit(1);
});
