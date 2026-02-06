import * as readline from 'readline';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// System prompt - defines the agent's behavior
const SYSTEM_PROMPT = `You are the onboarding mentor for a personalized learning platform. You're having a one-on-one conversation to understand what this person wants to learn and why they want to learn it.

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

// Tool definition
const tools = [
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


// Initialize messages array with system prompt
const messages = [
  { role: "system", content: SYSTEM_PROMPT }
];

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

// Function to display onboarding results
function displayResults(toolArgs) {
  console.log('\n═══════════════════════════════════════════');
  console.log('  ONBOARDING COMPLETE');
  console.log('═══════════════════════════════════════════');
  console.log(`  Subject:  ${toolArgs.subject}`);
  console.log(`  Reason:   ${toolArgs.reason}`);
  console.log(`\n  Summary:  ${toolArgs.summary}`);
  console.log('═══════════════════════════════════════════\n');
}

// Function to save results to JSON
function saveResults(toolArgs) {
  const filename = 'onboarding_result.json';
  fs.writeFileSync(filename, JSON.stringify(toolArgs, null, 2));
  console.log(`✅ Results saved to ${filename}\n`);
}

// Main conversation loop
async function runAgent() {
  console.log('\n🤖 Onboarding Agent Started\n');
  console.log('═══════════════════════════════════════════\n');

  // Main loop
  while (true) {
    // Call Gemini with current messages
    const response = await callGemini();
    const choice = response.choices[0];
    const message = choice.message;

    // Check if it's a tool call
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];

      if (toolCall.function.name === 'complete_onboarding') {
        // Parse the tool arguments
        const toolArgs = JSON.parse(toolCall.function.arguments);

        // Display and save results
        displayResults(toolArgs);
        saveResults(toolArgs);

        // End the conversation
        rl.close();
        break;
      }
    } else {
      // It's a regular message - add to messages array
      messages.push(message);

      // Display the agent's response
      console.log(`\n🤖: ${message.content}\n`);

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
