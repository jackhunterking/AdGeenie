"use client"

/**
 * Feature: Launch - Location Summary Card
 * Purpose: Compact summary of included/excluded locations for final launch step
 * References:
 *  - Supabase state via contexts
 */

import { Badge } from "@/components/ui/badge"
import { useLocation } from "@/lib/context/location-context"

export function LocationSummaryCard() {
  const { locationState } = useLocation()
  const included = locationState.locations.filter(l => l.mode === "include")
  const excluded = locationState.locations.filter(l => l.mode === "exclude")

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Target Locations</h3>
        <div className="flex items-center gap-2">
          {included.length > 0 && <Badge className="bg-purple-600 text-white">{included.length}</Badge>}
        </div>
      </div>
      {included.length === 0 ? (
        <p className="text-sm text-muted-foreground">No locations selected</p>
      ) : (
        <div className="space-y-1 text-sm max-h-32 overflow-auto">
          {included.map(loc => (
            <div key={loc.id} className="flex items-center justify-between">
              <span className="truncate mr-2">{loc.name}</span>
              {typeof loc.radiusKm === "number" && (
                <span className="text-muted-foreground shrink-0">{loc.radiusKm} km</span>
              )}
            </div>
          ))}
          {excluded.length > 0 && (
            <div className="pt-2 text-xs text-muted-foreground">Excluded: {excluded.map(l => l.name).join(", ")}</div>
          )}
        </div>
      )}
    </div>
  )
}


