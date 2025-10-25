"use client"

import { useState } from "react"
import { Flag, Filter, FileText, ArrowDown, Check, ChevronRight, AlertCircle, CheckCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LeadFormSetup } from "@/components/forms/lead-form-setup"

type Objective = "leads"
type ConversionMethod = "instant-forms"

interface SelectedFormData {
  id: string
  name: string
}

export function GoalTab() {
  const [selectedObjective, setSelectedObjective] = useState<Objective>("leads")
  const [selectedConversion, setSelectedConversion] = useState<ConversionMethod | null>(null)
  const [selectedForm, setSelectedForm] = useState<SelectedFormData | null>(null)
  const [showFormSetup, setShowFormSetup] = useState(false)

  const handleObjectiveSelect = (objective: Objective) => {
    setSelectedObjective(objective)
  }

  const handleConversionSelect = (conversion: ConversionMethod) => {
    setSelectedConversion(conversion)
    setShowFormSetup(true)
  }

  const handleFormSelected = (formData: SelectedFormData) => {
    setSelectedForm(formData)
    setShowFormSetup(false)
  }

  const handleBackToGoal = () => {
    setShowFormSetup(false)
  }

  const handleChangeGoal = () => {
    // Reset everything back to initial state
    setSelectedObjective("leads")
    setSelectedConversion(null)
    setSelectedForm(null)
    setShowFormSetup(false)
  }

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

  // Show configuration summary if form is selected
  if (selectedForm && selectedConversion === "instant-forms") {
    return (
      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Goal</h2>
          <p className="text-sm text-muted-foreground">Your goal is ready to use.</p>
        </div>

        {/* Configuration Details */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Goal Configuration</h3>
            <Badge className="bg-green-600 text-white text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          </div>
          <div className="space-y-2">
            {/* Objective */}
            <div className="flex items-center justify-between p-2 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Goal</p>
                <p className="text-sm font-medium truncate">Leads</p>
              </div>
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
            </div>

            {/* Form */}
            <div className="flex items-center justify-between p-2 rounded-lg border border-blue-500/30 bg-blue-500/5">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Instant Form</p>
                <p className="text-sm font-medium truncate">{selectedForm.name}</p>
              </div>
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
            </div>
          </div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-600 text-center">
            ⚠️ Once published, this goal cannot be changed
          </p>
        </div>

        {/* Change Goal Button */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="default"
            onClick={handleChangeGoal}
            className="px-6"
          >
            Change Goal
          </Button>
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
