"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"

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
  const { campaign, saveCampaignState } = useCampaignContext()
  const [goalState, setGoalState] = useState<GoalState>({
    selectedGoal: null,
    status: "idle",
    formData: null,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedGoalState = useMemo(() => goalState, [goalState])

  // Load initial state from campaign ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || isInitialized) return
    
    // campaign_states is 1-to-1 object, not array
    const savedData = campaign.campaign_states?.goal_data as unknown as GoalState | null
    if (savedData) {
      console.log('[GoalContext] ✅ Restoring goal state:', savedData);
      setGoalState(savedData)
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Save function
  const saveFn = useCallback(async (state: GoalState) => {
    if (!campaign?.id || !isInitialized) return
    await saveCampaignState('goal_data', state as unknown as Record<string, unknown>)
  }, [campaign?.id, saveCampaignState, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedGoalState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

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

