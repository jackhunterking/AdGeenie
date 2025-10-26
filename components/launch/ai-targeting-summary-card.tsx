"use client"

/**
 * Feature: Launch - AI Targeting Summary Card
 * Purpose: Compact, read-only card mirroring the AI Targeting element used in selection
 * References:
 *  - AI Elements overview: https://ai-sdk.dev/elements/overview
 */

import { Button } from "@/components/ui/button"
import { Target, Check } from "lucide-react"

export function AITargetingSummaryCard({ onEdit }: { onEdit?: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Target className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="font-semibold">Audience</h3>
        </div>
        <button onClick={onEdit} className="text-xs text-blue-500 hover:underline">Edit</button>
      </div>
      <div className="group relative flex flex-col items-center p-6 rounded-xl border border-border">
        <div className="h-16 w-16 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
          <Target className="h-8 w-8 text-blue-600" />
        </div>
        <div className="text-center space-y-1 mb-3">
          <h4 className="text-base font-semibold">AI Targeting</h4>
          <p className="text-xs text-muted-foreground">AI Advantage+ will optimize who sees your ad.</p>
        </div>
        <Button
          size="sm"
          disabled
          className="px-4 cursor-default bg-green-500/15 text-green-700 border border-green-500/30 hover:bg-green-500/15"
        >
          <span className="inline-flex items-center gap-1.5 text-xs">
            <Check className="h-3.5 w-3.5" />
            AI Targeting Enabled
          </span>
        </Button>
      </div>
    </div>
  )
}


