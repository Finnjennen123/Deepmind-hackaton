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

export interface Tool {
  type: 'function';
  function: ToolFunction;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ResponseMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
}

export interface LLMResponse {
  choices: Array<{
    index: number;
    message: ResponseMessage;
    finish_reason: string;
  }>;
}

interface CallLLMParams {
  messages: Message[];
  tools?: Tool[];
  response_format?: { type: 'json_object' };
}

function getProvider(): string {
  if (process.env.LLM_PROVIDER) {
    return process.env.LLM_PROVIDER.toLowerCase();
  }
  if (process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return 'gemini';
  }
  return 'openrouter';
}

// ═══════════════════════════════════════════
//   OpenRouter path
// ═══════════════════════════════════════════

async function callOpenRouter({ messages, tools, response_format }: CallLLMParams): Promise<LLMResponse> {
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
      tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
      response_format,
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

function convertToolsForGemini(tools?: Tool[]) {
  if (!tools || tools.length === 0) return undefined;

  const functionDeclarations = tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    parametersJsonSchema: tool.function.parameters,
  }));

  return [{ functionDeclarations }];
}

function convertGeminiResponse(response: {
  text?: string | null;
  functionCalls?: Array<{ name?: string; args?: Record<string, unknown> }> | null;
}): LLMResponse {
  const text = response.text;
  const functionCalls =
    (response.functionCalls || []).filter(
      (fc): fc is { name: string; args?: Record<string, unknown> } => typeof fc?.name === 'string' && fc.name.length > 0
    ) || [];

  const message: ResponseMessage = {
    role: 'assistant',
    content: typeof text === 'string' ? text : null,
  };

  if (functionCalls.length > 0) {
    message.tool_calls = functionCalls.map((fc, index) => ({
      id: `call_${index}`,
      type: 'function' as const,
      function: {
        name: fc.name,
        arguments: JSON.stringify(fc.args || {}),
      },
    }));
  }

  return {
    choices: [
      {
        index: 0,
        message,
        finish_reason: functionCalls.length > 0 ? 'tool_calls' : 'stop',
      },
    ],
  };
}

async function callGeminiSDK({ messages, tools, response_format }: CallLLMParams): Promise<LLMResponse> {
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
    generationConfig: response_format?.type === 'json_object' ? { responseMimeType: 'application/json' } : undefined,
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

export async function callLLM({ messages, tools, response_format }: CallLLMParams): Promise<LLMResponse> {
  const provider = getProvider();

  if (provider === 'gemini') {
    return callGeminiSDK({ messages, tools, response_format });
  }

  return callOpenRouter({ messages, tools, response_format });
}
