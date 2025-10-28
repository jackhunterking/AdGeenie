import { describe, it, expect } from 'vitest'
import { buildImagePrompt } from '../../lib/creative/prompt-builder'

describe('buildImagePrompt', () => {
  it('does not include numeric percentages or camera f-numbers', () => {
    const prompt = buildImagePrompt({ content: 'Cozy living room, professional photo' })

    // No 1-2 digit percentages like 10% 12% etc.
    expect(/\b\d{1,2}\s*%/.test(prompt)).toBe(false)

    // No f-numbers like f/2.8 or f1.4
    expect(/\bf\s*\/?\s*\d+(?:\.\d+)?/i.test(prompt)).toBe(false)
  })
})


