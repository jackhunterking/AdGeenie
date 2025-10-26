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
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Lead Form</h3>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'goal' } }))}
          className="text-xs text-blue-500 hover:underline"
        >
          Edit
        </button>
      </div>
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


