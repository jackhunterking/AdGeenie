"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type AudienceMode = "ai" | "advanced"
type AudienceStatus = "idle" | "setup-in-progress" | "completed" | "error"

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
  detailedTargeting?: any // For future advanced mode
}

interface AudienceState {
  status: AudienceStatus
  targeting: AudienceTargeting
  errorMessage?: string
}

interface AudienceContextType {
  audienceState: AudienceState
  setAudienceTargeting: (targeting: Partial<AudienceTargeting>) => void
  updateStatus: (status: AudienceStatus) => void
  setError: (message: string) => void
  resetAudience: () => void
}

const AudienceContext = createContext<AudienceContextType | undefined>(undefined)

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [audienceState, setAudienceState] = useState<AudienceState>({
    status: "idle",
    targeting: {
      mode: "ai", // Default to AI mode
    },
  })

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
    })
  }

  return (
    <AudienceContext.Provider 
      value={{ 
        audienceState, 
        setAudienceTargeting,
        updateStatus, 
        setError, 
        resetAudience
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


