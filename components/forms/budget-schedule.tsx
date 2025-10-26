/**
 * Feature: Budget & Schedule
 * Purpose: Reusable form for daily budget and optional schedule
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 */

"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useBudget } from "@/lib/context/budget-context"
import { DollarSign, Plus, Minus } from "lucide-react"

export function BudgetSchedule() {
  const { budgetState, setDailyBudget } = useBudget()
  
  const minBudget = 5
  const maxBudget = 100
  const increment = 5

  const handleIncrement = () => {
    const newBudget = Math.min(budgetState.dailyBudget + increment, maxBudget)
    setDailyBudget(newBudget)
  }

  const handleDecrement = () => {
    const newBudget = Math.max(budgetState.dailyBudget - increment, minBudget)
    setDailyBudget(newBudget)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    const numValue = Number.parseInt(value) || minBudget
    const clampedValue = Math.max(minBudget, Math.min(maxBudget, numValue))
    setDailyBudget(clampedValue)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Budget</p>
          <p className="text-xs text-muted-foreground">Set your daily budget.</p>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-xs">Daily Budget (USD)</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={budgetState.dailyBudget <= minBudget}
            className="h-9 w-9 flex-shrink-0"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Input
            inputMode="numeric"
            value={String(budgetState.dailyBudget)}
            onChange={handleInputChange}
            className="text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleIncrement}
            disabled={budgetState.dailyBudget >= maxBudget}
            className="h-9 w-9 flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}


