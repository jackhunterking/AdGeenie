"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useCampaign } from "@/lib/hooks/use-campaign"
import { useDebounce } from "@/lib/hooks/use-debounce"

type AudienceMode = "ai" | "advanced"
type AudienceStatus = "idle" | "generating" | "setup-in-progress" | "completed" | "error"

interface DetailedTargeting {
  [key: string]: unknown;
}

interface AudienceTargeting {
  mode: AudienceMode
  description?: string
  interests?: string[]
  demographics?: {
    ageMin?: number
    ageMax?: number
    gender?: "all" | "male" | "female"
    languages?: string[]
  }
  detailedTargeting?: DetailedTargeting // For future advanced mode
}

interface AudienceState {
  status: AudienceStatus
  targeting: AudienceTargeting
  errorMessage?: string
  isSelected: boolean // Track if user confirmed/selected this audience
}

interface AudienceContextType {
  audienceState: AudienceState
  setAudienceTargeting: (targeting: Partial<AudienceTargeting>) => void
  updateStatus: (status: AudienceStatus) => void
  setError: (message: string) => void
  resetAudience: () => void
  setSelected: (selected: boolean) => void
}

const AudienceContext = createContext<AudienceContextType | undefined>(undefined)

export function AudienceProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaign()
  const [audienceState, setAudienceState] = useState<AudienceState>({
    status: "idle",
    targeting: {
      mode: "ai", // Default to AI mode
    },
    isSelected: false,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Load initial state from campaign
  useEffect(() => {
    if (campaign?.campaign_states?.[0]?.audience_data && !isInitialized) {
      const savedData = campaign.campaign_states[0].audience_data
      setAudienceState(savedData)
      setIsInitialized(true)
    }
  }, [campaign, isInitialized])

  // Debounced auto-save
  const debouncedAudienceState = useDebounce(audienceState, 1000)

  useEffect(() => {
    if (isInitialized && campaign?.id) {
      saveCampaignState('audience_data', debouncedAudienceState)
    }
  }, [debouncedAudienceState, saveCampaignState, campaign?.id, isInitialized])

  const setAudienceTargeting = (targeting: Partial<AudienceTargeting>) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: { ...prev.targeting, ...targeting },
      status: "completed",
      errorMessage: undefined
    }))
  }

  const updateStatus = (status: AudienceStatus) => {
    setAudienceState(prev => ({ ...prev, status }))
  }

  const setError = (message: string) => {
    setAudienceState(prev => ({ ...prev, errorMessage: message, status: "error" }))
  }

  const resetAudience = () => {
    setAudienceState({
      status: "idle",
      targeting: {
        mode: "ai",
      },
      errorMessage: undefined,
      isSelected: false,
    })
  }

  const setSelected = (selected: boolean) => {
    setAudienceState(prev => ({ ...prev, isSelected: selected }))
  }

  return (
    <AudienceContext.Provider 
      value={{ 
        audienceState, 
        setAudienceTargeting,
        updateStatus, 
        setError, 
        resetAudience,
        setSelected
      }}
    >
      {children}
    </AudienceContext.Provider>
  )
}

export function useAudience() {
  const context = useContext(AudienceContext)
  if (context === undefined) {
    throw new Error("useAudience must be used within an AudienceProvider")
  }
  return context
}


