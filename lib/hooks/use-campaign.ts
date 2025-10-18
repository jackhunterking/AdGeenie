import { useState, useEffect, useCallback } from 'react'

interface Campaign {
  id: string
  user_id: string
  name: string
  status: string
  current_step: number
  total_steps: number
  metadata: any
  created_at: string
  updated_at: string
  campaign_states?: CampaignState[]
}

interface CampaignState {
  id: string
  campaign_id: string
  goal_data: any
  location_data: any
  audience_data: any
  ad_copy_data: any
  ad_preview_data: any
  budget_data: any
  updated_at: string
}

export function useCampaign() {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load or create campaign on mount
  useEffect(() => {
    loadActiveCampaign()
  }, [])

  const loadActiveCampaign = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch user's campaigns
      const response = await fetch('/api/campaigns')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch campaigns')
      }

      let activeCampaign = data.campaigns?.find(
        (c: Campaign) => c.status === 'draft'
      )

      // If no draft campaign exists, create one
      if (!activeCampaign) {
        const createResponse = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'My Campaign' }),
        })

        const createData = await createResponse.json()

        if (!createResponse.ok) {
          throw new Error(createData.error || 'Failed to create campaign')
        }

        activeCampaign = createData.campaign
      }

      setCampaign(activeCampaign)
    } catch (err) {
      console.error('Error loading campaign:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Save specific field of campaign state
  const saveCampaignState = useCallback(
    async (field: string, value: any) => {
      if (!campaign?.id) {
        console.warn('No active campaign to save state to')
        return
      }

      try {
        const response = await fetch(`/api/campaigns/${campaign.id}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save campaign state')
        }

        console.log(`✅ Saved ${field} to campaign ${campaign.id}`)
      } catch (err) {
        console.error(`Error saving ${field}:`, err)
        setError(err instanceof Error ? err.message : 'Failed to save')
      }
    },
    [campaign?.id]
  )

  // Update campaign metadata (name, step, etc.)
  const updateCampaign = useCallback(
    async (updates: Partial<Campaign>) => {
      if (!campaign?.id) return

      try {
        const response = await fetch(`/api/campaigns/${campaign.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update campaign')
        }

        setCampaign(data.campaign)
      } catch (err) {
        console.error('Error updating campaign:', err)
        setError(err instanceof Error ? err.message : 'Failed to update')
      }
    },
    [campaign?.id]
  )

  return {
    campaign,
    loading,
    error,
    saveCampaignState,
    updateCampaign,
    reloadCampaign: loadActiveCampaign,
  }
}

