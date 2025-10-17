"use client"

import { Phone, Users, CheckCircle2, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGoal } from "@/lib/context/goal-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"

export function GoalSelectionCanvas() {
  const { goalState, setSelectedGoal, startSetup, resetGoal } = useGoal()
  const { isPublished } = useAdPreview()
  
  const handleSetupClick = () => {
    if (!goalState.selectedGoal) return
    
    // Trigger AI to handle setup
    startSetup()
    
    // Dispatch event to AI chat with command
    window.dispatchEvent(new CustomEvent('triggerGoalSetup', { 
      detail: { 
        goalType: goalState.selectedGoal 
      } 
    }))
  }

  // If published, show locked state regardless of goal setup status
  if (isPublished) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-orange-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Goal Locked</h2>
            <p className="text-muted-foreground">
              This ad has been published. Goals cannot be changed once an ad is live.
            </p>
          </div>
          
          {goalState.formData && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Goal:</span>
                <span className="text-sm capitalize">{goalState.selectedGoal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lead Type:</span>
                <span className="text-sm">Instant Form</span>
              </div>
              {goalState.formData?.name && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Form:</span>
                  <span className="text-sm text-blue-600">{goalState.formData.name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <span className="text-sm text-orange-600 font-medium flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Published
                </span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-4">
            To modify goals, you must first unpublish or create a new ad campaign.
          </p>
        </div>
      </div>
    )
  }

  // Initial state - no goal selected
  if (goalState.status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">Goal</h2>
            <p className="text-muted-foreground">
              Ask AI to set your goal, or choose one manually below.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Leads Card */}
            <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300">
              <div className="h-20 w-20 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
                <h3 className="text-xl font-semibold">Leads</h3>
                <p className="text-sm text-muted-foreground">
                  Collect info from potential customers
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  setSelectedGoal("leads")
                  setTimeout(() => {
                    startSetup()
                    window.dispatchEvent(new CustomEvent('triggerGoalSetup', { 
                      detail: { goalType: 'leads' } 
                    }))
                  }, 100)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 mt-auto"
              >
                Get Leads
              </Button>
            </div>

            {/* Calls Card */}
            <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300">
              <div className="h-20 w-20 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4">
                <Phone className="h-10 w-10 text-blue-600" />
              </div>
              <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
                <h3 className="text-xl font-semibold">Calls</h3>
                <p className="text-sm text-muted-foreground">
                  Get people to call your business directly
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  setSelectedGoal("calls")
                  setTimeout(() => {
                    startSetup()
                    window.dispatchEvent(new CustomEvent('triggerGoalSetup', { 
                      detail: { goalType: 'calls' } 
                    }))
                  }, 100)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 mt-auto"
              >
                Get Calls
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Goal selected - show setup button
  if (goalState.status === "selecting") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">Goal Selected</h2>
            <p className="text-muted-foreground">
              Ready to set up your {goalState.selectedGoal} goal
            </p>
          </div>

          <div className="flex justify-center">
            <div className="p-12 rounded-2xl border-2 border-blue-500 bg-blue-500/5">
              <div className="h-32 w-32 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 mx-auto">
                {goalState.selectedGoal === "leads" ? (
                  <Users className="h-16 w-16 text-blue-600" />
                ) : (
                  <Phone className="h-16 w-16 text-blue-600" />
                )}
              </div>
              <h3 className="text-2xl font-semibold text-center capitalize mb-2">
                {goalState.selectedGoal}
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                {goalState.selectedGoal === "leads" 
                  ? "Collect info from potential customers" 
                  : "Get people to call your business"}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={resetGoal}
            >
              Change Goal
            </Button>
            <Button
              size="lg"
              onClick={handleSetupClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              Setup {goalState.selectedGoal}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Setup in progress
  if (goalState.status === "setup-in-progress") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Setting up your goal...</h2>
            <p className="text-muted-foreground">
              AI is configuring your goal setup. This may take a few seconds.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Setup completed
  if (goalState.status === "completed") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Goal</h2>
            <p className="text-muted-foreground">
              Your goal is ready to use.
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Goal:</span>
              <span className="text-sm capitalize">{goalState.selectedGoal}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Lead Type:</span>
              <span className="text-sm">Instant Form</span>
            </div>
            {goalState.formData?.name && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Form:</span>
                <span className="text-sm text-blue-600">{goalState.formData.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <span className="text-sm text-green-600 font-medium">Ready to publish</span>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-600">
              ⚠️ Once published, this goal cannot be changed
            </p>
          </div>

          <p className="text-sm text-muted-foreground pt-2">
            Setup complete. You can now continue to Ad Creation.
          </p>
          
          {!isPublished && (
            <Button
              variant="outline"
              size="lg"
              onClick={resetGoal}
              className="mt-4"
            >
              Change Goal
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (goalState.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Setup Failed</h2>
            <p className="text-muted-foreground">
              {goalState.errorMessage || "Setup couldn't complete. Try again or ask AI for help."}
            </p>
          </div>
          
          <Button
            size="lg"
            onClick={resetGoal}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return null
}

