import * as readline from 'readline';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// System prompt - defines the profiling agent's behavior
const SYSTEM_PROMPT = `You are the profiling mentor for a personalized learning platform. You've just finished onboarding and now know WHAT the user wants to learn and WHY.

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
  CONTEXT FROM ONBOARDING
═══════════════════════════════════════════

You already know from onboarding:
- WHAT they want to learn (the subject)
- WHY they want to learn it (their motivation/reason)

Do NOT ask about these again. Use this context to shape your profiling questions. Reference it naturally: "So since you mentioned you want to learn X because of Y..."

═══════════════════════════════════════════
  YOUR MISSION
═══════════════════════════════════════════

Based on the subject and reason you already have, figure out:

1. WHERE THEY'RE STARTING FROM — What do they already know about this subject? Complete beginner, some basics, intermediate?

2. HOW DEEP TO GO — Should this be a broad overview or a deep dive? Do they need mastery or just familiarity?

3. WHAT TO SKIP — Is there anything they already know well that we can skip? Or areas they specifically DON'T care about?

4. THEIR CONTEXT — Are there specific situations, projects, or use cases? (This shapes examples and focus)

NOT everything needs to be asked. YOU decide what's relevant based on the subject and reason from onboarding.

═══════════════════════════════════════════
  HOW TO GATHER INFORMATION
═══════════════════════════════════════════

You can gather information in different ways:

1. DIRECT QUESTIONS — "Have you ever coded before?" or "How would you rate your understanding of this right now?"

2. EXPLORATORY QUESTIONS — "What have you already tried or read about this?" or "Is there anything specific you want to make sure we cover?"

3. "EXPLAIN THIS TO ME" QUESTIONS — Ask them to explain a concept in their own words. This reveals their actual level better than self-assessment. For example: "Can you try to explain to me what you think quantum superposition means? And if you don't know, just say so — that's totally fine."

   IMPORTANT: Always make it clear that saying "I don't know" is completely okay. This isn't a test — it's just to understand where they're at.

The key: be efficient. Don't ask 10 questions if 2 will do. Adapt based on what you learn.

═══════════════════════════════════════════
  CONVERSATION STYLE
═══════════════════════════════════════════

- Reference what you learned in onboarding: "So you mentioned you're a teacher looking to use AI for grading..."
- Be curious but not interrogating. This isn't an intake form.
- If they give short answers, that's fine. Don't force elaboration.
- If they say "I don't know," that usually means beginner. Accept it and move on.
- Keep it to 2-4 exchanges typically. Depends on how complex the subject is.

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

- Don't ask about WHAT they want to learn or WHY — you already know this from onboarding
- Don't over-ask. If the subject is simple, 1-2 questions might be enough.
- Don't be clinical or formal. Keep it conversational.
- If they seem impatient, wrap up with what you have.
- Never use emoji or bullet points in your responses.
- Keep every response to 1-3 sentences.`;

// Load onboarding results if they exist
function loadOnboardingResults() {
    const onboardingPath = '../onboarding-agent/onboarding_result.json';
    try {
        const data = fs.readFileSync(onboardingPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('\n❌ Error: Could not load onboarding results.');
        console.error('Please run the onboarding agent first.\n');
        process.exit(1);
    }
}

// Build the initial context message based on onboarding
function buildContextMessage(onboarding) {
    return `CONTEXT FROM ONBOARDING:
- Subject: ${onboarding.subject}
- Reason: ${onboarding.reason}
- Summary: ${onboarding.summary}

Now you need to figure out what else you need to know about this learner to create a personalized course. Start by greeting them and asking your first profiling question. Reference what you learned in onboarding to make it feel continuous.`;
}

// Tool definition
const tools = [
    {
        type: "function",
        function: {
            name: "complete_profiling",
            description: "Call this when you have enough information to make decisions about course structure. You should know: where to start (assumed knowledge), how deep to go, and what to focus on.",
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
                    }
                },
                required: ["starting_level", "depth", "focus_areas"]
            }
        }
    }
];

// Initialize messages array
let messages = [];

// Create readline interface for terminal input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get user input
function getUserInput(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

// Function to call OpenRouter API
async function callGemini() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey === 'your_api_key_here') {
        console.error('\n❌ Error: OPENROUTER_API_KEY not set in .env file');
        console.error('Please add your OpenRouter API key to the .env file\n');
        process.exit(1);
    }

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

// Function to display profiling results
function displayResults(toolArgs, onboarding) {
    console.log('\n═══════════════════════════════════════════');
    console.log('  PROFILING COMPLETE');
    console.log('═══════════════════════════════════════════');
    console.log('\n  FROM ONBOARDING:');
    console.log(`  Subject:        ${onboarding.subject}`);
    console.log(`  Reason:         ${onboarding.reason}`);
    console.log('\n  FROM PROFILING:');
    console.log(`  Starting Level: ${toolArgs.starting_level}`);
    console.log(`  Depth:          ${toolArgs.depth}`);
    console.log(`  Focus Areas:    ${toolArgs.focus_areas}`);
    if (toolArgs.skip_areas) {
        console.log(`  Skip Areas:     ${toolArgs.skip_areas}`);
    }
    if (toolArgs.learner_context) {
        console.log(`  Context:        ${toolArgs.learner_context}`);
    }
    if (toolArgs.notes) {
        console.log(`  Notes:          ${toolArgs.notes}`);
    }
    console.log('═══════════════════════════════════════════\n');
}

// Function to save combined results to JSON
function saveResults(toolArgs, onboarding) {
    const combined = {
        // From onboarding
        subject: onboarding.subject,
        reason: onboarding.reason,
        onboarding_summary: onboarding.summary,
        // From profiling
        starting_level: toolArgs.starting_level,
        depth: toolArgs.depth,
        focus_areas: toolArgs.focus_areas,
        skip_areas: toolArgs.skip_areas || null,
        learner_context: toolArgs.learner_context || null,
        notes: toolArgs.notes || null
    };

    const filename = 'learner_profile.json';
    fs.writeFileSync(filename, JSON.stringify(combined, null, 2));
    console.log(`✅ Learner profile saved to ${filename}\n`);
}

// Main conversation loop
async function runAgent() {
    console.log('\n🧠 Profiling Agent Started\n');
    console.log('═══════════════════════════════════════════\n');

    // Load onboarding results
    const onboarding = loadOnboardingResults();
    console.log(`📋 Loaded onboarding: "${onboarding.subject}"\n`);

    // Initialize messages with system prompt and context
    messages = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildContextMessage(onboarding) }
    ];

    // Main loop
    while (true) {
        // Call Gemini with current messages
        const response = await callGemini();
        const choice = response.choices[0];
        const message = choice.message;

        // Check if it's a tool call
        if (message.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0];

            if (toolCall.function.name === 'complete_profiling') {
                // Parse the tool arguments
                const toolArgs = JSON.parse(toolCall.function.arguments);

                // Display and save results
                displayResults(toolArgs, onboarding);
                saveResults(toolArgs, onboarding);

                // End the conversation
                rl.close();
                break;
            }
        } else {
            // It's a regular message - add to messages array
            messages.push(message);

            // Display the agent's response
            console.log(`\n🧠: ${message.content}\n`);

            // Get user input
            const userInput = await getUserInput('You: ');

            // Add user's response to messages array
            messages.push({ role: "user", content: userInput });
        }
    }
}

// Run the agent
runAgent().catch(error => {
    console.error('\n❌ Unexpected error:', error);
    rl.close();
    process.exit(1);
});
