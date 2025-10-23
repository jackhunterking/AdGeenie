"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, ImageIcon, Video, Layers, Sparkles, DollarSign, Plus, Minus, Building2, Check, Facebook, Loader2, Edit2, RefreshCw, Palette, Type, MapPin, Target, Rocket, Flag } from "lucide-react"
import { LocationSelectionCanvas } from "./location-selection-canvas"
import { AudienceSelectionCanvas } from "./audience-selection-canvas"
import { AdCopySelectionCanvas } from "./ad-copy-selection-canvas"
import { useAdPreview } from "@/lib/context/ad-preview-context"
import { GoalSelectionCanvas } from "./goal-selection-canvas"
import { CampaignStepper } from "./campaign-stepper"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBudget } from "@/lib/context/budget-context"
import { useLocation } from "@/lib/context/location-context"
import { useAudience } from "@/lib/context/audience-context"
import { useGoal } from "@/lib/context/goal-context"
import { useAdCopy } from "@/lib/context/ad-copy-context"
import { cn } from "@/lib/utils"
import { newEditSession } from "@/lib/utils/edit-session"
import { MetaConnectStep } from "./meta-connect-step"

const mockAdAccounts = [
  { id: "act_123456789", name: "Main Business Account", currency: "USD" },
  { id: "act_987654321", name: "Marketing Campaign Account", currency: "USD" },
  { id: "act_456789123", name: "Test Account", currency: "CAD" },
]

