# Onboarding Agent - Phase 1

A conversational AI agent that onboards learners by discovering what they want to learn and why they really want to learn it.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add your OpenRouter API key to `.env`:
```
OPENROUTER_API_KEY=your_actual_api_key_here
```

## Running the Agent

```bash
npm start
```

Or:

```bash
node index.js
```

## How It Works

The agent will have a natural conversation with you to uncover:

1. **What** you want to learn (specific subject)
2. **Your goal** - what you want to be able to DO
3. **The trigger** - why NOW?
4. **Surface reason** - your initial answer for why
5. **Deeper motivation** - the real underlying driver

The conversation is designed to feel like talking to a friend, not an interview. The agent will:

- Ask natural, spoken-style questions (designed for future voice conversion)
- Dig deeper when you give surface-level answers
- Help you articulate motivations you might not have fully realized
- Only finish when it has confirmed its understanding with you

## What Happens When You're Done

When the agent has gathered all required information and confirmed its understanding with you, it will:

1. Display a structured summary of your onboarding
2. Save the results to `onboarding_result.json`
3. Exit

The JSON file contains all the structured data for the next phase of the platform.

## Example Conversation Flow

```
🤖: Hey! So what's been on your mind — what do you wanna learn?

You: I want to learn AI

🤖: Okay cool. That's a huge field though. Are you thinking more like building AI systems from scratch, or using AI tools to make your work easier?

You: Using AI tools in my work

🤖: Nice. What kind of work do you do?

[... conversation continues ...]
```

## Technical Details

- **Runtime:** Node.js (ES modules)
- **LLM:** Gemini 3 Flash via OpenRouter
- **API:** OpenAI-compatible chat completions
- **State management:** Full conversation history sent with each API call
- **Tool calling:** Uses `complete_onboarding` function when ready to finish
