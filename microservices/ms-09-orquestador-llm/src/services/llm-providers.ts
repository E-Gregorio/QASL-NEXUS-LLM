// ============================================================
// MS-09: Proveedores LLM - Claude, OpenAI, Gemini
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, LLMResponse, TaskType } from '../types';

// ============================================================
// CLAUDE (Anthropic)
// ============================================================
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }
  return anthropicClient;
}

export async function callClaude(
  prompt: string,
  model: string,
  maxTokens: number = 4096,
  temperature: number = 0.3
): Promise<{ content: string; tokensUsed: number }> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('');

  const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

  return { content, tokensUsed };
}

// ============================================================
// OPENAI (GPT)
// ============================================================
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }
  return openaiClient;
}

export async function callOpenAI(
  prompt: string,
  model: string,
  maxTokens: number = 4096,
  temperature: number = 0.3
): Promise<{ content: string; tokensUsed: number }> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.choices[0]?.message?.content || '';
  const tokensUsed = response.usage?.total_tokens || 0;

  return { content, tokensUsed };
}

// ============================================================
// GEMINI (Google)
// ============================================================
let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
  }
  return geminiClient;
}

export async function callGemini(
  prompt: string,
  model: string,
  maxTokens: number = 4096,
  temperature: number = 0.3
): Promise<{ content: string; tokensUsed: number }> {
  const client = getGeminiClient();
  const genModel = client.getGenerativeModel({
    model,
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  });

  const result = await genModel.generateContent(prompt);
  const content = result.response.text();
  const tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;

  return { content, tokensUsed };
}

// ============================================================
// DISPATCHER: Llama al LLM correcto segun provider
// ============================================================
export async function callLLM(
  provider: LLMProvider,
  model: string,
  prompt: string,
  taskType: TaskType,
  maxTokens?: number,
  temperature?: number
): Promise<LLMResponse> {
  const start = Date.now();
  let result: { content: string; tokensUsed: number };

  switch (provider) {
    case 'claude':
      result = await callClaude(prompt, model, maxTokens, temperature);
      break;
    case 'openai':
      result = await callOpenAI(prompt, model, maxTokens, temperature);
      break;
    case 'gemini':
      result = await callGemini(prompt, model, maxTokens, temperature);
      break;
    default:
      throw new Error(`Proveedor LLM no soportado: ${provider}`);
  }

  return {
    provider,
    model,
    content: result.content,
    tokensUsed: result.tokensUsed,
    durationMs: Date.now() - start,
    taskType,
  };
}
