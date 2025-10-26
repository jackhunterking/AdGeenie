"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/components/auth/auth-provider'

interface CampaignState {
  goal_data?: Record<string, unknown> | null
  location_data?: Record<string, unknown> | null
  audience_data?: Record<string, unknown> | null
  budget_data?: Record<string, unknown> | null
  ad_copy_data?: Record<string, unknown> | null
  ad_preview_data?: Record<string, unknown> | null
  meta_connect_data?: Record<string, unknown> | null
}

interface Campaign {
  id: string
  user_id: string
  name: string
  status: string
  current_step: number
  total_steps: number
  metadata: { initialPrompt?: string } | null
  campaign_states?: CampaignState  // 1-to-1 relationship (object, not array)
  created_at: string
  updated_at: string
  conversationId?: string // Link to AI SDK conversation
}

interface CampaignContextType {
  campaign: Campaign | null
  loading: boolean
  error: string | null
  createCampaign: (name: string, prompt?: string, goal?: string) => Promise<Campaign | null>
  loadCampaign: (id: string) => Promise<void>
  updateCampaign: (updates: Partial<Campaign>) => Promise<void>
  saveCampaignState: (field: string, value: Record<string, unknown> | null, options?: { retries?: number; silent?: boolean }) => Promise<boolean>
  clearCampaign: () => void
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined)

export function CampaignProvider({ 
  children, 
  initialCampaignId 
}: { 
  children: ReactNode
  initialCampaignId?: string 
}) {
  const { user } = useAuth()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load campaign by ID (for campaign pages)
  const loadCampaign = async (id: string) => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/campaigns/${id}`)
      if (response.ok) {
        const data = await response.json()
        const campaign = data.campaign
        
        console.log(`[CampaignContext] Raw campaign data:`, {
          id: campaign.id,
          name: campaign.name,
          hasStates: !!campaign.campaign_states,
          statesType: typeof campaign.campaign_states,
          statesKeys: campaign.campaign_states ? Object.keys(campaign.campaign_states) : [],
          fullStatesStructure: JSON.stringify(campaign.campaign_states, null, 2)
        });
        
        if (campaign.campaign_states && typeof campaign.campaign_states === 'object') {
          console.log(`[CampaignContext] ✅ campaign_states exists as object:`, campaign.campaign_states);
        } else {
          console.warn(`[CampaignContext] ⚠️ campaign_states is NULL or wrong type!`, campaign.campaign_states);
        }
        
        // Fetch linked conversation (AI SDK pattern)
        try {
          const convResponse = await fetch(`/api/campaigns/${id}/conversation`)
          if (convResponse.ok) {
            const convData = await convResponse.json()
            campaign.conversationId = convData.conversation.id
            console.log(`[CampaignContext] Loaded conversation ${campaign.conversationId} for campaign ${id}`)
          }
        } catch (convError) {
          console.warn('[CampaignContext] Failed to load conversation:', convError)
          // Continue without conversation ID - will be created on first message
        }
        
        setCampaign(campaign)
      } else if (response.status === 401) {
        // User not authenticated
        setCampaign(null)
      } else {
        throw new Error('Failed to load campaign')
      }
    } catch (err) {
      console.error('Error loading campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // Create campaign with optional prompt and goal
  const createCampaign = async (name: string, prompt?: string, goal?: string) => {
    if (!user) return null
    
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prompt, goalType: goal }),
      })
      
      if (response.ok) {
        const data = await response.json()
        const campaign = data.campaign
        
        // Fetch linked conversation (AI SDK pattern)
        try {
          const convResponse = await fetch(`/api/campaigns/${campaign.id}/conversation`)
          if (convResponse.ok) {
            const convData = await convResponse.json()
            campaign.conversationId = convData.conversation.id
            console.log(`[CampaignContext] Created conversation ${campaign.conversationId} for campaign ${campaign.id}`)
          }
        } catch (convError) {
          console.warn('[CampaignContext] Failed to fetch conversation:', convError)
          // Continue without conversation ID - will be created on first message
        }
        
        setCampaign(campaign)
        return campaign
      }
      throw new Error('Failed to create campaign')
    } catch (err) {
      console.error('Error creating campaign:', err)
      setError(err instanceof Error ? err.message : 'Failed to create')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Update campaign metadata
  const updateCampaign = async (updates: Partial<Campaign>) => {
    if (!campaign?.id) return
    const response = await fetch(`/api/campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || `HTTP ${response.status}`)
    }
    const data = await response.json()
    setCampaign(data.campaign)
  }

  // Save campaign state (goal, location, audience, etc.) with retry logic
  const saveCampaignState = async (
    field: string, 
    value: Record<string, unknown> | null,
    options: { retries?: number; silent?: boolean } = {}
  ): Promise<boolean> => {
    const { retries = 3, silent = false } = options
    
    if (!campaign?.id) {
      console.warn('No active campaign to save state to')
      return false
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Log what we're saving
        if (field === 'ad_preview_data') {
          console.log(`[CampaignContext] 💾 Saving ${field}:`, {
            campaignId: campaign.id,
            hasImageVariations: Boolean((value as { adContent?: { imageVariations?: unknown[] } })?.adContent?.imageVariations?.length),
            imageCount: ((value as { adContent?: { imageVariations?: unknown[] } })?.adContent?.imageVariations?.length) || 0,
            attempt: attempt,
          })
        }
        
        const response = await fetch(`/api/campaigns/${campaign.id}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        console.log(`[CampaignContext] ✅ Saved ${field} to campaign ${campaign.id}`)
        return true

      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Save failed')
        console.error(`❌ Save attempt ${attempt}/${retries} failed for ${field}:`, lastError)

        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // All retries failed
    if (!silent) {
      console.error(`💥 Failed to save ${field} after ${retries} attempts`)
    }
    
    return false
  }

  // Clear campaign (for logout, etc.)
  const clearCampaign = () => {
    setCampaign(null)
    setError(null)
  }

  // Load initial campaign if ID provided
  useEffect(() => {
    if (initialCampaignId && user) {
      loadCampaign(initialCampaignId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCampaignId, user])

  // Clear campaign when user logs out
  useEffect(() => {
    if (!user) {
      clearCampaign()
    }
  }, [user])

  return (
    <CampaignContext.Provider value={{
      campaign,
      loading,
      error,
      createCampaign,
      loadCampaign,
      updateCampaign,
      saveCampaignState,
      clearCampaign,
    }}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaignContext() {
  const context = useContext(CampaignContext)
  if (!context) {
    throw new Error('useCampaignContext must be used within CampaignProvider')
  }
  return context
}

