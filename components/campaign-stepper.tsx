"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronLeft, ChevronRight, LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Step {
  id: string
  number: number
  title: string
  description: string
  completed: boolean
  content: React.ReactNode
  icon?: LucideIcon
}

// Dynamic content for each step
const stepHeaders: Record<string, { title: string; subtitle: string; subtext: string }> = {
  ads: {
    title: "Ad Creative",
    subtitle: "Select the design that stands out",
    subtext: "Pick a creative that best represents your brand"
  },
  copy: {
    title: "Ad Copy",
    subtitle: "Choose words that convert",
    subtext: "Select compelling copy for your campaign"
  },
  location: {
    title: "Ad Location",
    subtitle: "Reach the right places",
    subtext: "Define where your ads will appear"
  },
  audience: {
    title: "Ad Audience",
    subtitle: "Connect with ideal customers",
    subtext: "Define who will see your ads"
  },
  goal: {
    title: "Set Your Objective",
    subtitle: "Define what success looks like",
    subtext: "Choose your campaign's primary goal"
  },
  budget: {
    title: "Launch Campaign",
    subtitle: "Set budget and go live",
    subtext: "Configure spending and publish your ads"
  }
}

interface CampaignStepperProps {
  steps: Step[]
}

export function CampaignStepper({ steps }: CampaignStepperProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const hasInitializedRef = useRef(false)
  // Snapshot how many steps were completed at initial render. If zero, we are in a fresh session
  // and should NOT auto-jump when the first completion occurs. If greater than zero, we likely
  // restored a partially completed flow and may jump to the first incomplete step once.
  const initialCompletedCountRef = useRef<number>(steps.filter(s => s.completed).length)

  // Auto-jump once only for restored sessions (not during live progression)
  useEffect(() => {
    if (hasInitializedRef.current) return

    // Wait until any step reports completed (signals restore landed)
    const hasAnyCompletion = steps.some(s => s.completed)
    if (!hasAnyCompletion) return

    // If we started with zero completions, this is a live session. Do not auto-advance.
    if (initialCompletedCountRef.current === 0) {
      hasInitializedRef.current = true
      return
    }

    // If some step is incomplete, jump to the first incomplete
    // If all are complete, jump to the last step
    const firstIncomplete = steps.findIndex(s => !s.completed)
    const targetIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete

    setCurrentStepIndex(targetIndex)
    hasInitializedRef.current = true
  }, [steps])

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1
  const canGoNext = currentStep.completed

  const handleNext = () => {
    if (canGoNext && !isLastStep) {
      setDirection('forward')
      setCurrentStepIndex(prev => prev + 1)
      // Dispatch event to clear any editing references
      window.dispatchEvent(new CustomEvent('stepNavigation', { detail: { direction: 'next' } }))
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setDirection('backward')
      setCurrentStepIndex(prev => prev - 1)
      // Dispatch event to clear any editing references
      window.dispatchEvent(new CustomEvent('stepNavigation', { detail: { direction: 'back' } }))
    }
  }

  const handleStepClick = (index: number) => {
    // Only allow navigation to completed steps or the next step if current is complete
    const targetStep = steps[index]
    const isTargetCompleted = targetStep.completed
    const isNextStep = index === currentStepIndex + 1
    const isPreviousStep = index < currentStepIndex
    const canNavigate = isTargetCompleted || isPreviousStep || (isNextStep && currentStep.completed)
    
    if (!canNavigate) {
      return // Block navigation to incomplete future steps
    }
    
    setDirection(index > currentStepIndex ? 'forward' : 'backward')
    setCurrentStepIndex(index)
    // Dispatch event to clear any editing references
    window.dispatchEvent(new CustomEvent('stepNavigation', { detail: { direction: index > currentStepIndex ? 'forward' : 'backward' } }))
  }

  // Get dynamic header content for current step
  const currentStepHeader = stepHeaders[currentStep.id] || {
    title: currentStep.title,
    subtitle: currentStep.description,
    subtext: "Complete this step to continue"
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Progress Header */}
      <div className="px-6 pt-4 pb-4 border-b border-border bg-card flex-shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-4 h-14">
            <h1 className="text-xl font-bold mb-1 leading-tight">{currentStepHeader.title}</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              {currentStepHeader.subtext}
            </p>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 h-10">
            {steps.map((step, index) => {
              const isTargetCompleted = step.completed
              const isNextStep = index === currentStepIndex + 1
              const isPreviousStep = index < currentStepIndex
              const canNavigate = isTargetCompleted || isPreviousStep || (isNextStep && currentStep.completed)
              
              return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => handleStepClick(index)}
                  disabled={!canNavigate}
                  className={cn(
                    "relative flex items-center justify-center transition-opacity",
                    index === currentStepIndex
                      ? "h-10 w-10"
                      : "h-8 w-8",
                    !canNavigate && "opacity-40 cursor-not-allowed"
                  )}
                  title={step.title}
                >
                  <div
                    className={cn(
                      "rounded-full flex items-center justify-center font-bold text-sm transition-all absolute inset-0",
                      step.completed
                        ? "bg-green-500 text-white"
                        : index === currentStepIndex
                        ? "bg-blue-500 text-white"
                        : canNavigate
                        ? "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    {step.completed ? (
                      <Check className="h-4 w-4" />
                    ) : step.icon ? (
                      <step.icon className="h-4 w-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  
                  {/* Active step indicator ring */}
                  {index === currentStepIndex && (
                    <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-in zoom-in duration-200" />
                  )}
                </button>
                
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-8 md:w-16 transition-colors",
                      steps[index + 1].completed || index < currentStepIndex
                        ? "bg-green-500"
                        : "bg-muted"
                    )}
                  />
                )}
              </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-hidden relative">
        <div 
          key={currentStepIndex}
          className={cn(
            "absolute inset-0 overflow-auto",
            "animate-in fade-in duration-300",
            direction === 'forward' ? "slide-in-from-right-4" : "slide-in-from-left-4"
          )}
        >
          <div className="p-6 min-h-full">
            {currentStep.content}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="border-t border-border bg-card px-6 py-4 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex-1">
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {!currentStep.completed && (
              <span className="text-yellow-600 dark:text-yellow-500">
                Complete this step to continue
              </span>
            )}
          </div>

          <div className="flex-1 flex justify-end">
            {!isLastStep && (
              <Button
                onClick={handleNext}
                disabled={!canGoNext}
                className="gap-2 bg-[#4B73FF] hover:bg-[#3d5fd9] disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
