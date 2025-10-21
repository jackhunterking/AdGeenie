"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { useAutoSave } from "@/lib/hooks/use-auto-save"
import { AUTO_SAVE_CONFIGS } from "@/lib/types/auto-save"

interface BudgetState {
  dailyBudget: number
  selectedAdAccount: string | null
  isConnected: boolean
}

interface BudgetContextType {
  budgetState: BudgetState
  setDailyBudget: (budget: number) => void
  setSelectedAdAccount: (accountId: string) => void
  setIsConnected: (connected: boolean) => void
  resetBudget: () => void
  isComplete: () => boolean
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaignContext()
  const [budgetState, setBudgetState] = useState<BudgetState>({
    dailyBudget: 20,
    selectedAdAccount: null,
    isConnected: false,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Memoize state to prevent unnecessary recreations
  const memoizedBudgetState = useMemo(() => budgetState, [budgetState])

  // Load initial state from campaign ONCE (even if empty)
  useEffect(() => {
    if (!campaign?.id || isInitialized) return
    
    // campaign_states is 1-to-1 object, not array
    const savedData = campaign.campaign_states?.budget_data as unknown as BudgetState | null
    if (savedData) {
      console.log('[BudgetContext] ✅ Restoring budget state:', savedData);
      setBudgetState(savedData)
    }
    
    setIsInitialized(true) // Mark initialized regardless of saved data
  }, [campaign, isInitialized])

  // Save function
  const saveFn = useCallback(async (state: BudgetState) => {
    if (!campaign?.id || !isInitialized) return
    await saveCampaignState('budget_data', state as unknown as Record<string, unknown>)
  }, [campaign?.id, saveCampaignState, isInitialized])

  // Auto-save with NORMAL config (300ms debounce)
  useAutoSave(memoizedBudgetState, saveFn, AUTO_SAVE_CONFIGS.NORMAL)

  const setDailyBudget = (budget: number) => {
    setBudgetState(prev => ({ ...prev, dailyBudget: budget }))
  }

  const setSelectedAdAccount = (accountId: string) => {
    setBudgetState(prev => ({ ...prev, selectedAdAccount: accountId }))
  }

  const setIsConnected = (connected: boolean) => {
    setBudgetState(prev => ({ ...prev, isConnected: connected }))
  }

  const resetBudget = () => {
    setBudgetState({
      dailyBudget: 20,
      selectedAdAccount: null,
      isConnected: false,
    })
  }

  const isComplete = () => {
    return budgetState.dailyBudget > 0 && budgetState.selectedAdAccount !== null
  }

  return (
    <BudgetContext.Provider 
      value={{ 
        budgetState, 
        setDailyBudget,
        setSelectedAdAccount,
        setIsConnected,
        resetBudget,
        isComplete
      }}
    >
      {children}
    </BudgetContext.Provider>
  )
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}

