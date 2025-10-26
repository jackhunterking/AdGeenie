"use client"

import { useEffect, useState } from "react"
import { Flag, Filter, FileText, ArrowDown, Check, ChevronRight, AlertCircle, CheckCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LeadFormSetup } from "@/components/forms/lead-form-setup"
import { useGoal } from "@/lib/context/goal-context"

type Objective = "leads"
type ConversionMethod = "instant-forms"

interface SelectedFormData {
  id: string
  name: string
}

export function GoalTab() {
  const { goalState, setFormData, setSelectedGoal, resetGoal } = useGoal()
  const [selectedObjective, setSelectedObjective] = useState<Objective>("leads")
  const [selectedConversion, setSelectedConversion] = useState<ConversionMethod | null>(null)
  const [showFormSetup, setShowFormSetup] = useState(false)
  
  // Use form data from context instead of local state
  const selectedForm = goalState.formData

  const handleObjectiveSelect = (objective: Objective) => {
    setSelectedObjective(objective)
    setSelectedGoal('leads') // Update context with selected goal
  }

  const handleConversionSelect = (conversion: ConversionMethod) => {
    setSelectedConversion(conversion)
    setShowFormSetup(true)
  }

  const handleFormSelected = (formData: SelectedFormData) => {
    // Save to GoalContext - this will auto-save to database
    setFormData({
      id: formData.id,
      name: formData.name,
      type: 'instant-form'
    })
    // Keep the builder visible; do not navigate away
    setShowFormSetup(true)
  }

  const handleBackToGoal = () => {
    setShowFormSetup(false)
  }

  const handleChangeGoal = () => {
    // Reset everything back to initial state
    setSelectedObjective("leads")
    setSelectedConversion(null)
    resetGoal() // Reset goal context (clears form data)
    setShowFormSetup(false)
  }

  // Hydrate UI on load: if a form is already selected for Leads, keep the builder open
  useEffect(() => {
    if (goalState.selectedGoal === 'leads' && goalState.formData?.id) {
      setSelectedObjective('leads')
      setSelectedConversion('instant-forms')
      setShowFormSetup(true)
    }
  }, [goalState.selectedGoal, goalState.formData?.id])

  if (showFormSetup && selectedConversion === "instant-forms") {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBackToGoal}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 transition-all"
        >
          ← Back to Goal
        </button>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
          <LeadFormSetup onFormSelected={handleFormSelected} onChangeGoal={handleChangeGoal} />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border p-4 space-y-4 bg-transparent border-transparent">
      <div className="flex items-center gap-2">
        {/* Updated to blue color for Goal tab */}
        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Flag className="h-4 w-4 text-blue-600" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Goal</h1>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Generate</h2>
          <p className="text-sm text-muted-foreground">Choose what you want to generate</p>
        </div>

        <button
          onClick={() => handleObjectiveSelect("leads")}
          className={`w-full rounded-lg border p-4 text-left transition-all flex items-center gap-3 cursor-pointer ${
            selectedObjective === "leads"
              ? "bg-primary/5 border-primary"
              : "bg-card border-border hover:bg-muted/50 hover:border-primary/50"
          }`}
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Filter className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-foreground">Leads</h3>
            <p className="text-sm text-muted-foreground">Collect contact information from potential customers</p>
          </div>
          {selectedObjective === "leads" && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
        </button>
      </div>

      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-px bg-border" />
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="h-8 w-px bg-border" />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">With</h2>
          <p className="text-sm text-muted-foreground">Choose how to collect leads</p>
        </div>

        <button
          onClick={() => handleConversionSelect("instant-forms")}
          className={`w-full rounded-lg border p-4 text-left transition-all flex items-start gap-3 cursor-pointer ${
            selectedConversion === "instant-forms"
              ? "bg-primary/5 border-primary"
              : "bg-card border-border hover:bg-muted/50 hover:border-primary/50"
          }`}
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-base font-medium text-foreground">Instant Forms</h3>
            <p className="text-sm text-muted-foreground">
              Use Meta&apos;s built-in forms to collect leads directly on Facebook and Instagram
            </p>
            {selectedForm ? (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs font-medium text-foreground">Selected Form:</p>
                <p className="text-xs text-primary">{selectedForm.name}</p>
              </div>
            ) : (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-sm font-medium text-red-600 dark:text-red-500">No form selected</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Click to create or select a form</p>
              </div>
            )}
          </div>
          <div className="flex-shrink-0">
            {selectedConversion === "instant-forms" && selectedForm ? (
              <Check className="h-5 w-5 text-primary" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </button>
      </div>
    </div>
  )
}
