"use client"

/**
 * Feature: Launch - Audience Summary Card
 * Purpose: Compact audience summary for final launch view
 */

import { Badge } from "@/components/ui/badge"
import { useAudience } from "@/lib/context/audience-context"
import { AITargetingSummaryCard } from "./ai-targeting-summary-card"

export function AudienceSummaryCard() {
  const { audienceState } = useAudience()
  const mode = audienceState.targeting?.mode ?? "ai"
  const isAI = mode === "ai"

  if (isAI) {
    return (
      <AITargetingSummaryCard onEdit={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'audience' } }))} />
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Audience</h3>
        <Badge variant="outline">Custom</Badge>
      </div>
      <div className="text-sm text-muted-foreground">
        {(() => {
          const t = audienceState?.targeting
          if (!t) return "Custom audience selected"
          if (t.description && t.description.trim().length > 0) return t.description
          const parts: string[] = []
          if (t.interests && t.interests.length > 0) {
            parts.push(`Interests: ${t.interests.slice(0, 3).join(', ')}${t.interests.length > 3 ? '…' : ''}`)
          }
          if (t.demographics) {
            const d = t.demographics
            const demoparts: string[] = []
            if (typeof d.ageMin === 'number' || typeof d.ageMax === 'number') {
              const min = typeof d.ageMin === 'number' ? d.ageMin : undefined
              const max = typeof d.ageMax === 'number' ? d.ageMax : undefined
              demoparts.push(`Age ${min ?? 18}-${max ?? 65}`)
            }
            if (d.gender && d.gender !== 'all') demoparts.push(`Gender ${d.gender}`)
            if (d.languages && d.languages.length > 0) demoparts.push(`Lang ${d.languages.join(', ')}`)
            if (demoparts.length > 0) parts.push(demoparts.join(' · '))
          }
          return parts.length > 0 ? parts.join(' | ') : 'Custom audience selected'
        })()}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'audience' } }))}
          className="text-xs text-blue-500 hover:underline"
        >
          Edit
        </button>
      </div>
    </div>
  )
}


