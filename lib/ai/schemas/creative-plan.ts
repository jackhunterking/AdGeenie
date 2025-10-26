/**
 * Feature: Creative Plan Schema
 * Purpose: Strongly-typed, plan-first schema that governs ad creative variations and guardrails
 * References:
 *  - AI SDK Core (Structured Output): https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway/getting-started
 *  - Supabase: https://supabase.com/docs
 */

import { z } from 'zod'

export const OrientationSchema = z.enum(['square', 'vertical', 'horizontal'])

export const TextWeightSchema = z.enum(['bold', 'semibold', 'regular'])
export const TextSizeSchema = z.enum(['xs', 'sm', 'md', 'lg', 'xl'])

export const TextBlockSchema = z.object({
  kind: z.enum(['headline', 'offer', 'body', 'disclaimer']),
  text: z.string(),
  maxChars: z.number().int().positive().optional(),
  weight: TextWeightSchema.default('bold'),
  size: TextSizeSchema.default('lg'),
})

export const OverlayPaletteSchema = z.object({
  bg: z.string().optional(),
  fg: z.string().optional(),
  bgStyle: z.enum(['solid', 'gradient', 'blur']).default('solid'),
})

export const OverlaySchema = z.object({
  enabled: z.boolean(),
  density: z.enum(['none', 'light', 'medium', 'heavy', 'text-only']).default('none'),
  blocks: z.array(TextBlockSchema).default([]),
  palette: OverlayPaletteSchema.optional(),
  layoutHint: z
    .enum(['top', 'center', 'bottom', 'left', 'right', 'center-left', 'center-right'])
    .default('bottom'),
  safeZonePct: z.number().min(0.08).max(0.15).default(0.1),
})

export const VisualSchema = z.object({
  people: z.enum(['none', 'suggest', 'required']).default('suggest'),
  productFocus: z.boolean().default(false),
  serviceDemo: z.boolean().default(false),
  environment: z.string().optional(),
  mood: z.enum(['professional', 'warm', 'bold', 'clean', 'luxury', 'casual']).default('professional'),
})

export const VariationSchema = z.object({
  name: z.string(),
  orientation: OrientationSchema.default('square'),
  visual: VisualSchema,
  overlay: OverlaySchema,
  rationale: z.string(),
})

export const CreativePlanSchema = z.object({
  goal: z.enum(['calls', 'leads', 'website-visits', 'unknown']).default('unknown'),
  category: z
    .enum([
      'local-services',
      'professional-services',
      'ecommerce',
      'hospitality',
      'health-wellness',
      'b2b',
      'other',
    ])
    .default('other'),
  offerType: z.enum(['discount', 'free', 'product', 'service', 'urgency', 'none']).default('none'),
  orientationPolicy: z.array(OrientationSchema).default(['square', 'vertical']),
  variations: z.array(VariationSchema).min(4).max(8),
  globalRules: z.object({
    avoidAIlook: z.boolean().default(true),
    allowTextOnlyOption: z.boolean().default(true),
    allowNoPeopleOption: z.boolean().default(true),
    minContrastAA: z.number().default(4.5),
    safeZonePct: z.number().default(0.1),
    platform: z.enum(['meta']).default('meta'),
    copyLimits: z.object({
      primaryMax: z.number().int().positive().default(125),
      headlineMax: z.number().int().positive().default(40),
      descriptionMax: z.number().int().positive().default(30),
    }),
  }),
  notes: z.string().optional(),
})

export type Orientation = z.infer<typeof OrientationSchema>
export type TextBlock = z.infer<typeof TextBlockSchema>
export type Overlay = z.infer<typeof OverlaySchema>
export type Visual = z.infer<typeof VisualSchema>
export type Variation = z.infer<typeof VariationSchema>
export type CreativePlan = z.infer<typeof CreativePlanSchema>


