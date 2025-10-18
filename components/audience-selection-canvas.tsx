"use client"

import { Users, Sparkles, CheckCircle2, Loader2, Lock, Brain, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAudience } from "@/lib/context/audience-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"

export function AudienceSelectionCanvas() {
  const { audienceState, resetAudience, updateStatus } = useAudience()
  const { isPublished } = useAdPreview()

  const handleSetupAI = () => {
    // Trigger AI to handle setup
    updateStatus("setup-in-progress")
    
    // Dispatch event to AI chat
    window.dispatchEvent(new CustomEvent('triggerAudienceSetup', { 
      detail: { mode: 'ai' } 
    }))
  }

  // If published, show locked state
  if (isPublished) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-orange-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Audience Locked</h2>
            <p className="text-muted-foreground">
              This ad has been published. Audience targeting cannot be changed once an ad is live.
            </p>
          </div>
          
          {audienceState.status === "completed" && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Targeting Mode:</span>
                <Badge className="bg-cyan-600 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Advantage+
                </Badge>
              </div>
              {audienceState.targeting.description && (
                <div className="flex items-start gap-2 pt-2 border-t border-border">
                  <span className="text-sm font-medium">Strategy:</span>
                  <p className="text-sm text-muted-foreground flex-1">
                    {audienceState.targeting.description}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm font-medium">Status:</span>
                <span className="text-sm text-orange-600 font-medium flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Published
                </span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground pt-4">
            To modify audience targeting, you must first unpublish or create a new ad campaign.
          </p>
        </div>
      </div>
    )
  }

  // Initial state - no audience set
  if (audienceState.status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">Audience Targeting</h2>
            <p className="text-muted-foreground">
              Ask AI to set your audience, or choose one manually below.
            </p>
          </div>

          <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
            {/* AI Advantage+ Card */}
            <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-cyan-500 bg-cyan-500/5 transition-all duration-300">
              <div className="h-20 w-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors relative mb-4">
                <Target className="h-10 w-10 text-cyan-600" />
                <Sparkles className="h-4 w-4 text-cyan-600 absolute top-1 right-1" />
              </div>
              <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
                <h3 className="text-xl font-semibold">AI Advantage+</h3>
                <p className="text-sm text-muted-foreground">
                  Let Meta's AI automatically find your ideal audience
                </p>
              </div>
              <Button
                size="lg"
                disabled
                className="bg-cyan-600 text-white px-8 mt-auto cursor-default opacity-100"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Default
              </Button>
            </div>

            {/* Manual Selection - Coming Soon */}
            <div className="flex items-center justify-center py-3 px-4 rounded-lg border border-dashed border-border/50 bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Manual selections coming soon
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Setup in progress
  if (audienceState.status === "setup-in-progress") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-cyan-600 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Setting up AI Targeting...</h2>
            <p className="text-muted-foreground">
              Configuring Meta's AI Advantage+ for optimal audience reach
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Setup completed
  if (audienceState.status === "completed") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Audience Targeting</h2>
            <p className="text-muted-foreground">
              AI will automatically optimize your audience for best results
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6 space-y-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Targeting Mode:</span>
              <Badge className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Advantage+
              </Badge>
            </div>

            {audienceState.targeting.description && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <span className="text-sm font-medium">Targeting Strategy:</span>
                  <p className="text-sm text-muted-foreground bg-cyan-500/5 p-3 rounded-lg border border-cyan-500/10">
                    {audienceState.targeting.description}
                  </p>
                </div>
              </>
            )}

            {audienceState.targeting.interests && audienceState.targeting.interests.length > 0 && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <span className="text-sm font-medium">Interest Signals:</span>
                  <div className="flex flex-wrap gap-2">
                    {audienceState.targeting.interests.map((interest, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    AI will use these as starting signals and expand automatically
                  </p>
                </div>
              </>
            )}

            {audienceState.targeting.demographics && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <span className="text-sm font-medium">Demographics:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {audienceState.targeting.demographics.ageMin && (
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">Age Range:</span>
                        <span className="font-medium">
                          {audienceState.targeting.demographics.ageMin}-{audienceState.targeting.demographics.ageMax || "65+"}
                        </span>
                      </div>
                    )}
                    {audienceState.targeting.demographics.gender && audienceState.targeting.demographics.gender !== "all" && (
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">Gender:</span>
                        <span className="font-medium capitalize">{audienceState.targeting.demographics.gender}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              <span className="text-sm text-green-600 font-medium">Ready to publish</span>
            </div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div className="text-left text-sm space-y-1">
                <p className="font-medium text-cyan-700 dark:text-cyan-400">How AI Advantage+ Works:</p>
                <p className="text-cyan-600 dark:text-cyan-300 text-xs">
                  Meta's AI will test your ad with different audiences, learning which groups respond best. 
                  It automatically adjusts targeting to maximize your results while staying within your budget.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-600">
              ⚠️ Once published, audience targeting cannot be changed
            </p>
          </div>

          {!isPublished && (
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                size="lg"
                onClick={resetAudience}
              >
                Reset Audience
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('triggerAudienceSetup'))
                }}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Refine with AI
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (audienceState.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Setup Failed</h2>
            <p className="text-muted-foreground">
              {audienceState.errorMessage || "Couldn't set up audience targeting. Try again or ask AI for help."}
            </p>
          </div>
          
          <Button
            size="lg"
            onClick={resetAudience}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return null
}