export function PreviewPanel() {
  const [activeFormat, setActiveFormat] = useState("feed")
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  const { adContent, setAdContent, isPublished, setIsPublished, selectedImageIndex, setSelectedCreativeVariation, setSelectedImageIndex } = useAdPreview()
  const { budgetState, setDailyBudget, setSelectedAdAccount, setIsConnected, isComplete } = useBudget()
  const { locationState } = useLocation()
  const { audienceState } = useAudience()
  const { goalState } = useGoal()
  const { adCopyState } = useAdCopy()
  const [showReelMessage, setShowReelMessage] = useState(false)
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetInputValue, setBudgetInputValue] = useState(budgetState.dailyBudget.toString())
  
  // Listen for image edit events from AI chat (always mounted)
  useEffect(() => {
    const handleImageEdited = (event: Event) => {
      const customEvent = event as CustomEvent<{ sessionId?: string; variationIndex: number; newImageUrl: string }>;
      const { sessionId, variationIndex, newImageUrl } = customEvent.detail;
      // Only accept tool-originated updates that carry a sessionId
      if (!sessionId) return;
      
      console.log(`[CANVAS] Received imageEdited event for variation ${variationIndex}:`, newImageUrl);
      
      // Update ad content with new image URL
      if (!adContent?.imageVariations) {
        console.warn(`[CANVAS] No imageVariations to update`);
        return;
      }
      
      const updatedVariations = [...adContent.imageVariations];
      updatedVariations[variationIndex] = newImageUrl;
      
      console.log(`[CANVAS] ✅ Updated variation ${variationIndex} with new image`);
      console.log(`[CANVAS] 📤 Auto-save will trigger (context change)`);
      
      setAdContent({
        ...adContent,
        imageVariations: updatedVariations,
      });
    };
    
    window.addEventListener('imageEdited', handleImageEdited);
    
    return () => {
      window.removeEventListener('imageEdited', handleImageEdited);
    };
  }, [setAdContent]);
  
  const minBudget = 5
  const maxBudget = 100
  const increment = 5

  const previewFormats = [
    { id: "feed", label: "Feed", icon: ImageIcon },
    { id: "story", label: "Story", icon: Layers },
    { id: "reel", label: "Reel", icon: Video },
  ]

  const handleReelClick = () => {
    setShowReelMessage(true)
    setTimeout(() => setShowReelMessage(false), 2500)
  }

  const handleIncrementBudget = () => {
    const newBudget = Math.min(budgetState.dailyBudget + increment, maxBudget)
    setDailyBudget(newBudget)
    setBudgetInputValue(newBudget.toString())
  }

  const handleDecrementBudget = () => {
    const newBudget = Math.max(budgetState.dailyBudget - increment, minBudget)
    setDailyBudget(newBudget)
    setBudgetInputValue(newBudget.toString())
  }

  const handleBudgetClick = () => {
    setIsEditingBudget(true)
    setBudgetInputValue(budgetState.dailyBudget.toString())
  }

  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setBudgetInputValue(value)
  }

  const handleBudgetInputBlur = () => {
    const numValue = Number.parseInt(budgetInputValue) || minBudget
    const clampedValue = Math.max(minBudget, Math.min(maxBudget, numValue))
    setDailyBudget(clampedValue)
    setBudgetInputValue(clampedValue.toString())
    setIsEditingBudget(false)
  }

  const handleBudgetInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBudgetInputBlur()
    } else if (e.key === "Escape") {
      setIsEditingBudget(false)
      setBudgetInputValue(budgetState.dailyBudget.toString())
    }
  }

  const handleAccountSelect = (accountId: string) => {
    setSelectedAdAccount(accountId)
  }

  const handleConnectMeta = () => {
    // Simulate Meta connection
    setIsConnected(true)
    // In real implementation, this would open OAuth flow
  }

  const handlePublish = () => {
    if (allStepsComplete) {
      setIsPublished(!isPublished)
    }
  }

  const handleSelectAd = (index: number) => {
    // Toggle selection against persisted selectedImageIndex
    if (selectedImageIndex === index) {
      setSelectedCreativeVariation(null)
      setSelectedImageIndex(null)
      return
    }
    const variation = adVariations[index]
    setSelectedCreativeVariation(variation)
    setSelectedImageIndex(index)
  }

  const handleEditAd = (index: number) => {
    // Send variation to AI chat for editing with rich visual reference
    const variation = adVariations[index]
    const currentFormat = activeFormat
    
    // Get the actual generated image for this variation if it exists
    const variationImageUrl = adContent?.imageVariations?.[index]
    
    // Create reference context for the AI chat to render
    const editSession = newEditSession({
      variationIndex: index,
      imageUrl: variationImageUrl,
    })

    const referenceContext = {
      type: 'ad_variation_reference',
      action: 'edit',
      variationIndex: index,
      variationTitle: variation.title,
      format: currentFormat,
      gradient: variation.gradient,
      imageUrl: variationImageUrl, // Use the specific variation's image
      editSession,
      
      // Ad copy content for the reference card
      content: {
        primaryText: adContent?.body,
        headline: adContent?.headline,
        description: adContent?.body,
      },
      
      // Visual preview data
      preview: {
        format: currentFormat,
        gradient: variation.gradient,
        title: variation.title,
        imageUrl: variationImageUrl, // Include in preview as well
        brandName: 'Your Brand',
        headline: adContent?.headline,
        body: adContent?.body,
        dimensions: currentFormat === 'story' 
          ? { width: 360, height: 640, aspect: '9:16' }
          : { width: 500, height: 500, aspect: '1:1' }
      },
      
      // Metadata
      metadata: {
        timestamp: new Date().toISOString(),
        editMode: true,
        canRegenerate: true,
        selectedFormat: currentFormat
      }
    }
    
    // Only dispatch one event to show reference and enable edit mode
    // Do NOT send a message automatically
    window.dispatchEvent(new CustomEvent('openEditInChat', { 
      detail: referenceContext
    }))
  }

  const handleRegenerateAd = async (index: number) => {
    setRegeneratingIndex(index)
    
    // Prepare context message for AI - create similar variation of this specific ad
    const variation = adVariations[index]
    const currentFormat = activeFormat
    const message = `Create a similar variation of ad ${index + 1} (${variation.title}). Reference the existing ${currentFormat} format design, maintain similar style and color scheme (${variation.gradient}), but generate fresh creative elements with different imagery, slightly varied copy, and alternative visual approach. Keep the same brand message and ad structure but make it feel like a new variation of this specific design.`
    
    // Dispatch event to AI chat to regenerate this specific variation
    window.dispatchEvent(new CustomEvent('sendMessageToAI', { 
      detail: { 
        message,
        context: {
          action: 'regenerate',
          variationIndex: index,
          format: currentFormat,
          variationTitle: variation.title,
          gradient: variation.gradient,
          referenceImage: adContent?.imageUrl,
          originalDesign: true
        }
      } 
    }))
    
    // Simulate regeneration delay
    setTimeout(() => {
      setRegeneratingIndex(null)
    }, 2500)
  }

  // Check if all steps are complete
  const allStepsComplete = 
    selectedImageIndex !== null &&
    adCopyState.status === "completed" &&
    locationState.status === "completed" &&
    audienceState.status === "completed" &&
    goalState.status === "completed" &&
    isComplete()

  // Mock ad variations with different gradients
  const adVariations = [
    { gradient: "from-blue-600 via-blue-500 to-cyan-500", title: "Variation 1" },
    { gradient: "from-purple-600 via-purple-500 to-pink-500", title: "Variation 2" },
    { gradient: "from-green-600 via-green-500 to-emerald-500", title: "Variation 3" },
    { gradient: "from-orange-600 via-orange-500 to-yellow-500", title: "Variation 4" },
    { gradient: "from-indigo-600 via-indigo-500 to-blue-500", title: "Variation 5" },
    { gradient: "from-rose-600 via-rose-500 to-red-500", title: "Variation 6" },
  ]

  // Render single Feed ad mockup
  const renderFeedAd = (variation: typeof adVariations[0], index: number) => {
    const isSelected = selectedImageIndex === index
    const isRegenerating = regeneratingIndex === index
    const isProcessing = isRegenerating
    
    return (
      <div 
        key={index} 
        className={`rounded-lg border-2 bg-card overflow-hidden hover:shadow-lg transition-all relative group ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border'
        } ${isProcessing ? 'opacity-75' : ''}`}
      >
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <div className="bg-card/95 rounded-xl px-4 py-3 shadow-2xl border border-border/50 flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium">
                Regenerating...
              </span>
            </div>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && !isProcessing && (
          <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        )}

        {/* Action Buttons Overlay */}
        {!isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex items-center justify-center p-4">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isSelected ? "default" : "secondary"}
                onClick={() => handleSelectAd(index)}
                className={cn(
                  "text-xs h-8 px-3 font-medium backdrop-blur-sm",
                  isSelected ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-400" : "bg-white/90 hover:bg-white text-black"
                )}
                disabled={regeneratingIndex === index}
              >
                {isSelected ? 'Unselect' : 'Select'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleEditAd(index)}
                className="text-xs h-8 px-3 font-medium bg-white/90 hover:bg-white text-black backdrop-blur-sm"
                disabled={regeneratingIndex === index}
              >
                <Edit2 className="h-3 w-3 mr-1.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleRegenerateAd(index)}
                className="text-xs h-8 px-3 font-medium bg-white/90 hover:bg-white text-black backdrop-blur-sm"
                disabled={regeneratingIndex === index}
              >
                {regeneratingIndex === index ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-3 border-b border-border">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">Your Brand</p>
            <p className="text-[10px] text-muted-foreground">Sponsored</p>
          </div>
        </div>

        {adContent?.imageVariations?.[index] ? (
          <div className="aspect-square relative overflow-hidden">
            <img
              src={adContent.imageVariations[index]}
              alt={adContent.headline}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className={`aspect-square bg-gradient-to-br ${variation.gradient} flex items-center justify-center`}>
            <div className="text-center text-white p-4">
              <p className="text-sm font-bold">{variation.title}</p>
            </div>
          </div>
        )}

        <div className="p-3 space-y-1.5">
          <div className="flex items-center gap-3">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-xs line-clamp-2">
            <span className="font-semibold">Your Brand</span>{" "}
            {adContent?.body || "Your ad caption goes here..."}
          </p>
        </div>
      </div>
    )
  }

  // Render single Story ad mockup
  const renderStoryAd = (variation: typeof adVariations[0], index: number) => {
    const isSelected = selectedImageIndex === index
    const isRegenerating = regeneratingIndex === index
    const isProcessing = isRegenerating
    
    return (
      <div 
        key={index} 
        className={`aspect-[9/16] rounded-lg border-2 bg-card overflow-hidden relative hover:shadow-lg transition-all group ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-border'
        } ${isProcessing ? 'opacity-75' : ''}`}
      >
        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-30 flex items-center justify-center">
            <div className="bg-card/95 rounded-xl px-4 py-3 shadow-2xl border border-border/50 flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-xs font-medium text-center">
                Regenerating...
              </span>
            </div>
          </div>
        )}

        {/* Selection Indicator */}
        {isSelected && !isProcessing && (
          <div className="absolute top-2 right-2 z-20 bg-blue-500 text-white rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        )}

        {/* Action Buttons Overlay */}
        {!isProcessing && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 flex items-center justify-center p-3">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <Button
                size="sm"
                variant={isSelected ? "default" : "secondary"}
                onClick={() => handleSelectAd(index)}
                className={cn(
                  "text-xs h-8 px-2.5 font-medium backdrop-blur-sm",
                  isSelected ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-400" : "bg-white/95 hover:bg-white text-black"
                )}
                disabled={regeneratingIndex === index}
              >
                {isSelected ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Selected
                  </>
                ) : (
                  'Select'
                )}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleEditAd(index)}
                className="text-xs h-8 px-2.5 font-medium bg-white/95 hover:bg-white text-black backdrop-blur-sm"
                disabled={regeneratingIndex === index}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleRegenerateAd(index)}
                className="text-xs h-8 px-2.5 font-medium bg-white/95 hover:bg-white text-black backdrop-blur-sm"
                disabled={regeneratingIndex === index}
              >
                {regeneratingIndex === index ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {adContent?.imageVariations?.[index] ? (
          <div className="absolute inset-0">
            <img src={adContent.imageVariations[index]} alt={adContent.headline} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
          </div>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${variation.gradient}`} />
        )}
        
        <div className="relative z-10 p-3">
          <div className="h-0.5 bg-white/30 rounded-full mb-3">
            <div className="h-full w-1/3 bg-white rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white flex-shrink-0" />
            <p className="text-white text-xs font-semibold truncate">Your Brand</p>
          </div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 px-3 z-10">
          <div className="bg-white/20 backdrop-blur-sm rounded-full py-2 px-4 text-center">
            <p className="text-white font-semibold text-xs truncate">{adContent?.cta || "Learn More"}</p>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <p className="text-white text-xs font-bold opacity-50">{variation.title}</p>
        </div>
      </div>
    )
  }

  // Step 1: Ads Content with 3x2 Grid
  const adsContent = (
    <div className="space-y-6">
      <div className="flex justify-center pb-4">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
          {previewFormats.map((format) => {
            const Icon = format.icon
            const isActive = activeFormat === format.id

            if (format.id === "reel") {
              return (
                <div key={format.id} className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReelClick}
                    className="px-4 relative"
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {format.label}
                    <Sparkles size={10} className="absolute -top-0.5 -right-0.5 text-yellow-500 animate-pulse" />
                  </Button>
                  {showReelMessage && (
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="bg-popover border border-border rounded-md px-3 py-1.5 shadow-md">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Sparkles size={12} className="text-yellow-500" />
                          <span className="font-medium">Coming Soon!</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Button
                key={format.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFormat(format.id)}
                className="px-4"
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {format.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* 3x2 Grid of Ad Mockups */}
      <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
        {activeFormat === "feed" && adVariations.map((variation, index) => renderFeedAd(variation, index))}
        {activeFormat === "story" && adVariations.map((variation, index) => renderStoryAd(variation, index))}
      </div>

      {/* Info Section */}
      {!adContent?.imageVariations && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">
            Hover over any ad to select, edit, or regenerate
          </p>
        </div>
      )}
    </div>
  )

  // Step 5: Budget & Publish Content
  const budgetPublishContent = (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Budget Selection */}
      <div className="space-y-4">
        <div className="w-full rounded-lg border border-border p-4 bg-card">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <h3 className="text-sm font-medium">Daily Budget</h3>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDecrementBudget}
              disabled={budgetState.dailyBudget <= minBudget}
              className="h-10 w-10 rounded-lg hover:bg-green-500/10 disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </Button>

            {isEditingBudget ? (
              <div className="flex items-baseline gap-0">
                <span className="text-3xl font-bold text-green-600">$</span>
                <Input
                  type="text"
                  value={budgetInputValue}
                  onChange={handleBudgetInputChange}
                  onBlur={handleBudgetInputBlur}
                  onKeyDown={handleBudgetInputKeyDown}
                  autoFocus
                  className="w-[90px] text-3xl font-bold text-green-600 text-center bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-[40px]"
                />
              </div>
            ) : (
              <button
                onClick={handleBudgetClick}
                className="text-3xl font-bold text-green-600 hover:opacity-80 cursor-pointer min-w-[90px] text-center"
              >
                ${budgetState.dailyBudget}
              </button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleIncrementBudget}
              disabled={budgetState.dailyBudget >= maxBudget}
              className="h-10 w-10 rounded-lg hover:bg-green-500/10 disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Ad Account Selection */}
        <div className="w-full rounded-lg border border-border p-4 bg-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
            <h3 className="text-sm font-medium">Ad Account</h3>
            {budgetState.selectedAdAccount && (
              <Check className="h-4 w-4 text-green-600 ml-auto" />
            )}
          </div>
          <Select value={budgetState.selectedAdAccount || ""} onValueChange={handleAccountSelect}>
            <SelectTrigger className="w-full">
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

        {/* Connect Facebook */}
        <div className="w-full rounded-lg border border-blue-500/30 bg-blue-500/5 p-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Facebook className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Connect Your Meta Account</h3>
            <p className="text-sm text-muted-foreground">
              {budgetState.isConnected 
                ? "Your Meta account is connected" 
                : "Connect to publish your ads on Facebook and Instagram"}
            </p>
          </div>
          {budgetState.isConnected ? (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <span className="font-medium">Connected</span>
            </div>
          ) : (
            <Button onClick={handleConnectMeta} className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
              <Facebook className="h-4 w-4" />
              Connect Meta Account
            </Button>
          )}
        </div>

        {/* Review & Publish */}
        {isComplete() && (
          <div className="w-full rounded-lg border border-green-500/30 bg-green-500/5 p-6 text-center space-y-3">
            <h3 className="font-semibold">Ready to Publish!</h3>
            <p className="text-sm text-muted-foreground">
              All steps completed. Review your campaign and publish when ready.
            </p>
            <Button 
              onClick={handlePublish}
              disabled={!allStepsComplete}
              size="lg" 
              className="w-full gap-2 bg-[#4B73FF] hover:bg-[#3d5fd9] disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {isPublished ? 'Unpublish Campaign' : 'Publish Campaign'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )

  const steps = [
    {
      id: "ads",
      number: 1,
      title: "Ad Creative",
      description: "Select your ad creative design",
      completed: selectedImageIndex !== null,
      content: adsContent,
      icon: Palette,
    },
    {
      id: "copy",
      number: 2,
      title: "Ad Copy",
      description: "Choose your ad copy with headline and description",
      completed: adCopyState.status === "completed",
      content: <AdCopySelectionCanvas />,
      icon: Type,
    },
    {
      id: "location",
      number: 3,
      title: "Target Location",
      description: "Choose where you want your ads to be shown",
      completed: locationState.status === "completed",
      content: <LocationSelectionCanvas />,
      icon: MapPin,
    },
    {
      id: "audience",
      number: 4,
      title: "Define Audience",
      description: "Select who should see your ads",
      completed: audienceState.status === "completed",
      content: <AudienceSelectionCanvas />,
      icon: Target,
    },
    {
      id: "meta-connect",
      number: 5,
      title: "Connect Facebook & Instagram",
      description: "Authenticate and select Page, IG (optional) and Ad Account",
      completed: (budgetState as unknown as { meta_connect_data?: { status?: string } })?.meta_connect_data?.status === 'completed',
      content: <MetaConnectStep />,
      icon: Facebook,
    },
    {
      id: "goal",
      number: 6,
      title: "Set Your Goal",
      description: "Choose what you want to achieve with your ads",
      completed: goalState.status === "completed",
      content: <GoalSelectionCanvas />,
      icon: Flag,
    },
    {
      id: "budget",
      number: 7,
      title: "Budget & Publish",
      description: "Set your budget, connect Facebook, and launch your campaign",
      completed: isComplete(),
      content: budgetPublishContent,
      icon: Rocket,
    },
  ]

  return (
    <div className="flex h-full flex-col relative">
      <div className="flex-1 overflow-hidden bg-muted border border-border rounded-tl-lg">
        <CampaignStepper steps={steps} />
      </div>
    </div>
  )
}
