/**
 * Feature: Edit Ad Copy Tool
 * Purpose: Rewrite ad copy for a specific variation with structured output
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
 *  - AI SDK Core Structured Output: https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 *  - AI Gateway: https://vercel.com/docs/ai-gateway/getting-started
 */

import { tool } from 'ai';
import { z } from 'zod';
import { generateObject } from 'ai';
import { getModel } from '@/lib/ai/gateway-provider';
import { SingleCopySchema } from '@/app/api/ad-copy/generate/route';

export const editAdCopyTool = tool({
  description: 'Rewrite ad copy (primaryText, headline, description) for an existing variation based on user instructions.',
  inputSchema: z.object({
    variationIndex: z.number().min(0).max(5).describe('Which ad copy variation to update'),
    prompt: z.string().min(3).describe('Instruction for how to rewrite the copy'),
    current: z.object({
      primaryText: z.string().optional(),
      headline: z.string().optional(),
      description: z.string().optional(),
    }).describe('Current copy values to be used as a baseline'),
    campaignId: z.string().optional(),
    preferEmojis: z.boolean().optional(),
  }),
  execute: async (input) => {
    const { variationIndex, prompt, current, preferEmojis } = input;

    const SYSTEM = `You are an expert Meta ads copywriter. Rewrite the ad copy concisely.
Rules:
- Keep platform-native tone.
- Return primaryText (12-220 chars), headline (3-80), description (3-120).
- If preferEmojis=true, allow 1–2 tasteful emojis in primaryText only; otherwise none.
- Headline and description must never include emojis unless explicitly asked.
- Preserve the core offer and value from current copy when relevant.`;

    const userMsg = [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: `Instruction: ${prompt}` },
          { type: 'text' as const, text: `Current primaryText: ${current.primaryText || ''}` },
          { type: 'text' as const, text: `Current headline: ${current.headline || ''}` },
          { type: 'text' as const, text: `Current description: ${current.description || ''}` },
          { type: 'text' as const, text: `Prefer emojis: ${preferEmojis ? 'yes' : 'no'}` },
        ],
      },
    ];

    const { object } = await generateObject({
      model: getModel('openai/gpt-4o'),
      system: SYSTEM,
      schema: SingleCopySchema,
      messages: userMsg,
    });

    return {
      success: true,
      variationIndex,
      copy: object,
    };
  },
});


