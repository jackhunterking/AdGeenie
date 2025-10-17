"use client"

import type React from "react"

import { useState } from "react"
import { DollarSign, Plus, Minus, Check, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const mockAdAccounts = [
  { id: "act_123456789", name: "Main Business Account", currency: "USD" },
  { id: "act_987654321", name: "Marketing Campaign Account", currency: "USD" },
  { id: "act_456789123", name: "Test Account", currency: "CAD" },
]

export function BudgetTab() {
  const [selectedAccount, setSelectedAccount] = useState(mockAdAccounts.length === 1 ? mockAdAccounts[0].id : "")
  const [dailyBudget, setDailyBudget] = useState(20)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(dailyBudget.toString())
  const minBudget = 5
  const maxBudget = 100
  const increment = 5

  const handleIncrement = () => {
    setDailyBudget((prev) => Math.min(prev + increment, maxBudget))
  }

  const handleDecrement = () => {
    setDailyBudget((prev) => Math.max(prev - increment, minBudget))
  }

  const handleBudgetClick = () => {
    setIsEditing(true)
    setInputValue(dailyBudget.toString())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setInputValue(value)
  }

  const handleInputBlur = () => {
    const numValue = Number.parseInt(inputValue) || minBudget
    const clampedValue = Math.max(minBudget, Math.min(maxBudget, numValue))
    setDailyBudget(clampedValue)
    setIsEditing(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur()
    } else if (e.key === "Escape") {
      setIsEditing(false)
      setInputValue(dailyBudget.toString())
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4 bg-transparent border-transparent">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-green-600" />
        </div>
        <h2 className="text-base font-semibold">Daily Budget</h2>
      </div>

      <div className="space-y-2">
        <div className="w-full rounded-lg border border-border p-4 bg-card transition-all">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium mb-2">Ad Account</h3>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Select an ad account" />
                </SelectTrigger>
                <SelectContent>
                  {mockAdAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="font-medium text-xs">{account.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {account.id.replace("act_", "")} • {account.currency}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedAccount && mockAdAccounts.length === 1 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                <Check className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Auto-selected</span>
              </div>
            )}
          </div>
        </div>

        <div className="w-full rounded-lg border border-border p-4 bg-card transition-all">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-sm font-medium">How much per day?</h3>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDecrement}
                disabled={dailyBudget <= minBudget}
                className="h-8 w-8 rounded-lg hover:bg-green-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Minus className="h-4 w-4" />
              </Button>

              {isEditing ? (
                <div className="flex items-baseline gap-0">
                  <span className="text-xl font-bold text-green-600 leading-none">$</span>
                  <Input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    autoFocus
                    className="w-[70px] text-xl font-bold text-green-600 text-left bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-[28px] leading-none"
                  />
                </div>
              ) : (
                <button
                  onClick={handleBudgetClick}
                  className="text-xl font-bold text-green-600 hover:opacity-80 transition-opacity cursor-pointer leading-none min-w-[60px] text-center"
                >
                  ${dailyBudget}
                </button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleIncrement}
                disabled={dailyBudget >= maxBudget}
                className="h-8 w-8 rounded-lg hover:bg-green-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
