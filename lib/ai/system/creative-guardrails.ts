/**
 * Feature: Creative Guardrails - Plan Generation
 * Purpose: Build CreativePlan via AI SDK structured output using AI Gateway models
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway/getting-started
 */

import { generateObject } from 'ai'
import { getModel } from '@/lib/ai/gateway-provider'
import { CreativePlanSchema, type CreativePlan } from '@/lib/ai/schemas/creative-plan'

interface CreateCreativePlanInput {
  goal: 'calls' | 'leads' | 'website-visits' | 'unknown'
  inferredCategory?: string
  offerText?: string
}

const SYSTEM = `You are an ads creative planner. Output MUST strictly follow the CreativePlan schema.
Constraints:
- Include at least one text-only variation when offerText exists.
- Include at least one no-people variation.
- Enforce safeZonePct 0.10–0.12 and minContrastAA >= 4.5.
- Produce both square and vertical. Vertical MUST reuse the same square base image and extend the canvas with blur/gradient/solid fill; overlays reflow.
- Do not mention brands, logos, or brand colors.
- If category is unknown, use professional universal defaults and offer-to-format mapping.
- Respect copy limits: primary ≤125, headline ≤40, description ≤30.
`

export async function createCreativePlan(input: CreateCreativePlanInput): Promise<CreativePlan> {
  const planningModel = getModel('openai/gpt-4o')

  const { object } = await generateObject({
    model: planningModel,
    system: SYSTEM,
    schema: CreativePlanSchema,
    prompt: JSON.stringify(input),
  })

  return object
}


