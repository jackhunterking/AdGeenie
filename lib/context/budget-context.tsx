"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

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
  const [budgetState, setBudgetState] = useState<BudgetState>({
    dailyBudget: 20,
    selectedAdAccount: null,
    isConnected: false,
  })

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

