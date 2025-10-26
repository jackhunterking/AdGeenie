"use client"

/**
 * Feature: Launch - Audience Summary Card
 * Purpose: Compact audience summary for final launch view
 */

import { Badge } from "@/components/ui/badge"
import { useAudience } from "@/lib/context/audience-context"

export function AudienceSummaryCard() {
  const { audienceState } = useAudience()
  const mode = audienceState.targeting?.mode ?? "ai"
  const isAI = mode === "ai"

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Audience</h3>
        <Badge variant={isAI ? undefined : "outline"}>{isAI ? "AI Targeting" : "Custom"}</Badge>
      </div>
      {isAI ? (
        <p className="text-sm text-muted-foreground">AI Advantage+ will optimize who sees your ad.</p>
      ) : (
        <div className="text-sm text-muted-foreground">
          {audienceState?.targeting?.details?.summary ?? "Custom audience selected"}
        </div>
      )}
    </div>
  )
}


