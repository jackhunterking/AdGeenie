"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"

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
  const { campaign, saveCampaignState } = useCampaignContext()
  const [audienceState, setAudienceState] = useState<AudienceState>({
    status: "idle",
    targeting: {
      mode: "ai", // Default to AI mode
    },
    isSelected: false,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedAudienceState = useMemo(() => audienceState, [audienceState])

  // Load initial state from campaign ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || isInitialized) return
    
    // campaign_states is 1-to-1 object, not array
    const savedData = campaign.campaign_states?.audience_data as unknown as AudienceState | null
    if (savedData) {
      console.log('[AudienceContext] ✅ Restoring audience state:', savedData);
      setAudienceState(savedData)
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Save function
  const saveFn = useCallback(async (state: AudienceState) => {
    if (!campaign?.id || !isInitialized) return
    await saveCampaignState('audience_data', state as unknown as Record<string, unknown>)
  }, [campaign?.id, saveCampaignState, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedAudienceState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

  const setAudienceTargeting = (targeting: Partial<AudienceTargeting>) => {
    setAudienceState(prev => ({
      ...prev,
      targeting: { ...prev.targeting, ...targeting },
      status: "completed",
      isSelected: true,
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

  // Auto-advance when AI targeting completes
  const prevStatus = useRef<AudienceStatus>(audienceState.status)
  useEffect(() => {
    const justCompleted = prevStatus.current !== "completed" && audienceState.status === "completed"
    const isAIMode = audienceState.targeting?.mode === "ai"
    if (justCompleted && isAIMode) {
      window.dispatchEvent(new CustomEvent("autoAdvanceStep"))
    }
    prevStatus.current = audienceState.status
  }, [audienceState.status, audienceState.targeting?.mode])

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


