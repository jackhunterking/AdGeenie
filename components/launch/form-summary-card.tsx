"use client"

/**
 * Feature: Launch - Form Summary Card
 * Purpose: Show selected conversion form (e.g., Instant Form) for leads
 */

import { useGoal } from "@/lib/context/goal-context"
import { Button } from "@/components/ui/button"
import { FileText, Check, Flag } from "lucide-react"

export function FormSummaryCard() {
  const { goalState } = useGoal()
  const form = goalState.formData

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="icon-tile-muted">
            <Flag className="h-4 w-4" />
          </div>
          <h3 className="font-semibold">Goal</h3>
        </div>
        <Button variant="outline" size="sm" className="h-7 px-3" onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'goal' } }))}>Edit</Button>
      </div>
      {form?.id ? (
        <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
          <div className="flex items-center gap-2">
            <div className="icon-tile-muted"><FileText className="h-4 w-4 text-brand-blue" /></div>
            <div>
              <p className="text-sm font-medium">{form.name ?? "Lead Form"}</p>
              <p className="text-xs text-muted-foreground">Type: {form.type ?? "instant-form"}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 text-status-green">
            <Check className="h-4 w-4" /> Enabled
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-lg border panel-surface">
          <div className="flex items-center gap-2">
            <div className="icon-tile-muted"><FileText className="h-4 w-4 text-brand-blue" /></div>
            <div>
              <p className="text-sm font-medium">No form selected</p>
              <p className="text-xs text-muted-foreground">Type: instant-form</p>
            </div>
          </div>
          <div className="status-muted">Not selected</div>
        </div>
      )}
    </div>
  )
}


