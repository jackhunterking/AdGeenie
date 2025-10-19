"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useCampaign } from "@/lib/hooks/use-campaign"
import { useDebounce } from "@/lib/hooks/use-debounce"

interface AdContent {
  imageUrl?: string // Legacy single image support
  imageVariations?: string[] // Array of 6 variation URLs
  baseImageUrl?: string // Original base image
  headline: string
  body: string
  cta: string
}

interface CreativeVariation {
  gradient: string
  title: string
}

interface AdPreviewContextType {
  adContent: AdContent | null
  setAdContent: (content: AdContent | null) => void
  isPublished: boolean
  setIsPublished: (published: boolean) => void
  selectedCreativeVariation: CreativeVariation | null
  setSelectedCreativeVariation: (variation: CreativeVariation | null) => void
  loadingVariations: boolean[]
  generateImageVariations: (baseImageUrl: string, campaignId?: string) => Promise<void>
}

const AdPreviewContext = createContext<AdPreviewContextType | undefined>(undefined)

export function AdPreviewProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaign()
  const [adContent, setAdContent] = useState<AdContent | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [selectedCreativeVariation, setSelectedCreativeVariation] = useState<CreativeVariation | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [loadingVariations, setLoadingVariations] = useState<boolean[]>([false, false, false, false, false, false])

  // Combine all state for saving
  const adPreviewState = { adContent, isPublished, selectedCreativeVariation }

  // Load initial state from campaign
  useEffect(() => {
    if (campaign?.campaign_states?.[0]?.ad_preview_data && !isInitialized) {
      const savedData = campaign.campaign_states[0].ad_preview_data as unknown as {
        adContent?: AdContent | null;
        isPublished?: boolean;
        selectedCreativeVariation?: CreativeVariation | null;
      }
      if (savedData.adContent) setAdContent(savedData.adContent)
      if (savedData.isPublished !== undefined) setIsPublished(savedData.isPublished)
      if (savedData.selectedCreativeVariation) setSelectedCreativeVariation(savedData.selectedCreativeVariation)
      setIsInitialized(true)
    }
  }, [campaign, isInitialized])

  // Debounced auto-save
  const debouncedAdPreviewState = useDebounce(adPreviewState, 1000)

  useEffect(() => {
    if (isInitialized && campaign?.id) {
      saveCampaignState('ad_preview_data', debouncedAdPreviewState)
    }
  }, [debouncedAdPreviewState, saveCampaignState, campaign?.id, isInitialized])

  // Function to generate image variations from base image
  const generateImageVariations = async (baseImageUrl: string, campaignId?: string) => {
    try {
      console.log('🎨 Starting variation generation...')
      
      // Set all variations as loading
      setLoadingVariations([true, true, true, true, true, true])
      
      // Update ad content with base image immediately
      setAdContent(prev => ({
        ...prev,
        headline: prev?.headline || '',
        body: prev?.body || '',
        cta: prev?.cta || 'Learn More',
        baseImageUrl,
        imageVariations: undefined, // Clear old variations
      }))

      // Call the variations API
      const response = await fetch('/api/images/variations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseImageUrl,
          campaignId: campaignId || campaign?.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate variations')
      }

      const data = await response.json()
      
      if (data.success && data.variations) {
        console.log(`✅ Received ${data.variations.length} variations`)
        
        // Update ad content with all variations
        setAdContent(prev => ({
          ...prev,
          headline: prev?.headline || '',
          body: prev?.body || '',
          cta: prev?.cta || 'Learn More',
          baseImageUrl,
          imageVariations: data.variations,
        }))
        
        // Mark all variations as loaded
        setLoadingVariations([false, false, false, false, false, false])
        
        // Switch to ad copy canvas
        window.dispatchEvent(new CustomEvent('switchToTab', { detail: 'copy' }))
      }
    } catch (error) {
      console.error('Error generating variations:', error)
      // Mark all as not loading on error
      setLoadingVariations([false, false, false, false, false, false])
    }
  }

  return (
    <AdPreviewContext.Provider value={{ 
      adContent, 
      setAdContent, 
      isPublished, 
      setIsPublished,
      selectedCreativeVariation,
      setSelectedCreativeVariation,
      loadingVariations,
      generateImageVariations
    }}>
      {children}
    </AdPreviewContext.Provider>
  )
}

export function useAdPreview() {
  const context = useContext(AdPreviewContext)
  if (context === undefined) {
    throw new Error("useAdPreview must be used within an AdPreviewProvider")
  }
  return context
}
