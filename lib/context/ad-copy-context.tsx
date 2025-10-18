"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useCampaign } from "@/lib/hooks/use-campaign"
import { useDebounce } from "@/lib/hooks/use-debounce"

interface AdCopyVariation {
  id: string
  primaryText: string
  description: string
  headline: string
}

interface AdCopyState {
  selectedCopyIndex: number | null
  status: "idle" | "completed"
}

interface AdCopyContextType {
  adCopyState: AdCopyState
  setSelectedCopyIndex: (index: number | null) => void
  isComplete: () => boolean
}

const AdCopyContext = createContext<AdCopyContextType | undefined>(undefined)

export function AdCopyProvider({ children }: { children: ReactNode }) {
  const { campaign, saveCampaignState } = useCampaign()
  const [adCopyState, setAdCopyState] = useState<AdCopyState>({
    selectedCopyIndex: null,
    status: "idle",
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Load initial state from campaign
  useEffect(() => {
    if (campaign?.campaign_states?.[0]?.ad_copy_data && !isInitialized) {
      const savedData = campaign.campaign_states[0].ad_copy_data
      setAdCopyState(savedData)
      setIsInitialized(true)
    }
  }, [campaign, isInitialized])

  // Debounced auto-save
  const debouncedAdCopyState = useDebounce(adCopyState, 1000)

  useEffect(() => {
    if (isInitialized && campaign?.id) {
      saveCampaignState('ad_copy_data', debouncedAdCopyState)
    }
  }, [debouncedAdCopyState, saveCampaignState, campaign?.id, isInitialized])

  const setSelectedCopyIndex = (index: number | null) => {
    setAdCopyState({
      selectedCopyIndex: index,
      status: index !== null ? "completed" : "idle",
    })
  }

  const isComplete = () => adCopyState.status === "completed"

  return (
    <AdCopyContext.Provider value={{ adCopyState, setSelectedCopyIndex, isComplete }}>
      {children}
    </AdCopyContext.Provider>
  )
}

export function useAdCopy() {
  const context = useContext(AdCopyContext)
  if (context === undefined) {
    throw new Error("useAdCopy must be used within an AdCopyProvider")
  }
  return context
}

// Mock ad copy variations
export const adCopyVariations: AdCopyVariation[] = [
  {
    id: "copy_1",
    primaryText: "Transform your business with cutting-edge solutions designed for growth. Join thousands of successful companies already seeing results.",
    description: "Limited time offer - Get 30% off your first month",
    headline: "Grow Your Business Today"
  },
  {
    id: "copy_2",
    primaryText: "Discover the power of innovation. Our proven approach helps you reach your goals faster and more efficiently than ever before.",
    description: "Start your free trial - No credit card required",
    headline: "Innovation Meets Results"
  },
  {
    id: "copy_3",
    primaryText: "Join the revolution. Experience the difference that quality and expertise can make in your journey to success.",
    description: "Special offer for new customers - Act now",
    headline: "Your Success Starts Here"
  },
  {
    id: "copy_4",
    primaryText: "Elevate your performance with tools trusted by industry leaders. See why top companies choose us for their growth.",
    description: "Book a demo today and get exclusive access",
    headline: "Trusted by Industry Leaders"
  },
  {
    id: "copy_5",
    primaryText: "Unlock your potential with solutions that deliver real, measurable results. Stop settling for less and start achieving more.",
    description: "Join now and receive a special welcome bonus",
    headline: "Unlock Your Potential"
  },
  {
    id: "copy_6",
    primaryText: "Experience excellence like never before. Our comprehensive approach ensures you get the results you deserve, every time.",
    description: "Limited spots available - Reserve yours today",
    headline: "Excellence Delivered"
  }
]


