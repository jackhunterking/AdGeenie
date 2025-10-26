import { describe, it, expect } from 'vitest'
import { CreativePlanSchema } from '@/lib/ai/schemas/creative-plan'

describe('CreativePlan schema', () => {
  it('requires at least one text-only or no-people option via defaults', () => {
    const plan = CreativePlanSchema.parse({
      goal: 'unknown',
      category: 'other',
      offerType: 'none',
      orientationPolicy: ['square','vertical'],
      globalRules: {
        avoidAIlook: true,
        allowTextOnlyOption: true,
        allowNoPeopleOption: true,
        minContrastAA: 4.5,
        safeZonePct: 0.1,
        platform: 'meta',
        copyLimits: { primaryMax: 125, headlineMax: 40, descriptionMax: 30 }
      },
      variations: [
        {
          name: 'v1',
          orientation: 'square',
          visual: { people: 'none', productFocus: false, serviceDemo: false, mood: 'professional' },
          overlay: { enabled: false, density: 'none', safeZonePct: 0.1, layoutHint: 'bottom' },
          rationale: 'no-people coverage'
        },
        {
          name: 'v2',
          orientation: 'vertical',
          visual: { people: 'suggest', productFocus: false, serviceDemo: false, mood: 'professional' },
          overlay: { enabled: true, density: 'text-only', blocks: [], safeZonePct: 0.1, layoutHint: 'bottom' },
          rationale: 'text-only coverage'
        },
        {
          name: 'v3',
          orientation: 'square',
          visual: { people: 'suggest', productFocus: true, serviceDemo: false, mood: 'clean' },
          overlay: { enabled: false, density: 'none', safeZonePct: 0.1, layoutHint: 'bottom' },
          rationale: 'product focus'
        },
        {
          name: 'v4',
          orientation: 'square',
          visual: { people: 'required', productFocus: false, serviceDemo: true, mood: 'warm' },
          overlay: { enabled: true, density: 'light', blocks: [], safeZonePct: 0.1, layoutHint: 'bottom' },
          rationale: 'service demo'
        }
      ]
    })

    expect(plan.variations.length).toBeGreaterThanOrEqual(4)
  })
})


