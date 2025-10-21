"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"

interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

interface Location {
  id: string
  name: string
  coordinates: [number, number]
  radius?: number
  type: "radius" | "city" | "region" | "country"
  mode: "include" | "exclude"
  bbox?: [number, number, number, number]
  geometry?: GeoJSONGeometry
}

type LocationStatus = "idle" | "selecting" | "setup-in-progress" | "completed" | "error"

interface LocationState {
  locations: Location[]
  status: LocationStatus
  errorMessage?: string
}

interface LocationContextType {
  locationState: LocationState
  addLocations: (locations: Location[], shouldMerge?: boolean) => void
  removeLocation: (id: string) => void
  updateStatus: (status: LocationStatus) => void
  setError: (message: string) => void
  resetLocations: () => void
  clearLocations: () => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function LocationProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaignContext()
  const [locationState, setLocationState] = useState<LocationState>({
    locations: [],
    status: "idle",
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedLocationState = useMemo(() => locationState, [locationState])

  // Load initial state from campaign ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || isInitialized) return
    
    // campaign_states is 1-to-1 object, not array
    const savedData = campaign.campaign_states?.location_data as unknown as LocationState | null
    if (savedData) {
      console.log('[LocationContext] ✅ Restoring location state:', savedData);
      setLocationState(savedData)
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Save function
  const saveFn = useCallback(async (state: LocationState) => {
    if (!campaign?.id || !isInitialized) return
    await saveCampaignState('location_data', state as unknown as Record<string, unknown>)
  }, [campaign?.id, saveCampaignState, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedLocationState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

  const addLocations = (newLocations: Location[], shouldMerge: boolean = true) => {
    setLocationState(prev => {
      let finalLocations: Location[];
      
      if (shouldMerge) {
        // Merge locations, avoiding duplicates by name+mode
        const existingMap = new Map(prev.locations.map(loc => [`${loc.name}-${loc.mode}`, loc]))
        
        newLocations.forEach(newLoc => {
          existingMap.set(`${newLoc.name}-${newLoc.mode}`, newLoc)
        })
        
        finalLocations = Array.from(existingMap.values())
      } else {
        // Replace all locations (don't bring back removed ones)
        finalLocations = newLocations
      }
      
      return {
        ...prev,
        locations: finalLocations,
        status: finalLocations.length > 0 ? "completed" : "idle",
        errorMessage: undefined
      }
    })
  }

  const removeLocation = (id: string) => {
    setLocationState(prev => {
      const updatedLocations = prev.locations.filter(loc => loc.id !== id)
      return {
        ...prev,
        locations: updatedLocations,
        status: updatedLocations.length > 0 ? "completed" : "idle"
      }
    })
  }

  const updateStatus = (status: LocationStatus) => {
    setLocationState(prev => ({ ...prev, status }))
  }

  const setError = (message: string) => {
    setLocationState(prev => ({ ...prev, errorMessage: message, status: "error" }))
  }

  const resetLocations = () => {
    setLocationState(prev => ({
      ...prev,
      status: "idle"
    }))
  }

  const clearLocations = () => {
    setLocationState({
      locations: [],
      status: "idle",
      errorMessage: undefined,
    })
  }

  return (
    <LocationContext.Provider 
      value={{ 
        locationState, 
        addLocations,
        removeLocation,
        updateStatus, 
        setError, 
        resetLocations,
        clearLocations
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider")
  }
  return context
}


