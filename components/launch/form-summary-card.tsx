"use client"

/**
 * Feature: Launch - Form Summary Card
 * Purpose: Show selected conversion form (e.g., Instant Form) for leads
 */

import { useGoal } from "@/lib/context/goal-context"

export function FormSummaryCard() {
  const { goalState } = useGoal()
  const form = goalState.formData

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold mb-2">Lead Form</h3>
      {form?.id ? (
        <div className="text-sm">
          <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{form.name ?? "Instant Form"}</span></div>
          <div className="text-muted-foreground">Type: {form.type ?? "instant-form"}</div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No form selected</p>
      )}
    </div>
  )
}


