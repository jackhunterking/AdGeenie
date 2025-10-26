"use client"

/**
 * Feature: Launch - Location Summary Card
 * Purpose: Compact summary of included/excluded locations for final launch step
 * References:
 *  - Supabase state via contexts
 */

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"
import { useLocation } from "@/lib/context/location-context"

export function LocationSummaryCard() {
  const { locationState } = useLocation()
  const included = locationState.locations.filter(l => l.mode === "include")
  const excluded = locationState.locations.filter(l => l.mode === "exclude")

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <MapPin className="h-4 w-4 text-purple-600" />
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
              <Badge className="bg-purple-600 text-white text-xs">{included.length}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            {included.length === 0 ? (
              <p className="text-xs text-muted-foreground">None</p>
            ) : (
              included.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-3 rounded-lg border panel-surface hover:border-purple-500/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                      {/* icon container to match LocationCard */}
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-6.5-4.33-6.5-10A6.5 6.5 0 1 1 18.5 11c0 5.67-6.5 10-6.5 10z"/><circle cx="12" cy="11" r="2"/></svg>
                    </div>
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
                <Badge variant="destructive" className="text-xs">{excluded.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Ads will NOT show here</p>
            </div>
            <div className="space-y-2">
              {excluded.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-red-500/5 border-red-500/30 hover:border-red-500/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-6.5-4.33-6.5-10A6.5 6.5 0 1 1 18.5 11c0 5.67-6.5 10-6.5 10z"/><circle cx="12" cy="11" r="2"/></svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{loc.name}</p>
                        <span className="text-xs text-red-600 font-medium">Excluded</span>
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


