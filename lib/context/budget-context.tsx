"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useCampaign } from "@/lib/hooks/use-campaign"
import { useDebounce } from "@/lib/hooks/use-debounce"

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
  const { campaign, saveCampaignState } = useCampaign()
  const [budgetState, setBudgetState] = useState<BudgetState>({
    dailyBudget: 20,
    selectedAdAccount: null,
    isConnected: false,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Load initial state from campaign
  useEffect(() => {
    if (campaign?.campaign_states?.[0]?.budget_data && !isInitialized) {
      const savedData = campaign.campaign_states[0].budget_data as BudgetState
      setBudgetState(savedData)
      setIsInitialized(true)
    }
  }, [campaign, isInitialized])

  // Debounced auto-save
  const debouncedBudgetState = useDebounce(budgetState, 1000)

  useEffect(() => {
    if (isInitialized && campaign?.id) {
      saveCampaignState('budget_data', debouncedBudgetState as unknown as Record<string, unknown>)
    }
  }, [debouncedBudgetState, saveCampaignState, campaign?.id, isInitialized])

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

