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
  campaignId?: string
}

export function CampaignStepper({ steps, campaignId }: CampaignStepperProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const hasInitializedRef = useRef(false)
  // During hydration many contexts may mark steps as completed at once. We treat
  // that as a restored session and jump to the first incomplete step exactly once.

  // Auto-jump once only for restored sessions (not during live progression)
  useEffect(() => {
    if (hasInitializedRef.current) return

    const completedCount = steps.filter(s => s.completed).length
    if (completedCount < 1) return // wait until at least one step reports completed

    // Determine the first incomplete (or last if all done)
    const firstIncomplete = steps.findIndex(s => !s.completed)
    const targetIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete

    // Try sessionStorage fallback to restore exact last seen step for this campaign
    let initialIndex = targetIndex
    try {
      const key = `campaign:${campaignId ?? 'global'}:lastStepId`
      const savedId = typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null
      const savedIndex = savedId ? steps.findIndex(s => s.id === savedId) : -1
      // Never restore behind the first incomplete step (prefer first incomplete)
      if (savedIndex >= 0) initialIndex = Math.max(savedIndex, targetIndex)
    } catch {
      // no-op: sessionStorage may be unavailable
    }

    setCurrentStepIndex(initialIndex)
    hasInitializedRef.current = true
  }, [steps, campaignId])

  // Clamp currentStepIndex whenever steps array size or ordering changes
  useEffect(() => {
    if (currentStepIndex > steps.length - 1) {
      setCurrentStepIndex(Math.max(0, steps.length - 1))
    }
  }, [steps.length, currentStepIndex])

  // Persist last seen step id in sessionStorage for instant restore on refresh
  useEffect(() => {
    try {
      const key = `campaign:${campaignId ?? 'global'}:lastStepId`
      const step = steps[currentStepIndex]
      if (step) window.sessionStorage.setItem(key, step.id)
    } catch {
      // ignore write failures (private mode, etc.)
    }
  }, [currentStepIndex, steps, campaignId])

  // Support external navigation requests (Edit links in summary cards)
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ id?: string }>
      const stepId = custom.detail?.id
      if (!stepId) return
      const targetIndex = steps.findIndex((s) => s.id === stepId)
      if (targetIndex < 0) return

      // Rules: allow moving backward freely; allow moving forward only to
      // completed steps, never beyond the first incomplete step.
      const firstIncomplete = steps.findIndex((s) => !s.completed)
      const maxForwardIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete

      const clampedIndex = targetIndex <= currentStepIndex
        ? targetIndex // backward edit always allowed
        : Math.min(targetIndex, maxForwardIndex)

      if (clampedIndex === currentStepIndex) return

      setDirection(clampedIndex > currentStepIndex ? 'forward' : 'backward')
      setCurrentStepIndex(clampedIndex)
    }

    window.addEventListener('gotoStep', handler as EventListener)
    return () => window.removeEventListener('gotoStep', handler as EventListener)
  }, [steps, currentStepIndex])

  // Handle legacy switchToTab events to navigate to a step by id (e.g., from AI chat tool UI)
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<string | { id?: string }>
      const detail = custom.detail
      const stepId = typeof detail === 'string' ? detail : (detail && typeof detail === 'object' ? (detail as { id?: string }).id : undefined)
      if (!stepId) return

      const targetIndex = steps.findIndex((s) => s.id === stepId)
      if (targetIndex < 0) return

      const firstIncomplete = steps.findIndex((s) => !s.completed)
      const maxForwardIndex = firstIncomplete === -1 ? steps.length - 1 : firstIncomplete

      const clampedIndex = targetIndex <= currentStepIndex
        ? targetIndex
        : Math.min(targetIndex, maxForwardIndex)

      if (clampedIndex === currentStepIndex) return

      setDirection(clampedIndex > currentStepIndex ? 'forward' : 'backward')
      setCurrentStepIndex(clampedIndex)
    }

    window.addEventListener('switchToTab', handler as EventListener)
    return () => window.removeEventListener('switchToTab', handler as EventListener)
  }, [steps, currentStepIndex])

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex >= steps.length - 1
  const currentStepCompleted = Boolean(currentStep?.completed)
  const canGoNext = currentStepCompleted

  const handleNext = () => {
    if (canGoNext && !isLastStep) {
      setDirection('forward')
      setCurrentStepIndex(prev => prev + 1)
      // Dispatch event to clear any editing references
      window.dispatchEvent(new CustomEvent('stepNavigation', { detail: { direction: 'next' } }))
    }
  }

  // Listen for global auto-advance events (e.g., after AI targeting or Meta connect)
  useEffect(() => {
    const handler = () => {
      // Ignore auto-advance signals during hydration/init to prevent spurious jumps
      if (!hasInitializedRef.current) return
      if (currentStepCompleted && !isLastStep) {
        handleNext()
      }
    }
    window.addEventListener('autoAdvanceStep', handler)
    return () => window.removeEventListener('autoAdvanceStep', handler)
  }, [currentStepCompleted, isLastStep])

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
    const canNavigate = isTargetCompleted || isPreviousStep || (isNextStep && currentStepCompleted)
    
    if (!canNavigate) {
      return // Block navigation to incomplete future steps
    }
    
    setDirection(index > currentStepIndex ? 'forward' : 'backward')
    setCurrentStepIndex(index)
    // Dispatch event to clear any editing references
    window.dispatchEvent(new CustomEvent('stepNavigation', { detail: { direction: index > currentStepIndex ? 'forward' : 'backward' } }))
  }

  // Get dynamic header content for current step
  const currentStepHeader = currentStep
    ? (stepHeaders[currentStep.id] || {
        title: currentStep.title,
        subtitle: currentStep.description,
        subtext: "Complete this step to continue"
      })
    : { title: "", subtitle: "", subtext: "" }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* If steps are not ready yet (e.g., during goal switch), render a lightweight placeholder while keeping hooks order stable */}
      {!currentStep ? (
        <>
          <div className="px-6 pt-4 pb-4 border-b border-border bg-card flex-shrink-0" />
          <div className="flex-1" />
          <div className="border-t border-border bg-card px-6 py-4 flex-shrink-0" />
        </>
      ) : (
        <>
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
                  const canNavigate = isTargetCompleted || isPreviousStep || (isNextStep && currentStepCompleted)
                  
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
                {!currentStepCompleted && (
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
        </>
      )}
    </div>
  )
}
