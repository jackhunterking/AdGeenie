/**
 * Feature: Ad Copy Generation API
 * Purpose: Generate six ad copy variations from selected creative images and goal
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 *  - AI SDK Core Vision: https://ai-sdk.dev/docs/ai-sdk-core/vision
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway/getting-started
 *  - Supabase: https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateObject, CoreMessage } from 'ai'
import { getModel } from '@/lib/ai/gateway-provider'
import { createServerClient } from '@/lib/supabase/server'

const BatchRequestSchema = z.object({
  campaignId: z.string().optional(),
  goalType: z.string().nullable().optional(),
  imageUrls: z.array(z.string().url()).min(1).max(6),
  businessContext: z.string().optional(),
})

const SingleRequestSchema = z.object({
  campaignId: z.string().optional(),
  goalType: z.string().nullable().optional(),
  imageUrls: z.array(z.string().url()).min(1).max(6),
  targetIndex: z.number().int().min(0).max(5),
  selectedImageIndex: z.number().int().min(0).max(5).optional(),
  preferEmojis: z.boolean().optional(),
  current: z
    .object({
      primaryText: z.string().optional(),
      headline: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  businessContext: z.string().optional(),
})

const CopySchema = z.object({
  variations: z
    .array(
      z.object({
        angle: z.string(),
        primaryText: z.string().min(20).max(180),
        headline: z.string().min(3).max(60),
        description: z.string().min(3).max(80),
        usesEmojis: z.boolean(),
      }),
    )
    .length(6),
})

const SingleCopySchema = z.object({
  angle: z.string(),
  primaryText: z.string().min(20).max(180),
  headline: z.string().min(3).max(60),
  description: z.string().min(3).max(80),
  usesEmojis: z.boolean(),
})

const SYSTEM_INSTRUCTIONS = `You are an expert Meta ads copywriter. Write six unique ad copy variations for the same creative.

Rules:
- Each variation must use a different angle: benefit-led, offer/urgency, social proof, problem–solution, question hook, objection buster.
- EXACTLY 3 of the 6 variations MUST include tasteful emojis (1–2) in the primaryText only; the other 3 MUST NOT include emojis.
- Never put emojis in the headline or description unless explicitly requested.
- Align tone and CTA with the campaign goal if given (leads, calls, website-visits).
- Keep copy concise and platform-native.
- For each variation, set usesEmojis=true if emojis were used, otherwise false.
`

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // Single variation rewrite
    if (typeof body?.targetIndex === 'number') {
      const { goalType, imageUrls, targetIndex, selectedImageIndex, preferEmojis, current, businessContext } = SingleRequestSchema.parse(body)

      const idx = (typeof selectedImageIndex === 'number' ? selectedImageIndex : targetIndex)
      const selectedImage = imageUrls[idx] || imageUrls[0]
      const singleContent: CoreMessage['content'] = [
        {
          type: 'text',
          text: `Rewrite one ad copy variation for index ${targetIndex + 1}.
Keep the same campaign context.${goalType ? ` Goal: ${goalType}.` : ''} ${businessContext ? `Context: ${businessContext}` : ''}
Use the following image URL as visual context (do not attempt to analyze the image, just consider it conceptually): ${selectedImage}
${preferEmojis === false ? 'Do NOT include any emojis.' : 'Include tasteful emojis (1–2) in primaryText only; do not put emojis in headline/description.'}
If current copy is provided, improve it while changing the persuasion angle. Also return usesEmojis=true/false accordingly.`,
        },
      ]

      const { object: variation } = await generateObject({
        model: getModel('openai/gpt-4o'),
        system: SYSTEM_INSTRUCTIONS,
        schema: SingleCopySchema,
        messages: [{ role: 'user', content: singleContent }],
      })

      return NextResponse.json({ variation })
    }

    // Batch (six) variations
    const { goalType, imageUrls, businessContext } = BatchRequestSchema.parse(body)
    const userContent: CoreMessage['content'] = [
      {
        type: 'text',
        text: `Create six different ad copy variations for this campaign.${goalType ? ` Goal: ${goalType}.` : ''} ${businessContext ? ` Context: ${businessContext}` : ''}
Use these image URLs as context only (do not attempt to analyze the images directly, just infer likely themes): ${imageUrls.join(', ')}`,
      },
    ]

    const { object } = await generateObject({
      model: getModel('openai/gpt-4o'),
      system: SYSTEM_INSTRUCTIONS,
      schema: CopySchema,
      messages: [
        { role: 'user', content: userContent },
      ],
    })

    return NextResponse.json(object)
  } catch (err) {
    console.error('[ad-copy] generation error', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


