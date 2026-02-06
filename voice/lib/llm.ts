import { GoogleGenAI } from '@google/genai';

/**
 * Unified LLM provider for the voice app.
 * Accepts OpenAI-format inputs, returns OpenAI-format outputs.
 * Reads LLM_PROVIDER env var: "openrouter" (default) or "gemini".
 */

const OPENROUTER_MODEL = 'google/gemini-3-flash-preview';
const GEMINI_MODEL = 'gemini-3-flash-preview';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ToolFunction {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface Tool {
  type: 'function';
  function: ToolFunction;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ResponseMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
}

interface LLMResponse {
  choices: Array<{
    index: number;
    message: ResponseMessage;
    finish_reason: string;
  }>;
}

interface CallLLMParams {
  messages: Message[];
  tools: Tool[];
}

function getProvider(): string {
  return (process.env.LLM_PROVIDER || 'openrouter').toLowerCase();
}

// ═══════════════════════════════════════════
//   OpenRouter path
// ═══════════════════════════════════════════

async function callOpenRouter({ messages, tools }: CallLLMParams): Promise<LLMResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
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

function convertMessagesForGemini(messages: Message[]) {
  let systemInstruction: string | undefined = undefined;
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

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

function convertToolsForGemini(tools: Tool[]) {
  if (!tools || tools.length === 0) return undefined;

  const functionDeclarations = tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parametersJsonSchema: tool.function.parameters,
  }));

  return [{ functionDeclarations }];
}

function convertGeminiResponse(response: { text?: string | null; functionCalls?: Array<{ name: string; args: Record<string, unknown> }> | null }): LLMResponse {
  const text = response.text;
  const functionCalls = response.functionCalls;

  const message: ResponseMessage = {
    role: 'assistant',
    content: text || null,
  };

  if (functionCalls && functionCalls.length > 0) {
    message.tool_calls = functionCalls.map((fc, index) => ({
      id: `call_${index}`,
      type: 'function' as const,
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

async function callGeminiSDK({ messages, tools }: CallLLMParams): Promise<LLMResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const ai = new GoogleGenAI({ apiKey });
  const { systemInstruction, contents } = convertMessagesForGemini(messages);
  const geminiTools = convertToolsForGemini(tools);

  const config: Record<string, unknown> = {
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

export async function callLLM({ messages, tools }: CallLLMParams): Promise<LLMResponse> {
  const provider = getProvider();

  if (provider === 'gemini') {
    return callGeminiSDK({ messages, tools });
  }

  return callOpenRouter({ messages, tools });
}
