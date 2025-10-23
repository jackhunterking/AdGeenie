/**
 * Feature: Conversation Summarization
 * Purpose: Generate summaries for long conversations to reduce token usage
 * References:
 *  - AI SDK Core: https://ai-sdk.dev/docs/ai-sdk-core/generating-text
 */

import { generateText } from 'ai';
import { messageStore } from '../services/message-store';
import { conversationManager } from '../services/conversation-manager';
// UIMessage is not used here; keep imports minimal

// Configuration
const SUMMARIZATION_THRESHOLD = 100; // Summarize every 100 messages
const SUMMARIZATION_MODEL = 'openai/gpt-4o-mini'; // Fast, cheap model for summaries
const MAX_MESSAGES_TO_SUMMARIZE = 100; // Don't summarize more than this at once

/**
 * Check if conversation needs summarization
 */
export async function shouldSummarize(conversationId: string): Promise<boolean> {
  try {
    const count = await messageStore.getMessageCount(conversationId);
    const conversation = await conversationManager.getConversation(conversationId);
    
    if (!conversation) {
      return false;
    }

    // Get last summarization point
    const _lastSummaryAt = (conversation.metadata as { summary_message_count?: number } | null | undefined)?.summary_message_count || 0;
    
    // Summarize if we've passed the threshold since last summary
    return count - _lastSummaryAt >= SUMMARIZATION_THRESHOLD;
  } catch (error) {
    console.error('[Summarization] Error checking if should summarize:', error);
    return false;
  }
}

/**
 * Generate a summary of conversation messages
 */
export async function generateSummary(conversationId: string): Promise<string | null> {
  try {
    // Get conversation to check existing summary
    const conversation = await conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get last summary point
    const _lastSummaryAt2 = (conversation.metadata as { summary_message_count?: number } | null | undefined)?.summary_message_count || 0;
    const _currentCount = await messageStore.getMessageCount(conversationId);

    // Load messages since last summary (or all if first summary)
    const messages = await messageStore.loadMessages(conversationId, {
      limit: MAX_MESSAGES_TO_SUMMARIZE,
    });

    if (messages.length === 0) {
      return null;
    }

    // Build conversation text for summarization
    const conversationText = messages
      .map(msg => {
        const role = msg.role.toUpperCase();
        const textParts = (msg.parts as Array<{ type: string; text?: string }>)
          ?.filter(p => p.type === 'text')
          .map(p => p.text || '')
          .join(' ');
        return `${role}: ${textParts || '[No text]'}`;
      })
      .join('\n\n');

    // Get existing summary if any
    const existingSummary = (conversation.metadata as { summary?: string } | null | undefined)?.summary || '';

    // Build prompt
    const prompt = existingSummary
      ? `You are summarizing an ongoing conversation about creating Meta ads campaigns.

PREVIOUS SUMMARY:
${existingSummary}

RECENT CONVERSATION (${messages.length} messages):
${conversationText}

Generate an updated 2-3 paragraph summary that:
1. Maintains key context from previous summary
2. Incorporates new developments from recent messages
3. Highlights campaign progress (goals set, locations configured, images generated, etc.)
4. Focuses on actionable information and decisions made

Summary:`
      : `You are summarizing a conversation about creating Meta ads campaigns.

CONVERSATION (${messages.length} messages):
${conversationText}

Generate a concise 2-3 paragraph summary that:
1. Captures the campaign's purpose and goals
2. Notes key decisions made (target audience, locations, creative direction)
3. Tracks progress through the campaign setup wizard
4. Focuses on actionable information

Summary:`;

    console.log(`[Summarization] Generating summary for ${messages.length} messages...`);

    // Generate summary using AI SDK
    // AI SDK automatically routes through AI Gateway when AI_GATEWAY_API_KEY is set
    const result = await generateText({
      model: SUMMARIZATION_MODEL, // Pass model string directly - AI SDK handles gateway routing
      prompt,
      temperature: 0.3, // Low temperature for factual summaries
    });

    const summary = result.text.trim();

    console.log(`[Summarization] Generated ${summary.length} character summary`);

    return summary;
  } catch (error) {
    console.error('[Summarization] Error generating summary:', error);
    return null;
  }
}

/**
 * Summarize and store for a conversation
 * Call this periodically or after significant message count increases
 */
export async function summarizeConversation(conversationId: string): Promise<void> {
  try {
    const summary = await generateSummary(conversationId);
    
    if (!summary) {
      console.warn(`[Summarization] No summary generated for conversation ${conversationId}`);
      return;
    }

    // Store summary in conversation metadata
    const currentCount = await messageStore.getMessageCount(conversationId);
    
    await conversationManager.updateMetadata(conversationId, {
      summary,
      summary_updated_at: new Date().toISOString(),
      summary_message_count: currentCount,
    });

    console.log(`[Summarization] ✅ Stored summary for conversation ${conversationId} (${currentCount} messages)`);
  } catch (error) {
    console.error('[Summarization] Error in summarizeConversation:', error);
    throw error;
  }
}

/**
 * Check and auto-summarize if threshold reached
 * Non-blocking - errors are logged but don't affect main flow
 */
export async function autoSummarizeIfNeeded(conversationId: string): Promise<void> {
  try {
    const needsSummary = await shouldSummarize(conversationId);
    
    if (needsSummary) {
      console.log(`[Summarization] Auto-summarizing conversation ${conversationId}`);
      
      // Run summarization in background (don't block)
      summarizeConversation(conversationId).catch(error => {
        console.error('[Summarization] Background summarization failed:', error);
      });
    }
  } catch (error) {
    console.error('[Summarization] Error in autoSummarizeIfNeeded:', error);
    // Don't throw - summarization failures shouldn't break the app
  }
}

/**
 * Get summary for displaying to users
 */
export async function getConversationSummary(conversationId: string): Promise<string | null> {
  try {
    const conversation = await conversationManager.getConversation(conversationId);
    const metadata = conversation?.metadata;
    if (metadata && typeof metadata === 'object' && 'summary' in metadata) {
      return (metadata.summary as string) || null;
    }
    return null;
  } catch (error) {
    console.error('[Summarization] Error getting summary:', error);
    return null;
  }
}

