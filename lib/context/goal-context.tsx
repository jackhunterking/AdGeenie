"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useCampaign } from "@/lib/hooks/use-campaign"
import { useDebounce } from "@/lib/hooks/use-debounce"

type GoalType = "leads" | "calls" | null
type GoalStatus = "idle" | "selecting" | "setup-in-progress" | "completed" | "error"

interface GoalFormData {
  id?: string
  name?: string
  type?: string
}

interface GoalState {
  selectedGoal: GoalType
  status: GoalStatus
  formData: GoalFormData | null
  errorMessage?: string
}

interface GoalContextType {
  goalState: GoalState
  setSelectedGoal: (goal: GoalType) => void
  startSetup: () => void
  updateStatus: (status: GoalStatus) => void
  setFormData: (data: GoalFormData) => void
  setError: (message: string) => void
  resetGoal: () => void
}

const GoalContext = createContext<GoalContextType | undefined>(undefined)

export function GoalProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaign()
  const [goalState, setGoalState] = useState<GoalState>({
    selectedGoal: null,
    status: "idle",
    formData: null,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Load initial state from campaign
  useEffect(() => {
    if (campaign?.campaign_states?.[0]?.goal_data && !isInitialized) {
      const savedData = campaign.campaign_states[0].goal_data as GoalState
      setGoalState(savedData)
      setIsInitialized(true)
    }
  }, [campaign, isInitialized])

  // Debounced auto-save
  const debouncedGoalState = useDebounce(goalState, 1000)

  useEffect(() => {
    if (isInitialized && campaign?.id) {
      saveCampaignState('goal_data', debouncedGoalState as unknown as Record<string, unknown>)
    }
  }, [debouncedGoalState, saveCampaignState, campaign?.id, isInitialized])

  const setSelectedGoal = (goal: GoalType) => {
    setGoalState(prev => ({ 
      ...prev, 
      selectedGoal: goal, 
      status: goal ? "selecting" : "idle",
      errorMessage: undefined
    }))
  }

  const startSetup = () => {
    setGoalState(prev => ({ ...prev, status: "setup-in-progress" }))
  }

  const updateStatus = (status: GoalStatus) => {
    setGoalState(prev => ({ ...prev, status }))
  }

  const setFormData = (data: GoalFormData) => {
    setGoalState(prev => ({ ...prev, formData: data, status: "completed" }))
  }

  const setError = (message: string) => {
    setGoalState(prev => ({ ...prev, errorMessage: message, status: "error" }))
  }

  const resetGoal = () => {
    setGoalState({
      selectedGoal: null,
      status: "idle",
      formData: null,
      errorMessage: undefined,
    })
  }

  return (
    <GoalContext.Provider 
      value={{ 
        goalState, 
        setSelectedGoal, 
        startSetup, 
        updateStatus, 
        setFormData, 
        setError, 
        resetGoal 
      }}
    >
      {children}
    </GoalContext.Provider>
  )
}

export function useGoal() {
  const context = useContext(GoalContext)
  if (context === undefined) {
    throw new Error("useGoal must be used within a GoalProvider")
  }
  return context
}

