"use client"

import { Users, Sparkles, Check, Loader2, Lock, Target, Palette, Type, MapPin, Flag, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAudience } from "@/lib/context/audience-context"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { useGoal } from "@/lib/context/goal-context"
import { useLocation } from "@/lib/context/location-context"

export function AudienceSelectionCanvas() {
  const { audienceState, resetAudience, updateStatus, setSelected } = useAudience()
  const { isPublished, adContent } = useAdPreview()
  const { goalState } = useGoal()
  const { locationState } = useLocation()
  
  const isSelected = audienceState.isSelected

  const handleGenerateAudience = () => {
    // Update status to generating
    updateStatus("generating")
    
    // Dispatch event to AI chat with full context
    // NOTE: Goal comes AFTER audience, so we don't include it here
    window.dispatchEvent(new CustomEvent('generateAudience', {
      detail: {
        adContent,
        locations: locationState.locations
      }
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
    // Check if we have enough context to generate
    const hasAdCreative = !!adContent?.imageUrl
    const hasAdCopy = !!(adContent?.headline && adContent?.body)
    const hasLocations = locationState.locations.length > 0
    const canGenerate = hasAdCreative && hasAdCopy && hasLocations

    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-2xl w-full space-y-8">
          <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
            {/* AI Advantage+ Card - Matching Goal/Location Design Pattern */}
            <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300">
              <div className="h-20 w-20 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4">
                <Target className="h-10 w-10 text-blue-600" />
              </div>
              <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
                <h3 className="text-xl font-semibold">Audience</h3>
                <p className="text-sm text-muted-foreground">
                  Let AI find people most likely to respond
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleGenerateAudience}
                disabled={!canGenerate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 mt-auto"
              >
                AI Targeting
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Generating state - analyzing campaign context
  if (audienceState.status === "generating") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-xl w-full space-y-6 text-center">
          <Loader2 className="h-16 w-16 animate-spin text-cyan-600 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Analyzing Your Campaign...</h2>
            <p className="text-muted-foreground">
              AI is creating your perfect audience profile
            </p>
          </div>
          
          {/* Show what's being analyzed with icons */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-left text-sm">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Palette className="h-3 w-3 text-purple-600" />
              </div>
              <span>Reviewing creative...</span>
              <Loader2 className="h-3 w-3 animate-spin text-cyan-600 ml-auto" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                <Type className="h-3 w-3 text-pink-600" />
              </div>
              <span>Reading copy...</span>
              <Loader2 className="h-3 w-3 animate-spin text-cyan-600 ml-auto" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-3 w-3 text-green-600" />
              </div>
              <span>Understanding locations...</span>
              <Loader2 className="h-3 w-3 animate-spin text-cyan-600 ml-auto" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Target className="h-3 w-3 text-cyan-600" />
              </div>
              <span>Building profile...</span>
              <Loader2 className="h-3 w-3 animate-spin text-cyan-600 ml-auto" />
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
            <h2 className="text-2xl font-bold">Finding Your People...</h2>
            <p className="text-muted-foreground">
              AI is figuring out who should see your ad
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Helper function to format demographics naturally
  const getDemographicsText = () => {
    const demo = audienceState.targeting.demographics;
    if (!demo) return "Adults of any age and gender";
    
    const genderText = demo.gender === "male" ? "Men" : demo.gender === "female" ? "Women" : "Women & Men";
    const ageText = demo.ageMin ? `ages ${demo.ageMin}-${demo.ageMax || "65+"}` : "any age";
    
    return `${genderText}, ${ageText}`;
  };

  // Helper function to format interests naturally
  const getInterestsText = () => {
    const interests = audienceState.targeting.interests;
    if (!interests || interests.length === 0) return null;
    
    if (interests.length === 1) return `Interested in ${interests[0]}`;
    if (interests.length === 2) return `Interested in ${interests[0]} and ${interests[1]}`;
    
    return `Interested in ${interests[0]}, ${interests[1]}, and more`;
  };

  const handleSelectAudience = () => {
    setSelected(true)
  }

  const handleEditAudience = () => {
    // Create reference context for the AI chat to render
    const referenceContext = {
      type: 'audience_reference',
      action: 'edit',
      
      // Current audience data to edit
      content: {
        demographics: getDemographicsText(),
        interests: getInterestsText(),
        description: audienceState.targeting.description,
        targeting: audienceState.targeting,
      },
      
      // Context for AI to understand what to edit
      metadata: {
        timestamp: new Date().toISOString(),
        editMode: true,
        canRegenerate: true,
        fields: ['demographics', 'interests', 'description']
      }
    }
    
    // Dispatch event to show reference and enable edit mode
    window.dispatchEvent(new CustomEvent('openEditInChat', { 
      detail: referenceContext
    }))
  }

  // Setup completed
  if (audienceState.status === "completed") {

    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="max-w-2xl w-full space-y-6">
          {/* Visual Persona Card */}
          <div className="bg-card border-2 border-border rounded-2xl p-8 space-y-6">
            {/* Icon Section - Matching Location/Goal Pattern */}
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                <Users className="h-10 w-10 text-cyan-600" />
              </div>
            </div>

            {/* Heading */}
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">Who Will See Your Ad</h3>
              <p className="text-sm text-muted-foreground">Your ideal audience profile</p>
            </div>

            {/* Visual Bullets - Natural Language */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">👤</span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-base font-medium">{getDemographicsText()}</p>
                </div>
              </div>

              {getInterestsText() && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">💼</span>
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-base font-medium">{getInterestsText()}</p>
                  </div>
                </div>
              )}

              {audienceState.targeting.description && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🎯</span>
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="text-base font-medium">{audienceState.targeting.description}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-base font-medium">AI finds more people like this automatically</p>
                </div>
              </div>
            </div>

            {/* Action Buttons - Matching Creative Selection Pattern */}
            {!isPublished && (
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  size="sm"
                  variant={isSelected ? "default" : "secondary"}
                  onClick={handleSelectAudience}
                  className={cn(
                    "text-xs h-8 px-3 font-medium",
                    isSelected 
                      ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-400" 
                      : "bg-white hover:bg-white/90 text-black border"
                  )}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-3 w-3 mr-1.5" />
                      Selected
                    </>
                  ) : (
                    'Select'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleEditAudience}
                  className="text-xs h-8 px-3 font-medium bg-white hover:bg-white/90 text-black border"
                >
                  <Edit2 className="h-3 w-3 mr-1.5" />
                  Edit
                </Button>
              </div>
            )}
          </div>
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
            <h2 className="text-2xl font-bold">Something Went Wrong</h2>
            <p className="text-muted-foreground">
              {audienceState.errorMessage || "Couldn't set this up. Want to try again?"}
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
