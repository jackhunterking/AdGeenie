/**
 * Feature: State Manager Service
 * Purpose: Campaign state operations with snapshot/restore support
 * References:
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { supabaseServer } from '@/lib/supabase/server';

// ============================================
// Types
// ============================================

export interface CampaignState {
  id: string;
  campaign_id: string | null;
  goal_data: any | null;
  location_data: any | null;
  audience_data: any | null;
  ad_copy_data: any | null;
  ad_preview_data: any | null;
  budget_data: any | null;
  generated_images: any | null;
  updated_at: string | null;
}

// Snapshot interfaces removed - feature not implemented

type StateField = 
  | 'goal_data'
  | 'location_data'
  | 'audience_data'
  | 'ad_copy_data'
  | 'ad_preview_data'
  | 'budget_data'
  | 'generated_images';

// ============================================
// State Manager Service
// ============================================

export const stateManager = {
  /**
   * Get campaign state
   * Returns null if state doesn't exist
   */
  async getCampaignState(campaignId: string): Promise<CampaignState | null> {
    try {
      const { data, error } = await supabaseServer
        .from('campaign_states')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('[StateManager] Get state error:', error);
        throw new Error(`Failed to get campaign state: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[StateManager] Get state exception:', error);
      return null;
    }
  },

  /**
   * Initialize campaign state
   * Creates empty state for a new campaign
   */
  async initializeCampaignState(campaignId: string): Promise<CampaignState> {
    try {
      const { data, error } = await supabaseServer
        .from('campaign_states')
        .insert({
          campaign_id: campaignId,
          goal_data: null,
          location_data: null,
          audience_data: null,
          ad_copy_data: null,
          ad_preview_data: null,
          budget_data: null,
          generated_images: null,
        })
        .select()
        .single();

      if (error) {
        console.error('[StateManager] Initialize error:', error);
        throw new Error(`Failed to initialize campaign state: ${error.message}`);
      }

      console.log(`[StateManager] Initialized state for campaign ${campaignId}`);

      return data;
    } catch (error) {
      console.error('[StateManager] Initialize exception:', error);
      throw error;
    }
  },

  /**
   * Update a specific state field
   * Atomic partial update
   */
  async updateState(
    campaignId: string,
    field: StateField,
    data: any
  ): Promise<void> {
    try {
      const updateData: any = {
        [field]: data,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseServer
        .from('campaign_states')
        .update(updateData)
        .eq('campaign_id', campaignId);

      if (error) {
        console.error('[StateManager] Update state error:', error);
        throw new Error(`Failed to update ${field}: ${error.message}`);
      }

      console.log(`[StateManager] Updated ${field} for campaign ${campaignId}`);
    } catch (error) {
      console.error('[StateManager] Update state exception:', error);
      throw error;
    }
  },

  /**
   * Update multiple state fields at once
   * Atomic batch update
   */
  async updateMultipleFields(
    campaignId: string,
    updates: Partial<Record<StateField, any>>
  ): Promise<void> {
    try {
      if (Object.keys(updates).length === 0) {
        console.warn('[StateManager] No fields to update');
        return;
      }

      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseServer
        .from('campaign_states')
        .update(updateData)
        .eq('campaign_id', campaignId);

      if (error) {
        console.error('[StateManager] Batch update error:', error);
        throw new Error(`Failed to update fields: ${error.message}`);
      }

      console.log(`[StateManager] Updated ${Object.keys(updates).length} fields for campaign ${campaignId}`);
    } catch (error) {
      console.error('[StateManager] Batch update exception:', error);
      throw error;
    }
  },

  /**
   * Get or initialize campaign state
   * Ensures state always exists
   */
  async getOrInitializeState(campaignId: string): Promise<CampaignState> {
    try {
      const existing = await this.getCampaignState(campaignId);
      if (existing) {
        return existing;
      }

      return await this.initializeCampaignState(campaignId);
    } catch (error) {
      console.error('[StateManager] Get or initialize exception:', error);
      throw error;
    }
  },

  // Snapshot functionality removed - campaign_snapshots table was deleted
  // Feature was never implemented (0 rows)

  /**
   * Clear all state for a campaign
   * Resets to empty state
   */
  async clearCampaignState(campaignId: string): Promise<void> {
    try {
      const { error } = await supabaseServer
        .from('campaign_states')
        .update({
          goal_data: null,
          location_data: null,
          audience_data: null,
          ad_copy_data: null,
          ad_preview_data: null,
          budget_data: null,
          generated_images: null,
          updated_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaignId);

      if (error) {
        console.error('[StateManager] Clear state error:', error);
        throw new Error(`Failed to clear campaign state: ${error.message}`);
      }

      console.log(`[StateManager] Cleared state for campaign ${campaignId}`);
    } catch (error) {
      console.error('[StateManager] Clear state exception:', error);
      throw error;
    }
  },
};

