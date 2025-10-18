"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useCampaign } from "@/lib/hooks/use-campaign"
import { useDebounce } from "@/lib/hooks/use-debounce"

interface Location {
  id: string
  name: string
  coordinates: [number, number]
  radius?: number
  type: "radius" | "city" | "region" | "country"
  mode: "include" | "exclude"
  bbox?: [number, number, number, number]
  geometry?: any
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
  const { campaign, saveCampaignState } = useCampaign()
  const [locationState, setLocationState] = useState<LocationState>({
    locations: [],
    status: "idle",
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Load initial state from campaign
  useEffect(() => {
    if (campaign?.campaign_states?.[0]?.location_data && !isInitialized) {
      const savedData = campaign.campaign_states[0].location_data
      setLocationState(savedData)
      setIsInitialized(true)
    }
  }, [campaign, isInitialized])

  // Debounced auto-save
  const debouncedLocationState = useDebounce(locationState, 1000)

  useEffect(() => {
    if (isInitialized && campaign?.id) {
      saveCampaignState('location_data', debouncedLocationState)
    }
  }, [debouncedLocationState, saveCampaignState, campaign?.id, isInitialized])

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


