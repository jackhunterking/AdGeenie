"use client"

/**
 * Feature: Launch - Location Summary Card
 * Purpose: Compact summary of included/excluded locations for final launch step
 * References:
 *  - Supabase state via contexts
 */

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Check, X as Cross } from "lucide-react"
import { useLocation } from "@/lib/context/location-context"

export function LocationSummaryCard() {
  const { locationState } = useLocation()
  const included = locationState.locations.filter(l => l.mode === "include")
  const excluded = locationState.locations.filter(l => l.mode === "exclude")

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="icon-tile-muted">
            <MapPin className="h-4 w-4" />
          </div>
          <h3 className="font-semibold">Target Locations</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'location' } }))}
            variant="outline" size="sm" className="h-7 px-3"
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Included and Excluded sections (no map) */}
      <div className="space-y-3">
        <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">Included</h4>
                <Badge className="badge-muted text-xs">{included.length}</Badge>
              </div>
            </div>
          <div className="space-y-2">
            {included.length === 0 ? (
              <p className="text-xs text-muted-foreground">None</p>
            ) : (
              included.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-3 rounded-lg border panel-surface"
                >
                  <div className="flex items-center gap-2">
                    <div className="icon-tile-muted"><Check className="h-4 w-4 text-status-green" /></div>
                    <div>
                      <p className="text-sm font-medium">{loc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {loc.type === 'radius' && typeof loc.radius === 'number' ? `${loc.radius} mile radius` : loc.type === 'city' ? 'City' : loc.type === 'region' ? 'Province/Region' : loc.type === 'country' ? 'Country' : loc.type}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {excluded.length > 0 && (
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium">Excluded</h4>
                <Badge className="badge-muted text-xs">{excluded.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Ads will NOT show here</p>
            </div>
            <div className="space-y-2">
              {excluded.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-3 rounded-lg border panel-surface"
                >
                  <div className="flex items-center gap-2">
                    <div className="icon-tile-muted"><Cross className="h-4 w-4 text-red-600" /></div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{loc.name}</p>
                        <span className="status-muted">Excluded</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {loc.type === 'radius' && typeof loc.radius === 'number' ? `${loc.radius} mile radius` : loc.type === 'city' ? 'City' : loc.type === 'region' ? 'Province/Region' : loc.type === 'country' ? 'Country' : loc.type}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


