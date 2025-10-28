/**
 * Feature: AI Campaign Namer
 * Purpose: Generate a concise (≤3 words) intent-based campaign name using AI SDK Core
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI SDK Core (generateText): https://ai-sdk.dev/docs/ai-sdk-core/recipes#text-generation
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway/getting-started
 */

import { generateText } from 'ai'
import { getDefaultChatModel } from '@/lib/ai/gateway-provider'

const GENERIC_FORBIDDEN = new Set<string>([
  'ad','ads','campaign','facebook','instagram','meta','marketing','business'
])

function titleCase(text: string): string {
  return text
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function sanitize(raw: string): string {
  const onlyLetters = raw
    .replace(/[`"'\-_,.:;!?()/\\\[\]{}*&^%$#@~+=<>|]/g, ' ')
    .replace(/[0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return titleCase(onlyLetters)
}

function isAcceptable(name: string, avoidLower: ReadonlySet<string>): boolean {
  if (!name) return false
  if (!/^[A-Za-z ]+$/.test(name)) return false
  const words = name.trim().split(/\s+/)
  if (words.length === 0 || words.length > 3) return false
  // reject if all words are generic or if any word is empty
  const allGeneric = words.every(w => GENERIC_FORBIDDEN.has(w.toLowerCase()))
  if (allGeneric) return false
  if (avoidLower.has(name.toLowerCase())) return false
  return true
}

export async function generateCampaignNameAI(params: {
  prompt: string
  goalType?: string
  avoid?: string[]
}): Promise<string> {
  const model = getDefaultChatModel()
  const avoidLower = new Set<string>((params.avoid || []).map(s => s.toLowerCase()))

  const system = [
    'You name marketing campaigns succinctly.',
    'Return ONLY one campaign name.',
    'Hard constraints:',
    '- Max 3 words.',
    '- Letters and spaces only.',
    '- Title Case words (e.g., Basement Reno Leads).',
    '- No punctuation, quotes, or numbers.',
    '- Avoid generic words alone: Ad, Ads, Campaign, Facebook, Instagram, Meta, Marketing, Business.',
  ].join('\n')

  const avoidList = (params.avoid || []).slice(0, 10).join(', ')
  const userPrompt = [
    `User intent: ${params.prompt || ''}`,
    params.goalType ? `Goal: ${params.goalType}` : '',
    avoidList ? `Names to avoid (case-insensitive): ${avoidList}` : '',
    'Output: ONLY the final name, nothing else.'
  ].filter(Boolean).join('\n')

  const { text } = await generateText({
    model,
    prompt: `${system}\n\n${userPrompt}`,
  })

  const candidate = sanitize(text)
  if (isAcceptable(candidate, avoidLower)) return candidate

  // Second attempt: clarify constraints if model drifted
  const { text: retry } = await generateText({
    model,
    prompt: `${system}\n\n${userPrompt}\n\nIf constraints are not met, try again. Return ONLY the name.`,
  })
  const second = sanitize(retry)
  if (isAcceptable(second, avoidLower)) return second

  // Minimal fallback handled by caller
  return 'Campaign'
}


