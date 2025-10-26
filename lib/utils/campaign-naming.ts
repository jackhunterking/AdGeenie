/**
 * Feature: Campaign Auto-Naming
 * Purpose: Generate <=3-word campaign names from a free-form prompt and assist in
 *          picking a unique name per user without using digits.
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - Supabase: https://supabase.com/docs/reference/javascript/select
 */

const STOP_WORDS = new Set<string>([
  'the','a','an','and','or','but','for','nor','so','yet',
  'with','without','to','from','at','by','of','on','in','into','onto','over','under',
  'is','are','was','were','be','been','being',
  'this','that','these','those','it','its','as','about','than','then','too','very',
  'your','you','we','our','us','they','them','their','i','me','my',
  'new','ad','ads','campaign','facebook','instagram','meta'
])

const FALLBACK_ADJECTIVES: readonly string[] = [
  'Prime','Bright','Nova','Peak','Bold','Swift','Fresh','Urban','Pure','Local',
  'Blue','Clever','Sunny','Happy','Rapid','Smart','True','Vivid','North','Lake'
]

function tokenize(text: string): string[] {
  if (!text) return []
  const lowered = text.toLowerCase()
  const tokens = lowered
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !STOP_WORDS.has(t))
  return tokens
}

function titleCase(words: string[]): string {
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Extract top keywords preserving original order, de-duplicated by appearance.
 */
export function extractKeywords(prompt: string, limit: number = 10): string[] {
  const tokens = tokenize(prompt)
  const seen = new Set<string>()
  const ordered: string[] = []
  for (const token of tokens) {
    if (!seen.has(token)) {
      seen.add(token)
      ordered.push(token)
      if (ordered.length >= limit) break
    }
  }
  return ordered
}

/**
 * Generate candidate names (3 -> 2 -> 1 tokens) from keywords.
 */
export function generateNameCandidates(prompt: string): string[] {
  const keywords = extractKeywords(prompt)
  const candidates: string[] = []
  // 3-word windows
  for (let i = 0; i <= Math.max(0, keywords.length - 3); i++) {
    candidates.push(titleCase([keywords[i], keywords[i + 1], keywords[i + 2]]))
  }
  // 2-word windows
  for (let i = 0; i <= Math.max(0, keywords.length - 2); i++) {
    candidates.push(titleCase([keywords[i], keywords[i + 1]]))
  }
  // 1-word singles
  for (let i = 0; i < keywords.length; i++) {
    candidates.push(titleCase([keywords[i]]))
  }
  // Fallback combos using adjectives + first keyword (noun-ish)
  const head = keywords[0]
  if (head) {
    for (const adj of FALLBACK_ADJECTIVES) {
      candidates.push(`${adj} ${head.charAt(0).toUpperCase()}${head.slice(1)}`)
    }
  } else {
    // Last resort: use adjectives alone
    candidates.push(...FALLBACK_ADJECTIVES)
  }
  // De-duplicate while preserving order
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const c of candidates) {
    const key = c.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(c)
    }
  }
  return deduped
}

/**
 * Pick the first candidate that doesn't collide with an existing name set.
 */
export function pickUniqueFromCandidates(candidates: readonly string[], existingNamesLower: ReadonlySet<string>): string {
  for (const c of candidates) {
    if (!existingNamesLower.has(c.toLowerCase())) return c
  }
  // If everything collides, return the last candidate (still no digits)
  return candidates[candidates.length - 1] || 'Campaign'
}


