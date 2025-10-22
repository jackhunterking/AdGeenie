/**
 * Feature: Chat Message Schemas & Sanitizers
 * Purpose: Enforce AI SDK v5 message part invariants and provide safe sanitization utilities
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/streaming
 */

import { z } from 'zod';
import type { UIMessage } from 'ai';

// ============================================
// Zod Schemas (runtime validation when needed)
// ============================================

const TextPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1).catch(''),
}).strip();

const ReasoningPartSchema = z.object({
  type: z.literal('reasoning'),
  text: z.string().optional(),
}).strip();

// Generic tool part: type starts with "tool-" and must have a string toolCallId
const ToolBaseSchema = z.object({
  type: z.string().regex(/^tool-/),
  toolCallId: z.string().min(1),
  // Keep fields commonly used by UI/SDK
  input: z.any().optional(),
  output: z.any().optional(),
  result: z.any().optional(),
  state: z.string().optional(),
  errorText: z.string().optional(),
}).strip();

// For validation-only purposes we allow any specific tool-* type via regex above
export const UIPartSchema = z.union([
  TextPartSchema,
  ReasoningPartSchema,
  ToolBaseSchema,
]);

export const UIMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(UIPartSchema),
  metadata: z.record(z.any()).optional(),
}).strip();

// ============================================
// Sanitizers (drop-invalid, never-throw)
// ============================================

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function sanitizePart(raw: any): any | null {
  // Guard: must have a string type
  if (!isString(raw?.type)) return null;

  // Non-tool parts
  if (!raw.type.startsWith('tool-')) {
    if (raw.type === 'text') {
      const text = isString(raw.text) ? raw.text : '';
      if (!text) return null;
      return { type: 'text', text };
    }
    if (raw.type === 'reasoning') {
      const text = isString(raw.text) ? raw.text : undefined;
      return { type: 'reasoning', ...(text ? { text } : {}) };
    }
    // Unknown non-tool types are dropped
    return null;
  }

  // Tool parts must have a toolCallId
  if (!isString(raw.toolCallId)) return null;

  const hasOutputOrResult = raw.output !== undefined || raw.result !== undefined;
  const isToolResult = raw.type === 'tool-result';

  // Only keep complete tool invocations or valid tool-result parts
  if (!(hasOutputOrResult || isToolResult)) return null;

  const part: any = {
    type: raw.type,
    toolCallId: raw.toolCallId,
  };

  if (raw.input !== undefined) part.input = raw.input;
  if (raw.output !== undefined) part.output = raw.output;
  if (raw.result !== undefined) part.result = raw.result;
  if (isString(raw.state)) part.state = raw.state;
  if (isString(raw.errorText)) part.errorText = raw.errorText;

  return part;
}

export function sanitizeParts(parts: unknown): any[] {
  const array = Array.isArray(parts) ? parts : [];
  const sanitized: any[] = [];
  for (const raw of array) {
    const safe = sanitizePart(raw);
    if (safe) sanitized.push(safe);
  }
  return sanitized;
}

export function sanitizeMessages(messages: UIMessage[]): UIMessage[] {
  const list = Array.isArray(messages) ? messages : [];
  return list.map((m) => {
    const safeParts = sanitizeParts((m as any).parts);
    const metadata = (m as any).metadata && typeof (m as any).metadata === 'object' ? (m as any).metadata : undefined;
    return {
      id: String((m as any).id || ''),
      role: (m as any).role,
      parts: safeParts,
      ...(metadata ? { metadata } : {}),
    } as UIMessage;
  }).filter((m) => isString(m.id) && (m.role === 'user' || m.role === 'assistant' || m.role === 'system'));
}

// Optional gate (default enabled) for rollout
export function isSanitizerEnabled(): boolean {
  const flag = process.env.CHAT_V5_SANITIZER ?? process.env.NEXT_PUBLIC_CHAT_V5_SANITIZER;
  if (flag === '0' || flag === 'false') return false;
  return true;
}


