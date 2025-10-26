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
import { useBudget } from "@/lib/context/budget-context"
import { CalendarClock } from "lucide-react"
import { useState } from "react"

export function BudgetSchedule() {
  const { budgetState, setDailyBudget, setSchedule } = useBudget()
  const [start, setStart] = useState<string>(budgetState.startTime || "")
  const [end, setEnd] = useState<string>(budgetState.endTime || "")
  const [tz, setTz] = useState<string>(budgetState.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <CalendarClock className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium">Budget & Schedule</p>
          <p className="text-xs text-muted-foreground">Daily budget and optional start/end times.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Daily Budget (USD)</Label>
          <Input
            inputMode="numeric"
            value={String(budgetState.dailyBudget)}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0
              setDailyBudget(v)
            }}
          />
        </div>
        <div>
          <Label htmlFor="startTime" className="text-xs">Start Time (ISO)</Label>
          <Input id="startTime" placeholder="YYYY-MM-DDTHH:mm" value={start}
            onChange={(e) => setStart(e.target.value)}
            onBlur={() => setSchedule({ startTime: start || null })}
          />
        </div>
        <div>
          <Label htmlFor="endTime" className="text-xs">End Time (ISO, optional)</Label>
          <Input id="endTime" placeholder="YYYY-MM-DDTHH:mm" value={end}
            onChange={(e) => setEnd(e.target.value)}
            onBlur={() => setSchedule({ endTime: end || null })}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <Label htmlFor="tz" className="text-xs">Timezone</Label>
          <Input id="tz" value={tz}
            onChange={(e) => setTz(e.target.value)}
            onBlur={() => setSchedule({ timezone: tz })}
          />
        </div>
      </div>
    </div>
  )
}


