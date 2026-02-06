import * as readline from 'readline';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

// System prompt - defines the agent's behavior
const SYSTEM_PROMPT = `You are the onboarding mentor for a personalized learning platform. You're having a one-on-one conversation to understand what this person wants to learn and — most importantly — why they REALLY want to learn it.

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

You need to uncover FIVE things before you're done:

1. THE SUBJECT — What specifically do they want to learn? Not vague ("AI") but specific ("how to use AI tools to speed up my design workflow"). Help them narrow it down through conversation.

2. THE GOAL — What do they want to be able to DO after learning this? Not "understand it" but a concrete action: "build my own app," "make better decisions with data," "automate my reporting." If their goal is vague, help them sharpen it.

3. THE TRIGGER — Why NOW? What happened recently that made them want to learn this? A conversation with their boss? Seeing a colleague do something cool? A fear of falling behind? A new job? Something triggered this — find it.

4. THE DEEPER MOTIVATION — This is the hardest and most important one. The first reason people give is almost never the real one. "It seems useful" means "I'm scared of being left behind." "My company wants me to" means "I need to prove I'm still relevant." "I'm curious" might mean "I'm considering a career change." Dig underneath the surface. Ask follow-ups. Be warm but persistent.

   IMPORTANT: Many users genuinely won't know their real motivation. They'll say "I don't really know" or "I just feel like I should." That's not a dead end — that's a starting point. Your job is to HELP THEM discover it. Try approaching from different angles:
   - Paint a picture: "Okay imagine it's three months from now and you've totally nailed this. What's different about your life?"
   - Go negative: "What happens if you DON'T learn this? What stays the same that you don't want to stay the same?"
   - Find the moment: "When was the last time you felt like 'damn, I really wish I knew how to do this'?"
   - Make it concrete: "Is there a specific situation at work or in your life where this would've helped you?"

   The motivation is always there — sometimes the user just hasn't put it into words yet. Help them find it. Don't accept "I don't know" as the final answer, but don't push aggressively either. Rephrase, come at it from a new angle, make it easier for them to articulate what they're feeling.

5. CONFIRMATION — Before you finish, reflect back what you've understood in your own words. Something like "So if I'm hearing you right, the real thing driving this is..." and let them confirm or correct you. Only finish AFTER they've confirmed.

═══════════════════════════════════════════
  COMPLETION CHECKLIST
═══════════════════════════════════════════

Before calling complete_onboarding, mentally check:

[ ] Do I know the SPECIFIC subject (not vague)?
[ ] Do I know their CONCRETE goal (what they'll be able to DO)?
[ ] Do I know what TRIGGERED this (why now, not 6 months ago)?
[ ] Do I know the DEEPER motivation (not just the surface reason)?
[ ] Have I REFLECTED this back and gotten confirmation?

If ANY box is unchecked, keep going. Do NOT call the tool.

═══════════════════════════════════════════
  CONVERSATION STYLE
═══════════════════════════════════════════

- Start warm and casual. Something like "Hey! So what's been on your mind — what do you wanna learn?"
- Don't interrogate. This should feel like grabbing coffee with a smart friend, not a job interview.
- When they give a surface answer to "why," don't accept it. But don't challenge it aggressively either. Be curious: "That makes sense. But I'm curious, what would it actually change for you if you really nailed this?"
- Validate what they share. "Yeah, I totally get that" before digging deeper.
- If they're being vague about the subject, help them narrow it: "So when you say 'AI,' do you mean like building AI systems, or more like using AI tools in your day-to-day work?"
- You typically need 5-10 exchanges. Don't rush. But don't drag it out either.
- NEVER say "great question" or "that's a really interesting point." Just respond naturally.

═══════════════════════════════════════════
  WHAT TO AVOID
═══════════════════════════════════════════

- Never list multiple questions at once
- Never use bullet points or numbered lists
- Never use formal or corporate language
- Never say "let me summarize what I've heard so far" mid-conversation (save the reflection for the end)
- Never accept "I just want to learn it" or "it seems useful" as a final answer for the why
- Never call complete_onboarding without having reflected back and gotten confirmation
- Never use emoji`;

// Tool definition
const tools = [
  {
    type: "function",
    function: {
      name: "complete_onboarding",
      description: "Call this ONLY when ALL five completion criteria are met: (1) specific subject identified, (2) concrete goal defined, (3) trigger for learning NOW understood, (4) deeper emotional/practical motivation uncovered, (5) you have reflected your understanding back to the user and they confirmed it. If ANY of these are missing, do NOT call this tool.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "What the user wants to learn — stated specifically, not vaguely. 'Machine learning for product decisions' not just 'AI'."
          },
          specific_goal: {
            type: "string",
            description: "What the user wants to be able to DO after learning this. A concrete, actionable outcome — not just 'understand it better'."
          },
          trigger: {
            type: "string",
            description: "What made them want to learn this NOW — the specific event, moment, conversation, or realization that triggered this."
          },
          surface_reason: {
            type: "string",
            description: "The initial reason they gave for wanting to learn this (before you dug deeper)."
          },
          deeper_motivation: {
            type: "string",
            description: "The real underlying motivation — the emotional or practical driver you uncovered. Career fear, ambition, a specific project deadline, a life transition, proving something, etc."
          },
          current_knowledge_hint: {
            type: "string",
            description: "Any hints about what the user already knows about this subject, picked up naturally from the conversation."
          },
          summary: {
            type: "string",
            description: "A 2-3 sentence summary of this learner written as if you're briefing another mentor about who this person is, what they need, and what's driving them."
          }
        },
        required: ["subject", "specific_goal", "trigger", "surface_reason", "deeper_motivation", "summary"]
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
        model: "google/gemini-3-flash",
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
  console.log(`  Subject:            ${toolArgs.subject}`);
  console.log(`  Specific Goal:      ${toolArgs.specific_goal}`);
  console.log(`  Trigger:            ${toolArgs.trigger}`);
  console.log(`  Surface Reason:     ${toolArgs.surface_reason}`);
  console.log(`  Deeper Motivation:  ${toolArgs.deeper_motivation}`);
  console.log(`  Knowledge Hint:     ${toolArgs.current_knowledge_hint || 'N/A'}`);
  console.log(`\n  Summary:            ${toolArgs.summary}`);
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
