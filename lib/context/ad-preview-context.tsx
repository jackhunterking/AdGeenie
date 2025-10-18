"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useCampaign } from "@/lib/hooks/use-campaign"
import { useDebounce } from "@/lib/hooks/use-debounce"

interface AdContent {
  imageUrl: string
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
}

const AdPreviewContext = createContext<AdPreviewContextType | undefined>(undefined)

export function AdPreviewProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaign()
  const [adContent, setAdContent] = useState<AdContent | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [selectedCreativeVariation, setSelectedCreativeVariation] = useState<CreativeVariation | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Combine all state for saving
  const adPreviewState = { adContent, isPublished, selectedCreativeVariation }

  // Load initial state from campaign
  useEffect(() => {
    if (campaign?.campaign_states?.[0]?.ad_preview_data && !isInitialized) {
      const savedData = campaign.campaign_states[0].ad_preview_data
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

  return (
    <AdPreviewContext.Provider value={{ 
      adContent, 
      setAdContent, 
      isPublished, 
      setIsPublished,
      selectedCreativeVariation,
      setSelectedCreativeVariation
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
