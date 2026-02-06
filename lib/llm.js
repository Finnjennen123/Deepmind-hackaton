import { GoogleGenAI } from '@google/genai';

/**
 * Unified LLM provider for CLI agents.
 * Accepts OpenAI-format inputs, returns OpenAI-format outputs.
 * Reads LLM_PROVIDER env var: "openrouter" (default) or "gemini".
 */

const OPENROUTER_MODEL = 'google/gemini-3-flash-preview';
const GEMINI_MODEL = 'gemini-3-flash-preview';

function getProvider() {
  return (process.env.LLM_PROVIDER || 'openrouter').toLowerCase();
}

// ═══════════════════════════════════════════
//   OpenRouter path (unchanged behavior)
// ═══════════════════════════════════════════

async function callOpenRouter({ messages, tools }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('\n❌ Error: OPENROUTER_API_KEY not set in .env file');
    console.error('Please add your OpenRouter API key to the .env file\n');
    process.exit(1);
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════
//   Gemini SDK path
// ═══════════════════════════════════════════

function convertMessagesForGemini(messages) {
  let systemInstruction = undefined;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
      continue;
    }

    const role = msg.role === 'assistant' ? 'model' : 'user';
    contents.push({
      role,
      parts: [{ text: msg.content }],
    });
  }

  return { systemInstruction, contents };
}

function convertToolsForGemini(tools) {
  if (!tools || tools.length === 0) return undefined;

  const functionDeclarations = tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parametersJsonSchema: tool.function.parameters,
  }));

  return [{ functionDeclarations }];
}

function convertGeminiResponse(response) {
  const text = response.text;
  const functionCalls = response.functionCalls;

  const message = {
    role: 'assistant',
    content: text || null,
  };

  if (functionCalls && functionCalls.length > 0) {
    message.tool_calls = functionCalls.map((fc, index) => ({
      id: `call_${index}`,
      type: 'function',
      function: {
        name: fc.name,
        arguments: JSON.stringify(fc.args),
      },
    }));
  }

  return {
    choices: [
      {
        index: 0,
        message,
        finish_reason: functionCalls ? 'tool_calls' : 'stop',
      },
    ],
  };
}

async function callGeminiSDK({ messages, tools }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('\n❌ Error: GEMINI_API_KEY not set in .env file');
    console.error('Please add your Gemini API key to the .env file\n');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const { systemInstruction, contents } = convertMessagesForGemini(messages);
  const geminiTools = convertToolsForGemini(tools);

  const config = {
    systemInstruction,
    tools: geminiTools,
    toolConfig: geminiTools ? { functionCallingConfig: { mode: 'AUTO' } } : undefined,
  };

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config,
  });

  return convertGeminiResponse(response);
}

// ═══════════════════════════════════════════
//   Public API
// ═══════════════════════════════════════════

export async function callLLM({ messages, tools }) {
  const provider = getProvider();

  if (provider === 'gemini') {
    return callGeminiSDK({ messages, tools });
  }

  return callOpenRouter({ messages, tools });
}
