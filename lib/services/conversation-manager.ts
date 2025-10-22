/**
 * Feature: Conversation Manager Service
 * Purpose: Manage conversation lifecycle and metadata
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/conversation-history
 *  - Supabase: https://supabase.com/docs/guides/database
 */

import { supabaseServer } from '@/lib/supabase/server';
import { messageStore } from './message-store';

// ============================================
// Types
// ============================================

export interface Conversation {
  id: string;
  campaign_id: string | null;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
  metadata: Record<string, any>;
}

interface CreateConversationOptions {
  title?: string;
  metadata?: Record<string, any>;
}

interface ListConversationsOptions {
  limit?: number;
  offset?: number;
  campaignId?: string;
}

// ============================================
// Conversation Manager Service
// ============================================

export const conversationManager = {
  /**
   * Create a new conversation
   * Optionally link to a campaign
   */
  async createConversation(
    userId: string,
    campaignId: string | null = null,
    options: CreateConversationOptions = {}
  ): Promise<Conversation> {
    try {
      const { title, metadata = {} } = options;

      const { data, error } = await supabaseServer
        .from('conversations')
        .insert({
          user_id: userId,
          campaign_id: campaignId,
          title: title || null,
          metadata,
          message_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[ConversationManager] Create error:', error);
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      console.log(`[ConversationManager] Created conversation ${data.id}${campaignId ? ` for campaign ${campaignId}` : ''}`);

      return data;
    } catch (error) {
      console.error('[ConversationManager] Create exception:', error);
      throw error;
    }
  },

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabaseServer
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('[ConversationManager] Get error:', error);
        throw new Error(`Failed to get conversation: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[ConversationManager] Get exception:', error);
      return null;
    }
  },

  /**
   * Get conversation by campaign ID
   * Returns the most recent conversation for a campaign
   */
  async getConversationByCampaignId(campaignId: string): Promise<Conversation | null> {
    try {
      const { data, error } = await supabaseServer
        .from('conversations')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        console.error('[ConversationManager] Get by campaign error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[ConversationManager] Get by campaign exception:', error);
      return null;
    }
  },

  /**
   * List conversations for a user
   */
  async listConversations(
    userId: string,
    options: ListConversationsOptions = {}
  ): Promise<Conversation[]> {
    try {
      const { limit = 50, offset = 0, campaignId } = options;

      let query = supabaseServer
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ConversationManager] List error:', error);
        throw new Error(`Failed to list conversations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[ConversationManager] List exception:', error);
      return [];
    }
  },

  /**
   * Update conversation title
   * Auto-generates from first message if not provided
   */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    try {
      const { error } = await supabaseServer
        .from('conversations')
        .update({ 
          title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('[ConversationManager] Update title error:', error);
        throw new Error(`Failed to update title: ${error.message}`);
      }

      console.log(`[ConversationManager] Updated title for conversation ${conversationId}`);
    } catch (error) {
      console.error('[ConversationManager] Update title exception:', error);
      throw error;
    }
  },

  /**
   * Auto-generate conversation title from first user message
   */
  async autoGenerateTitle(conversationId: string): Promise<void> {
    try {
      // Get first user message
      const { data } = await supabaseServer
        .from('messages')
        .select('content')
        .eq('conversation_id', conversationId)
        .eq('role', 'user')
        .order('seq', { ascending: true })
        .limit(1)
        .single();

      if (data?.content) {
        // Take first 50 chars of content as title
        const title = data.content.substring(0, 50).trim() + (data.content.length > 50 ? '...' : '');
        await this.updateTitle(conversationId, title);
      }
    } catch (error) {
      console.error('[ConversationManager] Auto-generate title exception:', error);
      // Don't throw - title generation is non-critical
    }
  },

  /**
   * Update conversation metadata
   */
  async updateMetadata(
    conversationId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // Get existing metadata
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Merge with existing metadata
      const updatedMetadata = {
        ...conversation.metadata,
        ...metadata,
      };

      const { error } = await supabaseServer
        .from('conversations')
        .update({ 
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('[ConversationManager] Update metadata error:', error);
        throw new Error(`Failed to update metadata: ${error.message}`);
      }

      console.log(`[ConversationManager] Updated metadata for conversation ${conversationId}`);
    } catch (error) {
      console.error('[ConversationManager] Update metadata exception:', error);
      throw error;
    }
  },

  /**
   * Store a summary in conversation metadata
   * Useful for long conversations to reduce token usage
   */
  async storeSummary(conversationId: string, summary: string): Promise<void> {
    try {
      await this.updateMetadata(conversationId, {
        summary,
        summary_updated_at: new Date().toISOString(),
      });

      console.log(`[ConversationManager] Stored summary for conversation ${conversationId}`);
    } catch (error) {
      console.error('[ConversationManager] Store summary exception:', error);
      throw error;
    }
  },

  /**
   * Archive a conversation (soft delete)
   * Sets archived flag in metadata
   */
  async archiveConversation(conversationId: string): Promise<void> {
    try {
      await this.updateMetadata(conversationId, {
        archived: true,
        archived_at: new Date().toISOString(),
      });

      console.log(`[ConversationManager] Archived conversation ${conversationId}`);
    } catch (error) {
      console.error('[ConversationManager] Archive exception:', error);
      throw error;
    }
  },

  /**
   * Unarchive a conversation
   */
  async unarchiveConversation(conversationId: string): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const updatedMetadata = { ...conversation.metadata };
      delete updatedMetadata.archived;
      delete updatedMetadata.archived_at;

      const { error } = await supabaseServer
        .from('conversations')
        .update({ 
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (error) {
        console.error('[ConversationManager] Unarchive error:', error);
        throw new Error(`Failed to unarchive conversation: ${error.message}`);
      }

      console.log(`[ConversationManager] Unarchived conversation ${conversationId}`);
    } catch (error) {
      console.error('[ConversationManager] Unarchive exception:', error);
      throw error;
    }
  },

  /**
   * Delete a conversation and all its messages (hard delete)
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      // Messages will be cascade deleted by FK constraint
      const { error } = await supabaseServer
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        console.error('[ConversationManager] Delete error:', error);
        throw new Error(`Failed to delete conversation: ${error.message}`);
      }

      console.log(`[ConversationManager] Deleted conversation ${conversationId}`);
    } catch (error) {
      console.error('[ConversationManager] Delete exception:', error);
      throw error;
    }
  },

  /**
   * Get or create conversation for a campaign
   * Ensures each campaign has exactly one conversation
   */
  async getOrCreateForCampaign(
    userId: string,
    campaignId: string
  ): Promise<Conversation> {
    try {
      // Try to get existing conversation
      const existing = await this.getConversationByCampaignId(campaignId);
      if (existing) {
        return existing;
      }

      // Create new conversation
      return await this.createConversation(userId, campaignId, {
        title: 'New Campaign Chat',
      });
    } catch (error) {
      console.error('[ConversationManager] Get or create exception:', error);
      throw error;
    }
  },

  /**
   * Update conversation goal in metadata
   * Goal is stored at the conversation level for persistence across sessions
   */
  async updateConversationGoal(
    conversationId: string,
    goalType: string
  ): Promise<void> {
    try {
      await this.updateMetadata(conversationId, {
        current_goal: goalType,
        goal_updated_at: new Date().toISOString(),
      });

      console.log(`[ConversationManager] Updated goal to "${goalType}" for conversation ${conversationId}`);
    } catch (error) {
      console.error('[ConversationManager] Update goal exception:', error);
      throw error;
    }
  },

  /**
   * Inject a system message into the conversation
   * Used for goal changes and other system notifications
   * System messages inform the AI of context changes transparently
   */
  async injectSystemMessage(
    conversationId: string,
    systemText: string
  ): Promise<void> {
    try {
      // Generate unique ID for system message
      const systemMessageId = `sys-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Insert system message (seq is auto-incremented by database)
      const { error } = await supabaseServer
        .from('messages')
        .insert({
          id: systemMessageId,
          conversation_id: conversationId,
          role: 'system',
          content: systemText,
          parts: [{ type: 'text', text: systemText }],
          tool_invocations: [],
          metadata: {
            injected: true,
            injected_at: new Date().toISOString(),
          },
        });

      if (error) {
        console.error('[ConversationManager] Inject system message error:', error);
        throw new Error(`Failed to inject system message: ${error.message}`);
      }

      console.log(`[ConversationManager] Injected system message to conversation ${conversationId}`);
    } catch (error) {
      console.error('[ConversationManager] Inject system message exception:', error);
      throw error;
    }
  },
};

