/**
 * Feature: Ad Copy Schemas
 * Purpose: Shared zod schemas for ad copy generation and editing (route and tools)
 * References:
 *  - AI SDK Core Structured Output: https://ai-sdk.dev/docs/ai-sdk-core/structured-output
 */

import { z } from 'zod'

export const CopyItemSchema = z.object({
  primaryText: z.string().min(12).max(220),
  headline: z.string().min(3).max(80),
  description: z.string().min(3).max(120),
  // Optional metadata for analysis
  angle: z.string().optional(),
  usesEmojis: z.boolean().optional(),
})

export const CopySchema = z.object({
  variations: z.array(CopyItemSchema).length(6),
})

export const SingleCopySchema = CopyItemSchema


